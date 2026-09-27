import type { EstadoPedido } from '@/types';

export const nombreEstadoPedido: Record<EstadoPedido, string> = {
  preparado: 'Preparado',
  en_camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  devuelto: 'Devuelto',
};
