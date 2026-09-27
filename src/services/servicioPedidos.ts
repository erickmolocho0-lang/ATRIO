import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';
import type { EstadoPedido, Pedido } from '@/types';

// Hoy los pedidos viven en el dispositivo. Cuando exista la tabla `pedidos` en
// Supabase, solo cambia el cuerpo de estas funciones.

export type DatosNuevoPedido = Omit<Pedido, 'numero' | 'fecha' | 'estado'>;

async function leer(): Promise<Pedido[]> {
  const guardados = await servicioAlmacenamiento.obtenerDato<Pedido[]>(CLAVES_ALMACENAMIENTO.pedidos);
  return guardados ?? [];
}

async function escribir(lista: Pedido[]): Promise<void> {
  await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.pedidos, lista);
}

// ATR-0001, ATR-0002, ...
function siguienteNumero(lista: Pedido[]): string {
  return `ATR-${String(lista.length + 1).padStart(4, '0')}`;
}

export const servicioPedidos = {
  async obtenerPedidos(): Promise<Pedido[]> {
    return leer();
  },

  async obtenerPedidosDeUsuario(usuarioId: string): Promise<Pedido[]> {
    const lista = await leer();
    return lista.filter((pedido) => pedido.usuarioId === usuarioId);
  },

  async obtenerPedido(numero: string): Promise<Pedido | null> {
    const lista = await leer();
    return lista.find((pedido) => pedido.numero === numero) ?? null;
  },

  async crearPedido(datos: DatosNuevoPedido): Promise<Pedido> {
    const lista = await leer();
    const nuevo: Pedido = {
      ...datos,
      numero: siguienteNumero(lista),
      fecha: new Date().toISOString(),
      estado: 'preparado',
    };
    // El más reciente primero.
    await escribir([nuevo, ...lista]);
    return nuevo;
  },

  async cambiarEstado(numero: string, estado: EstadoPedido): Promise<Pedido> {
    const lista = await leer();
    const existente = lista.find((pedido) => pedido.numero === numero);
    if (!existente) throw new Error('El pedido no existe.');

    const actualizado: Pedido = { ...existente, estado };
    await escribir(lista.map((pedido) => (pedido.numero === numero ? actualizado : pedido)));
    return actualizado;
  },
};
