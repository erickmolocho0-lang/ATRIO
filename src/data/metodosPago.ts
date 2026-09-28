import type { MetodoPago } from '@/types';

export const metodosPago: { metodo: MetodoPago; nombre: string; descripcion: string }[] = [
  { metodo: 'tarjeta', nombre: 'Tarjeta', descripcion: 'Crédito o débito (simulado)' },
  { metodo: 'yape', nombre: 'Yape', descripcion: 'Pago con QR (simulado)' },
  { metodo: 'plin', nombre: 'Plin', descripcion: 'Pago con QR (simulado)' },
  { metodo: 'contra_entrega', nombre: 'Contra entrega', descripcion: 'Pagas al recibir tu pedido' },
];

export function nombreMetodoPago(metodo: MetodoPago): string {
  return metodosPago.find((opcion) => opcion.metodo === metodo)?.nombre ?? metodo;
}
