import { supabase } from '@/lib/supabase';
import { mapearDireccion, type FilaDireccion } from './servicioDirecciones';
import type {
  CambioEstado,
  Direccion,
  EstadoPago,
  EstadoPedido,
  ItemCarrito,
  MetodoEntrega,
  MetodoPago,
  Pedido,
  Producto,
} from '@/types';

function requerirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

async function requerirUsuarioId(): Promise<string> {
  const { data, error } = await requerirSupabase().auth.getSession();
  if (error || !data.session) throw new Error('Debes iniciar sesión para ver pedidos.');
  return data.session.user.id;
}

interface FilaItemPedido {
  variante_id: string;
  nombre_producto: string;
  talla: string;
  color_nombre: string | null;
  cantidad: number;
  precio_unitario: number;
  // Se resuelve vía variante_id → productos → categorías/imágenes (no es
  // una "foto" del momento de compra como el resto de esta fila: son datos
  // ACTUALES del producto — igual que la categoría para Reportes, la
  // imagen es "la que tiene el producto hoy", no necesariamente la que
  // tenía al momento de la compra si se editó o se borraron sus fotos
  // después).
  variantes_producto: {
    productos: {
      categoria_id: string;
      categorias: { nombre: string } | { nombre: string }[] | null;
      imagenes_producto: { url: string; orden: number }[] | null;
    } | null;
  } | null;
}

interface FilaPago {
  metodo: string;
  estado: EstadoPago;
}

interface FilaPedido {
  id: string;
  usuario_id: string | null;
  numero: string;
  estado: EstadoPedido;
  tipo_entrega: 'envio' | 'retiro';
  direccion_id: string | null;
  subtotal: number;
  descuento: number;
  igv: number;
  total: number;
  creado_en: string;
  metodo_entrega_id: string | null;
  costo_envio: number;
  cupon_codigo: string | null;
  datos_entrega: { metodo: MetodoEntrega; direccion: FilaDireccion | null } | null;
  items_pedido: FilaItemPedido[] | null;
  pagos: FilaPago | FilaPago[] | null;
}

// items_pedido guarda una FOTO del momento de la compra (nombre, talla,
// color, precio) — a propósito, para que el historial no cambie si el
// producto real se edita o se borra después. Por eso NO se reconstruye
// contra el producto real: se arma un `Producto` sintético solo con lo
// necesario para mostrar la línea del pedido. La categoría y la imagen son
// la excepción: se resuelven en vivo (ver comentario en FilaItemPedido)
// porque Reportes necesita la categoría y la UI necesita algo mejor que un
// marcador de posición para mostrar — si el producto se borra o pierde sus
// fotos después de la compra, vuelve a verse el marcador, sin romper nada.
function productoHistoricoDesde(fila: FilaItemPedido): Producto {
  const productoRelacionado = fila.variantes_producto?.productos;
  const categoriaFila = productoRelacionado?.categorias;
  const categoria = Array.isArray(categoriaFila) ? categoriaFila[0] : categoriaFila;
  const imagenPrincipal = [...(productoRelacionado?.imagenes_producto ?? [])].sort(
    (a, b) => a.orden - b.orden,
  )[0]?.url;
  return {
    id: fila.variante_id,
    sku: '',
    nombre: fila.nombre_producto,
    categoriaId: productoRelacionado?.categoria_id ?? '',
    categoriaNombre: categoria?.nombre ?? '',
    precio: fila.precio_unitario,
    descripcion: '',
    composicion: '',
    confeccion: '',
    origen: '',
    imagenes: imagenPrincipal ? [imagenPrincipal] : [],
    colores: fila.color_nombre ? [{ id: '', nombre: fila.color_nombre, hex: '#CCCCCC' }] : [],
    variantes: [],
    etiquetas: [],
    esNovedad: false,
    popularidad30d: 0,
    fechaAlta: '',
    activo: true,
  };
}

function itemsDesdeFila(fila: FilaPedido): ItemCarrito[] {
  return (fila.items_pedido ?? []).map((itemFila) => ({
    producto: productoHistoricoDesde(itemFila),
    varianteId: itemFila.variante_id,
    talla: itemFila.talla,
    colorId: '',
    cantidad: itemFila.cantidad,
  }));
}

function pagoDesdeFila(fila: FilaPedido): FilaPago | null {
  return (Array.isArray(fila.pagos) ? fila.pagos[0] : fila.pagos) ?? null;
}

