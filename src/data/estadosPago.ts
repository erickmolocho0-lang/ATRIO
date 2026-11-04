import type { EstadoPago } from '@/types';

export const nombreEstadoPago: Record<EstadoPago, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  fallido: 'Fallido',
  por_reembolsar: 'Por reembolsar',
  reembolsado: 'Reembolsado',
};