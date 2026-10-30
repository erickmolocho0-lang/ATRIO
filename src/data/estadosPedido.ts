import type { EstadoPedido } from '@/types';

export const nombreEstadoPedido: Record<EstadoPedido, string> = {
  pendiente_pago: 'Pendiente de pago',
  preparado: 'Preparado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
};

// A qué estados se puede pasar desde cada uno. Debe coincidir con la función
// cambiar_estado_pedido de la base, que es la que hace cumplir la regla.
export const siguientesEstados: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente_pago: ['preparado', 'cancelado'],
  preparado: ['en_camino', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: ['devuelto'],
  cancelado: [],
  devuelto: [],
};