// Los pedidos nuevos guardan la modalidad exacta, costo y datos de entrega historicos.
// Para pedidos antiguos sin modalidad exacta se muestra una etiqueta generica.
function metodoEntregaDesdeFila(fila: FilaPedido): MetodoEntrega {
  const costo = Number(fila.costo_envio ?? Math.max(0, fila.total - fila.subtotal + fila.descuento));
  if (fila.datos_entrega?.metodo) return { ...fila.datos_entrega.metodo, costo };
  const id = fila.metodo_entrega_id;
  return { id: id ?? fila.tipo_entrega, tipo: fila.tipo_entrega, costo,
    nombre: id === 'express' ? 'Envio express' : id === 'estandar' ? 'Envio estandar' : fila.tipo_entrega === 'retiro' ? 'Retiro en tienda' : 'Envio (modalidad no registrada)', descripcion: '' };
}

function mapearPedido(
  fila: FilaPedido,
  direccion: Direccion | null,
  nombreCliente: string,
): Pedido {
  const metodoEntrega = metodoEntregaDesdeFila(fila);
  const envio = metodoEntrega.tipo === 'envio' ? metodoEntrega.costo : 0;
  return {
    numero: fila.numero,
    usuarioId: fila.usuario_id,
    cliente: nombreCliente,
    fecha: fila.creado_en,
    metodoPago: (pagoDesdeFila(fila)?.metodo as MetodoPago) ?? 'contra_entrega',
    estadoPago: pagoDesdeFila(fila)?.estado ?? 'pendiente',
    estado: fila.estado,
    items: itemsDesdeFila(fila),
    direccion: metodoEntrega.tipo === 'envio' ? (fila.datos_entrega?.direccion ? mapearDireccion(fila.datos_entrega.direccion, fila.usuario_id) : direccion) : null,
    codigoCupon: fila.cupon_codigo,
    metodoEntrega,
    resumen: {
      subtotal: fila.subtotal,
      descuento: fila.descuento,
      igv: fila.igv,
      total: fila.total,
      envio,
    },
  };
}

const SELECT_PEDIDO = `
  id, usuario_id, numero, estado, tipo_entrega, direccion_id, subtotal, descuento, igv, total, creado_en, metodo_entrega_id, costo_envio, cupon_codigo, datos_entrega,
  items_pedido (
    variante_id, nombre_producto, talla, color_nombre, cantidad, precio_unitario,
    variantes_producto ( productos ( categoria_id, categorias ( nombre ), imagenes_producto ( url, orden ) ) )
  ),
  pagos ( metodo, estado )
`;

