import { generarPedidosDeEjemplo } from '@/data/ventasEjemplo';
import { construirReporte } from '@/utils/reportes';
import { servicioPedidos } from './servicioPedidos';
import { servicioProductos } from './servicioProductos';
import type { EstadoPedido, PedidoVenta, ReporteVentas } from '@/types';

// Un pedido cancelado o devuelto no cuenta como venta.
const ESTADOS_SIN_VENTA: EstadoPedido[] = ['cancelado', 'devuelto'];

async function obtenerPedidosReales(): Promise<PedidoVenta[]> {
  const pedidos = await servicioPedidos.obtenerPedidos();
  return pedidos
    .filter((pedido) => !ESTADOS_SIN_VENTA.includes(pedido.estado))
    .map((pedido) => ({
      pedidoId: pedido.numero,
      fecha: pedido.fecha,
      total: pedido.resumen.total,
      lineas: pedido.items.map((item) => ({
        productoId: item.producto.id,
        productoNombre: item.producto.nombre,
        categoriaId: item.producto.categoriaId,
        categoriaNombre: item.producto.categoriaNombre,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio,
      })),
    }));
}

export const servicioReportes = {
  async obtenerReporte({ conEjemplo = false }: { conEjemplo?: boolean } = {}): Promise<ReporteVentas> {
    const pedidos = conEjemplo
      ? generarPedidosDeEjemplo(await servicioProductos.obtenerProductos())
      : await obtenerPedidosReales();
    return construirReporte(pedidos);
  },
};