import type { EstadoPedido } from './Admin';
import type { DatosPago } from './Checkout';

// Pago simulado: no hay pasarela real todavía.
export type MetodoPago = 'tarjeta' | 'yape' | 'plin' | 'contra_entrega';

export interface Pedido extends DatosPago {
  numero: string;
  usuarioId: string;
  fecha: string;
  metodoPago: MetodoPago;
  estado: EstadoPedido;
}