// direcciones/perfiles no tienen FK directa hacia `pedidos` que PostgREST
// pueda embeber solo, así que se resuelven con una segunda consulta y se
// arman en memoria — igual que el conteo de categorías en servicioProductos.
async function enriquecerPedidos(filas: FilaPedido[]): Promise<Pedido[]> {
  const cliente = requerirSupabase();
  const idsDireccion = [...new Set(filas.map((f) => f.direccion_id).filter((id): id is string => !!id))];
  const idsUsuario = [...new Set(filas.map((f) => f.usuario_id).filter((id): id is string => !!id))];

  const [{ data: filasDireccion }, { data: filasPerfil }] = await Promise.all([
    idsDireccion.length > 0
      ? cliente.from('direcciones').select('id, etiqueta, direccion, distrito, referencia, predeterminada, zona_id, destinatario, telefono').in('id', idsDireccion)
      : Promise.resolve({ data: [] as unknown[] }),
    idsUsuario.length > 0
      ? cliente.from('perfiles').select('id, nombre').in('id', idsUsuario)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const mapaDirecciones = new Map(
    (filasDireccion ?? []).map((d) => {
      const t = d as { id: string; etiqueta: string | null; direccion: string; distrito: string | null; referencia: string | null; predeterminada: boolean; zona_id: string | null; destinatario: string | null; telefono: string | null };
      return [
        t.id,
        {
          id: t.id,
          usuarioId: null,
          etiqueta: t.etiqueta ?? undefined,
          direccion: t.direccion,
          distrito: t.distrito ?? '',
          referencia: t.referencia ?? undefined,
          predeterminada: t.predeterminada, zonaId: t.zona_id ?? undefined, destinatario: t.destinatario ?? undefined, telefono: t.telefono ?? undefined,
        } as Direccion,
      ];
    }),
  );
  const mapaNombres = new Map(
    (filasPerfil ?? []).map((p) => {
      const t = p as { id: string; nombre: string | null };
      return [t.id, t.nombre ?? 'Cliente ATRIO'];
    }),
  );

  return filas.map((fila) =>
    mapearPedido(
      fila,
      fila.direccion_id ? mapaDirecciones.get(fila.direccion_id) ?? null : null,
      (fila.usuario_id ? mapaNombres.get(fila.usuario_id) : undefined) ?? 'Cliente ATRIO',
    ),
  );
}

export const servicioPedidos = {
  async cotizar(datos: { metodoEntregaId: string; direccionId: string | null; codigoCupon: string | null }): Promise<import('@/types').ResumenCheckout> {
    const { data, error } = await requerirSupabase().rpc('cotizar_checkout', {
      p_metodo_entrega_id: datos.metodoEntregaId, p_direccion_id: datos.direccionId, p_codigo_cupon: datos.codigoCupon,
    });
    if (error) throw new Error(error.code === 'PGRST202' ? 'La tienda debe habilitar el checkout actualizado.' : error.message);
    const c = data?.[0];
    if (!c) throw new Error('No se pudo verificar el total de la compra.');
    return { subtotal: Number(c.subtotal), descuento: Number(c.descuento), envio: Number(c.costo_envio), igv: Number(c.igv), total: Number(c.total) };
  },
  // Sin filtro de usuario: RLS decide qué ve — el cliente solo los suyos, el
  // administrador todos (política ya definida en la auditoría/SQL entregado).
  async obtenerPedidos(): Promise<Pedido[]> {
    const { data, error } = await requerirSupabase()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .order('creado_en', { ascending: false });
    if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
    return enriquecerPedidos((data ?? []) as unknown as FilaPedido[]);
  },

  async obtenerPedidosDeUsuario(usuarioId: string): Promise<Pedido[]> {
    const { data, error } = await requerirSupabase()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });
    if (error) throw new Error(`No se pudieron cargar tus pedidos: ${error.message}`);
    return enriquecerPedidos((data ?? []) as unknown as FilaPedido[]);
  },

  async obtenerPedido(numero: string): Promise<Pedido | null> {
    const { data, error } = await requerirSupabase()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('numero', numero)
      .maybeSingle();
    if (error) throw new Error(`No se pudo cargar el pedido "${numero}": ${error.message}`);
    if (!data) return null;
    const [pedido] = await enriquecerPedidos([data as unknown as FilaPedido]);
    return pedido;
  },

  // Cambios de estado del pedido, del más antiguo al más reciente.
  async obtenerHistorial(numero: string): Promise<CambioEstado[]> {
    const { data, error } = await requerirSupabase()
      .from('historial_estados_pedido')
      .select('estado_nuevo, creado_en, pedidos!inner ( numero )')
      .eq('pedidos.numero', numero)
      .order('creado_en');
    if (error) throw new Error(`No se pudo cargar el seguimiento: ${error.message}`);
    return (data ?? []).map((fila) => ({ estado: fila.estado_nuevo as EstadoPedido, fecha: fila.creado_en }));
  },

  async cambiarEstado(numero: string, estado: EstadoPedido): Promise<Pedido> {
    const { error } = await requerirSupabase().rpc('cambiar_estado_pedido', {
      p_numero: numero,
      p_estado_nuevo: estado,
    });
    if (error) throw new Error(error.message);
    const actualizado = await servicioPedidos.obtenerPedido(numero);
    if (!actualizado) throw new Error('El pedido no existe.');
    return actualizado;
  },

  // Única forma de confirmar una compra: todo (validar stock, crear pedido,
  // crear items, descontar stock, registrar movimiento, crear pago, limpiar
  // carrito) pasa por esta única función transaccional en la base — nunca
  // pasos separados desde React Native.
  async confirmarCompra(datos: {
    metodoPago: MetodoPago;
    tipoEntrega: 'envio' | 'retiro';
    direccionId: string | null;
    metodoEntregaId: string;
    codigoCupon: string | null;
    totalEsperado: number;
  }): Promise<{ numero: string; total: number }> {
    const { data, error } = await requerirSupabase().rpc('confirmar_compra', {
      p_metodo_pago: datos.metodoPago,
      p_tipo_entrega: datos.tipoEntrega,
      p_direccion_id: datos.direccionId,
      p_metodo_entrega_id: datos.metodoEntregaId, p_codigo_cupon: datos.codigoCupon, p_total_esperado: datos.totalEsperado,
    });
    if (error) throw new Error(error.message);
    const fila = Array.isArray(data) ? data[0] : data;
    if (!fila) throw new Error('No se pudo confirmar la compra.');
    return { numero: (fila as { numero: string }).numero, total: (fila as { total: number }).total };
  },

  async obtenerUsuarioId(): Promise<string> {
    return requerirUsuarioId();
  },
};

export type { Pedido };
