import type { ColorProducto } from '@/types';

export const colores: ColorProducto[] = [
  { id: 'negro', nombre: 'Negro', hex: '#12110F' },
  { id: 'blanco', nombre: 'Blanco', hex: '#FFFFFF' },
  { id: 'arena', nombre: 'Arena', hex: '#D8CBB0' },
  { id: 'tinta', nombre: 'Tinta', hex: '#1E2A38' },
  { id: 'oliva', nombre: 'Oliva', hex: '#5C6446' },
  { id: 'crudo', nombre: 'Crudo', hex: '#EDE6D6' },
  { id: 'terracota', nombre: 'Terracota', hex: '#C4552F' },
  { id: 'vino', nombre: 'Vino', hex: '#5E2A2E' },
];

export function obtenerColorPorId(id: string): ColorProducto | undefined {
  return colores.find((color) => color.id === id);
}
