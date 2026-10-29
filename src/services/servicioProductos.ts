import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import type { Categoria, ColorProducto, DatosProductoGenerales, Producto, VarianteProducto } from '@/types';
import { mapearProducto, type FilaProductoSupabase } from './mappers/mapearProducto';

const BUCKET_IMAGENES_PRODUCTO = 'productos';

const SELECT_PRODUCTO = `
  id, sku, nombre, categoria_id, precio, precio_anterior, descripcion, composicion,
  confeccion, origen, etiquetas, es_novedad, popularidad_30d, fecha_alta, activo,
  categorias ( id, nombre ),
  variantes_producto ( id, talla, color_id, stock, colores ( id, nombre, hex ) ),
  imagenes_producto ( id, url, orden )
`;

function requerirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

function generarIdProducto(nombre: string): string {
  const base = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return `${base || 'producto'}-${Date.now().toString(36)}`;
}

export interface VarianteRetirada {
  talla: string;
  colorId: string;
  colorNombre: string;
}

export interface ResultadoGuardarProducto {
  producto: Producto;
  /** Variantes quitadas en el formulario que tenían historial: quedaron con stock 0 en vez de borrarse. */
  variantesRetiradas: VarianteRetirada[];
}

export const PRODUCTOS_POR_PAGINA = 20;

export interface OpcionesPaginaCatalogo {
  /** 'todo' o undefined: sin filtro de categoría. */
  categoriaId?: string;
  busqueda?: string;
  precioMax?: number | null;
  tallas?: string[];
  colores?: string[];
  soloDisponibles?: boolean;
  orden?: 'novedad' | 'precio' | 'popularidad';
  /** Empieza en 1. */
  pagina?: number;
}

export interface PaginaCatalogo {
  productos: Producto[];
  hayMas: boolean;
  /** Total de productos que cumplen los filtros (para el contador de resultados). */
  total: number;
}

