import { servicioProductos } from './servicioProductos';
import type {
  PedidoReciente,
  ProductoStockBajo,
  ResumenDashboardAdmin,
  VentaReciente,
} from '@/types';
import { obtenerColorPorId } from '@/data/colores';
import { esStockBajo } from '@/utils/variantes';

// TODO(hans-pedidos): reemplazar esta función por servicioPedidos.* cuando
// exista el módulo real de pedidos/ventas. El resto de este archivo (y el
// Dashboard) solo depende del tipo PedidoReciente/VentaReciente, así que ese
// cambio no debería tocar ni el hook ni la pantalla.
async function obtenerPedidosDesdeElModuloDePedidos(): Promise<PedidoReciente[]> {
  // Sin datos reales todavía: se devuelve vacío en vez de inventar pedidos.
  return [];
}

export const servicioAdmin = {
  async obtenerResumenDashboard(): Promise<ResumenDashboardAdmin> {
    const productos = await servicioProductos.obtenerProductos();
    const pedidos = await obtenerPedidosDesdeElModuloDePedidos();

    const totalVentas = pedidos.reduce((acumulado, pedido) => acumulado + pedido.total, 0);
    const totalPedidos = pedidos.length;
    const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;
    const productosActivos = productos.filter((producto) => producto.activo).length;
    const pedidosPendientes = pedidos.filter(
      (pedido) => pedido.estado === 'preparado' || pedido.estado === 'en_camino',
    ).length;
    const pedidosEntregados = pedidos.filter((pedido) => pedido.estado === 'entregado').length;

    return {
      totalVentas,
      totalPedidos,
      ticketPromedio,
      productosActivos,
      pedidosPendientes,
      pedidosEntregados,
    };
  },

  async obtenerProductosStockBajo(): Promise<ProductoStockBajo[]> {
    const productos = await servicioProductos.obtenerProductos();
    const filas: ProductoStockBajo[] = [];

    for (const producto of productos) {
      if (!producto.activo) continue;
      for (const variante of producto.variantes) {
        if (!esStockBajo(variante.stock)) continue;
        filas.push({
          varianteId: variante.id,
          productoId: producto.id,
          nombre: producto.nombre,
          talla: variante.talla,
          colorId: variante.colorId,
          colorNombre: obtenerColorPorId(variante.colorId)?.nombre ?? variante.colorId,
          stock: variante.stock,
        });
      }
    }

    return filas.sort((a, b) => a.stock - b.stock);
  },

  async obtenerPedidosRecientes(limite = 5): Promise<PedidoReciente[]> {
    const pedidos = await obtenerPedidosDesdeElModuloDePedidos();
    return [...pedidos]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, limite);
  },

  async obtenerVentasRecientes(limite = 5): Promise<VentaReciente[]> {
    const pedidos = await this.obtenerPedidosRecientes(limite);
    return pedidos.map((pedido) => ({
      numeroPedido: pedido.numero,
      fecha: pedido.fecha,
      total: pedido.total,
      metodoPago: 'N/D', // depende de Hans (pagos)
      estado: pedido.estado,
    }));
  },
};
