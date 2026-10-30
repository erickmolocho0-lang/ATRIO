export type EstadoPedido =
  | 'pendiente_pago'
  | 'preparado'
  | 'en_camino'
  | 'entregado'
  | 'cancelado'
  | 'devuelto';

export interface ResumenDashboardAdmin {
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  productosActivos: number;
  pedidosPendientes: number;
  pedidosEntregados: number;
}

export interface PedidoReciente {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  estado: EstadoPedido;
  fecha: string;
}

export interface VentaReciente {
  numeroPedido: string;
  fecha: string;
  total: number;
  metodoPago: string;
  estado: EstadoPedido;
}

export interface ProductoStockBajo {
  varianteId: string;
  productoId: string;
  nombre: string;
  talla: string;
  colorId: string;
  colorNombre: string;
  stock: number;
}
