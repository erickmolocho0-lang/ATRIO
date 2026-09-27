import type { Producto, VarianteProducto } from '@/types';

export const UMBRAL_STOCK_BAJO = 3;

export function esStockBajo(stock: number): boolean {
  return stock <= UMBRAL_STOCK_BAJO;
}

export function idVariante(productoId: string, talla: string, colorId: string): string {
  return `${productoId}__${talla}__${colorId}`;
}

export function buscarVariante(
  producto: Producto,
  talla: string,
  colorId: string,
): VarianteProducto | undefined {
  return producto.variantes.find((v) => v.talla === talla && v.colorId === colorId);
}

export function buscarVariantePorId(
  producto: Producto,
  varianteId: string,
): VarianteProducto | undefined {
  return producto.variantes.find((v) => v.id === varianteId);
}

export function stockDisponible(producto: Producto, talla: string, colorId: string): number {
  return buscarVariante(producto, talla, colorId)?.stock ?? 0;
}

export function stockTotal(producto: Producto): number {
  return producto.variantes.reduce((acc, v) => acc + v.stock, 0);
}

/** Todas las tallas que el producto ofrece, sin importar el stock. */
export function tallasDelProducto(producto: Producto): string[] {
  return [...new Set(producto.variantes.map((v) => v.talla))];
}

/**
 * Tallas con stock disponible. Si se pasa un color, solo considera variantes de ese color;
 * si no, considera cualquier color (para no bloquear la talla antes de elegir color).
 */
export function tallasConStock(producto: Producto, colorId?: string | null): string[] {
  const variantesRelevantes = colorId
    ? producto.variantes.filter((v) => v.colorId === colorId)
    : producto.variantes;
  return [...new Set(variantesRelevantes.filter((v) => v.stock > 0).map((v) => v.talla))];
}

/** Simétrico a tallasConStock, para colores. */
export function coloresConStock(producto: Producto, talla?: string | null): string[] {
  const variantesRelevantes = talla
    ? producto.variantes.filter((v) => v.talla === talla)
    : producto.variantes;
  return [...new Set(variantesRelevantes.filter((v) => v.stock > 0).map((v) => v.colorId))];
}
