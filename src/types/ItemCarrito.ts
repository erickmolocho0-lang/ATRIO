import type { Producto } from './Producto';

export interface ItemCarrito {
  producto: Producto;
  varianteId: string;
  talla: string;
  colorId: string;
  cantidad: number;
}

export interface ResumenCompra {
  subtotal: number;
  descuento: number;
  igv: number;
  total: number;
}