// El término va dentro de un filtro `or(...)` de PostgREST: se quitan los
// caracteres que rompen esa sintaxis o que ilike trata como comodines.
function limpiarTerminoBusqueda(termino: string): string {
  return termino.replace(/[%_,()"\\*]/g, ' ').trim();
}

async function obtenerProductoPorIdInterno(id: string): Promise<Producto | undefined> {
  const { data, error } = await requerirSupabase()
    .from('productos')
    .select(SELECT_PRODUCTO)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el producto "${id}": ${error.message}`);
  return data ? mapearProducto(data as unknown as FilaProductoSupabase) : undefined;
}

export const servicioProductos = {
  /** Catálogo público: solo productos activos. */
  async obtenerProductos(): Promise<Producto[]> {
    const { data, error } = await requerirSupabase()
      .from('productos')
      .select(SELECT_PRODUCTO)
      .eq('activo', true)
      .order('fecha_alta', { ascending: false });

    if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
    return (data ?? []).map((fila) => mapearProducto(fila as unknown as FilaProductoSupabase));
  },

  /** Panel admin: incluye los inactivos para poder volver a activarlos. */
  async obtenerProductosAdmin(): Promise<Producto[]> {
    const { data, error } = await requerirSupabase()
      .from('productos')
      .select(SELECT_PRODUCTO)
      .order('fecha_alta', { ascending: false })
      // fecha_alta es solo fecha: sin este desempate, los productos del mismo
      // día podían volver en otro orden después de editarlos.
      .order('id', { ascending: true });

    if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
    return (data ?? []).map((fila) => mapearProducto(fila as unknown as FilaProductoSupabase));
  },

  /**
   * Catálogo paginado en el servidor, de PRODUCTOS_POR_PAGINA en
   * PRODUCTOS_POR_PAGINA. Replica los filtros que antes hacía useCatalogo en
   * memoria: búsqueda por nombre o categoría, precio máximo, tallas y colores
   * con stock, y solo disponibles.
   */
  async obtenerPaginaCatalogo({
    categoriaId,
    busqueda = '',
    precioMax = null,
    tallas = [],
    colores = [],
    soloDisponibles = false,
    orden = 'novedad',
    pagina = 1,
  }: OpcionesPaginaCatalogo = {}): Promise<PaginaCatalogo> {
    const cliente = requerirSupabase();

    // Cada filtro por variantes usa su propio embed `!inner` con alias: así
    // filtra qué productos vuelven sin recortar `variantes_producto`, que
    // sigue trayendo todas las variantes del producto. Son embeds separados
    // porque, igual que antes, la talla y el color pueden cumplirse en
    // variantes distintas.
    const embedsFiltro: string[] = [];
    if (tallas.length > 0) embedsFiltro.push('filtro_talla:variantes_producto!inner(talla, stock)');
    if (colores.length > 0) embedsFiltro.push('filtro_color:variantes_producto!inner(color_id, stock)');
    if (soloDisponibles) embedsFiltro.push('filtro_stock:variantes_producto!inner(stock)');
    const select = [SELECT_PRODUCTO, ...embedsFiltro].join(',\n');

    let consulta = cliente
      .from('productos')
      .select(select, { count: 'exact' })
      .eq('activo', true);

    if (categoriaId && categoriaId !== 'todo') consulta = consulta.eq('categoria_id', categoriaId);
    if (precioMax != null) consulta = consulta.lte('precio', precioMax);
    if (tallas.length > 0) consulta = consulta.gt('filtro_talla.stock', 0).in('filtro_talla.talla', tallas);
    if (colores.length > 0) consulta = consulta.gt('filtro_color.stock', 0).in('filtro_color.color_id', colores);
    if (soloDisponibles) consulta = consulta.gt('filtro_stock.stock', 0);

    const termino = limpiarTerminoBusqueda(busqueda);
    if (termino) {
      // Antes la búsqueda también coincidía con el nombre de la categoría:
      // se buscan esas categorías primero y se combinan con un `or`.
      const { data: categoriasCoincidentes, error: errorCategorias } = await cliente
        .from('categorias')
        .select('id')
        .ilike('nombre', `%${termino}%`);
      if (errorCategorias) throw new Error(`No se pudo buscar en las categorías: ${errorCategorias.message}`);
      const ids = (categoriasCoincidentes ?? []).map((fila) => `"${(fila as { id: string }).id}"`);
      consulta =
        ids.length > 0
          ? consulta.or(`nombre.ilike.%${termino}%,categoria_id.in.(${ids.join(',')})`)
          : consulta.ilike('nombre', `%${termino}%`);
    }

    if (orden === 'precio') consulta = consulta.order('precio', { ascending: true });
    if (orden === 'popularidad') consulta = consulta.order('popularidad_30d', { ascending: false });
    // Desempate estable: sin él, productos empatados podían repetirse o
    // saltarse entre una página y la siguiente.
    consulta = consulta.order('fecha_alta', { ascending: false }).order('id', { ascending: true });

    const desde = (Math.max(1, pagina) - 1) * PRODUCTOS_POR_PAGINA;
    const { data, error, count } = await consulta.range(desde, desde + PRODUCTOS_POR_PAGINA - 1);
    if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);

    const productos = (data ?? []).map((fila) => mapearProducto(fila as unknown as FilaProductoSupabase));
    const total = count ?? desde + productos.length;
    return { productos, hayMas: desde + productos.length < total, total };
  },

  // Sin filtro de `activo` a propósito: carrito, favoritos y admin necesitan
  // leer también productos desactivados para marcarlos como no disponibles.
  async obtenerProductoPorId(id: string): Promise<Producto | undefined> {
    return obtenerProductoPorIdInterno(id);
  },

  async obtenerNovedades(limite = 4): Promise<Producto[]> {
    const { data, error } = await requerirSupabase()
      .from('productos')
      .select(SELECT_PRODUCTO)
      .eq('es_novedad', true)
      .eq('activo', true)
      .order('fecha_alta', { ascending: false })
      .limit(limite);

    if (error) throw new Error(`No se pudieron cargar las novedades: ${error.message}`);
    return (data ?? []).map((fila) => mapearProducto(fila as unknown as FilaProductoSupabase));
  },

  async obtenerCategorias(): Promise<Categoria[]> {
    const cliente = requerirSupabase();
    const [{ data: filasCategorias, error: errorCategorias }, { data: filasProductos, error: errorProductos }] =
      await Promise.all([
        cliente.from('categorias').select('id, nombre, subcategorias, imagen_url'),
        cliente.from('productos').select('categoria_id, activo').eq('activo', true),
      ]);

    if (errorCategorias) throw new Error(`No se pudieron cargar las categorías: ${errorCategorias.message}`);
    if (errorProductos) throw new Error(`No se pudo calcular el conteo por categoría: ${errorProductos.message}`);

    const conteos = new Map<string, number>();
    for (const fila of filasProductos ?? []) {
      const clave = (fila as { categoria_id: string }).categoria_id;
      conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
    }

    return (filasCategorias ?? []).map((fila) => {
      const tipada = fila as {
        id: string;
        nombre: string;
        subcategorias: string[] | null;
        imagen_url: string | null;
      };
      return {
        id: tipada.id,
        nombre: tipada.nombre,
        subcategorias: tipada.subcategorias ?? [],
        conteoArticulos: conteos.get(tipada.id) ?? 0,
        imagenUrl: tipada.imagen_url ?? undefined,
      };
    });
  },

  async obtenerCategoriaPorId(id: string): Promise<Categoria | undefined> {
    const categorias = await servicioProductos.obtenerCategorias();
    return categorias.find((categoria) => categoria.id === id);
  },

  async obtenerColores(): Promise<ColorProducto[]> {
    const { data, error } = await requerirSupabase().from('colores').select('id, nombre, hex');
    if (error) throw new Error(`No se pudieron cargar los colores: ${error.message}`);
    return (data ?? []) as ColorProducto[];
  },

  async subirImagen(uri: string, contentType = 'image/jpeg'): Promise<string> {
    const cliente = requerirSupabase();
    const extension = contentType.split('/')[1] ?? 'jpg';
    const ruta = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const archivo = new File(uri);
    const bytes = await archivo.arrayBuffer();

    const { error } = await cliente.storage.from(BUCKET_IMAGENES_PRODUCTO).upload(ruta, bytes, { contentType });
    if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);

    const { data } = cliente.storage.from(BUCKET_IMAGENES_PRODUCTO).getPublicUrl(ruta);
    return data.publicUrl;
  },

  /**
   * Crea o edita un producto completo (datos, variantes con stock e imágenes)
   * en una sola transacción, con la función SQL `guardar_producto`: si algo
   * falla, no queda nada a medias. Sin `idExistente` crea uno nuevo.
   */
  async guardarProducto(
    datos: DatosProductoGenerales & { variantes: VarianteProducto[]; imagenes: string[] },
    idExistente?: string,
  ): Promise<ResultadoGuardarProducto> {
    const cliente = requerirSupabase();
    const id = idExistente ?? generarIdProducto(datos.nombre);

    const { data, error } = await cliente.rpc('guardar_producto', {
      p_producto: {
        id,
        sku: datos.sku,
        nombre: datos.nombre,
        categoria_id: datos.categoriaId,
        precio: datos.precio,
        precio_anterior: datos.precioAnterior ?? null,
        descripcion: datos.descripcion,
        composicion: datos.composicion,
        confeccion: datos.confeccion,
        origen: datos.origen,
        etiquetas: datos.etiquetas,
        es_novedad: datos.esNovedad,
      },
      p_variantes: datos.variantes.map((v) => ({ talla: v.talla, color_id: v.colorId, stock: v.stock })),
      p_imagenes: datos.imagenes,
    });
    if (error) {
      if (error.code === '23505' && error.message.includes('sku')) {
        throw new Error(`Ya existe un producto con el SKU "${datos.sku}".`);
      }
      throw new Error(`No se pudo guardar el producto: ${error.message}`);
    }

    const respuesta = data as {
      id: string;
      variantes_retiradas: { talla: string; color_id: string; color_nombre: string }[] | null;
    };
    const producto = await obtenerProductoPorIdInterno(respuesta.id);
    if (!producto) throw new Error('El producto se guardó pero no se pudo volver a leer.');

    return {
      producto,
      variantesRetiradas: (respuesta.variantes_retiradas ?? []).map((v) => ({
        talla: v.talla,
        colorId: v.color_id,
        colorNombre: v.color_nombre,
      })),
    };
  },

  // Dos viajes en vez de tres: se lee solo la columna `activo` y el update
  // devuelve el producto completo en la misma respuesta.
  async alternarActivo(id: string): Promise<Producto> {
    const cliente = requerirSupabase();
    const { data: actual, error: errorLectura } = await cliente
      .from('productos')
      .select('activo')
      .eq('id', id)
      .maybeSingle();
    if (errorLectura) throw new Error(`No se pudo leer el estado del producto: ${errorLectura.message}`);
    if (!actual) throw new Error(`El producto "${id}" no existe.`);

    const { data, error } = await cliente
      .from('productos')
      .update({ activo: !(actual as { activo: boolean }).activo })
      .eq('id', id)
      .select(SELECT_PRODUCTO)
      .single();
    if (error) throw new Error(`No se pudo cambiar el estado del producto: ${error.message}`);
    return mapearProducto(data as unknown as FilaProductoSupabase);
  },
};
