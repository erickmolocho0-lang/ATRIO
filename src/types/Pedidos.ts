import type { EstadoPedido } from './Admin';
import type { DatosPago } from './Checkout';

// Tarjeta y Yape se cobran con Mercado Pago; contra entrega, al recibir.
export type MetodoPago = 'tarjeta' | 'yape' | 'contra_entrega';

// Mismos valores que el CHECK de la tabla pagos.
export type EstadoPago = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';

export interface Pedido extends DatosPago {
  numero: string;
  usuarioId: string | null;
  cliente: string;
  fecha: string;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  estado: EstadoPedido;
}

// Una fila del seguimiento: a qué estado pasó el pedido y cuándo.
export interface CambioEstado {
  estado: EstadoPedido;
  fecha: string;
}
