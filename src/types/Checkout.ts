import type { Direccion } from './Direccion';
import type { ItemCarrito, ResumenCompra } from './ItemCarrito';

export interface MetodoEntrega {
  id: string;
  nombre: string;
  descripcion: string;
  costo: number;
  tipo: 'envio' | 'retiro';
}

export interface ResumenCheckout extends ResumenCompra {
  envio: number;
}

export interface ProblemaCheckout {
  codigo:
    | 'carrito-vacio'
    | 'sin-metodo-entrega'
    | 'sin-direccion'
    | 'direccion-incompleta'
    | 'cantidad-invalida'
    | 'sin-stock'
    | 'producto-inactivo';
  mensaje: string;
}

export interface DatosPago {
  items: ItemCarrito[];
  direccion: Direccion | null;
  metodoEntrega: MetodoEntrega;
  resumen: ResumenCheckout;
  codigoCupon?: string | null;
}
