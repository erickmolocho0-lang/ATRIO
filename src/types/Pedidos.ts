import type { EstadoPedido } from './Admin';
import type { DatosPago } from './Checkout';

// Pago simulado: no hay pasarela real todavía.
export type MetodoPago = 'tarjeta' | 'yape' | 'contra_entrega';

// Mismos valores que el CHECK de la tabla pagos.
export type EstadoPago = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';

export interface Pedido extends DatosPago {
  numero: string;
  usuarioId: string;
  cliente: string;
  fecha: string;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  estado: EstadoPedido;
}
