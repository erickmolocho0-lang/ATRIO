import { categorias } from '@/data/categorias';
import { colores } from '@/data/colores';
import { productos as productosSemilla } from '@/data/productos';
import type { Categoria, ColorProducto, DatosProductoGenerales, Producto, VarianteProducto } from '@/types';
import type { ItemCarrito } from '@/types';
import { buscarVariantePorId } from '@/utils/variantes';

// Almacén en memoria (no AsyncStorage: nunca será la fuente oficial del
// stock). Las tablas `productos`/`variantes_producto` ya existen en Supabase,
// pero el rol `anon` todavía no tiene GRANT sobre ellas (ver auditoría) — en
// cuanto se resuelva, solo cambia el CUERPO de estas funciones, no su forma.
let almacenProductos: Producto[] = [...productosSemilla];

function generarId(nombre: string): string {
  const base = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
  return `${base || 'producto'}-${Date.now().toString(36)}`;
}

function coloresDeVariantes(variantes: VarianteProducto[]): ColorProducto[] {
  const ids = [...new Set(variantes.map((v) => v.colorId))];
  return ids
    .map((id) => colores.find((color) => color.id === id))
    .filter((color): color is ColorProducto => color !== undefined);
}

function requerirProducto(id: string): Producto {
  const existente = almacenProductos.find((producto) => producto.id === id);
  if (!existente) throw new Error(`El producto "${id}" no existe.`);
  return existente;
}

export const servicioProductos = {
  async obtenerProductos(): Promise<Producto[]> {
    return almacenProductos;
  },

  async obtenerProductoPorId(id: string): Promise<Producto | undefined> {
    return almacenProductos.find((producto) => producto.id === id);
  },

  async obtenerNovedades(limite = 4): Promise<Producto[]> {
    return almacenProductos.filter((producto) => producto.esNovedad).slice(0, limite);
  },

  async obtenerCategorias(): Promise<Categoria[]> {
    return categorias;
  },

  async obtenerCategoriaPorId(id: string): Promise<Categoria | undefined> {
    return categorias.find((categoria) => categoria.id === id);
  },

  async obtenerColores(): Promise<ColorProducto[]> {
    return colores;
  },

  // --- Admin: CRUD de productos/variantes (Yeiner) ---

  async crearProducto(
    datos: DatosProductoGenerales & { variantes: VarianteProducto[]; imagenes: string[] },
  ): Promise<Producto> {
    const categoria = categorias.find((c) => c.id === datos.categoriaId);
    const nuevo: Producto = {
      ...datos,
      id: generarId(datos.nombre),
      categoriaNombre: categoria?.nombre.toUpperCase() ?? '',
      colores: coloresDeVariantes(datos.variantes),
      activo: true,
      popularidad30d: 0,
      fechaAlta: new Date().toISOString().slice(0, 10),
    };
    almacenProductos = [nuevo, ...almacenProductos];
    return nuevo;
  },

  async actualizarProducto(id: string, datos: DatosProductoGenerales): Promise<Producto> {
    const existente = requerirProducto(id);
    const categoria = categorias.find((c) => c.id === datos.categoriaId);
    const actualizado: Producto = {
      ...existente,
      ...datos,
      categoriaNombre: categoria?.nombre.toUpperCase() ?? existente.categoriaNombre,
    };
    almacenProductos = almacenProductos.map((p) => (p.id === id ? actualizado : p));
    return actualizado;
  },

  async actualizarVariantesEImagenes(
    id: string,
    variantes: VarianteProducto[],
    imagenes: string[],
  ): Promise<Producto> {
    const existente = requerirProducto(id);
    const actualizado: Producto = {
      ...existente,
      variantes,
      imagenes,
      colores: coloresDeVariantes(variantes),
    };
    almacenProductos = almacenProductos.map((p) => (p.id === id ? actualizado : p));
    return actualizado;
  },

  async alternarActivo(id: string): Promise<Producto> {
    const existente = requerirProducto(id);
    const actualizado: Producto = { ...existente, activo: !existente.activo };
    almacenProductos = almacenProductos.map((p) => (p.id === id ? actualizado : p));
    return actualizado;
  },

  // --- Pedidos: descontar stock al confirmar la compra ----

  // Todo o nada: si una variante no alcanza, no se descuenta ninguna.
  async descontarStock(items: ItemCarrito[]): Promise<void> {
    for (const item of items) {
      const variante = buscarVariantePorId(requerirProducto(item.producto.id), item.varianteId);
      if (!variante || variante.stock < item.cantidad) {
        throw new Error(`Ya no hay stock suficiente de ${item.producto.nombre}.`);
      }
    }

    for (const item of items) {
      const producto = requerirProducto(item.producto.id);
      const variantes = producto.variantes.map((variante) =>
        variante.id === item.varianteId
          ? { ...variante, stock: variante.stock - item.cantidad }
          : variante,
      );
      almacenProductos = almacenProductos.map((p) => (p.id === producto.id ? { ...producto, variantes } : p));
    }
  },
};
