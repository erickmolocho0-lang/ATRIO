// Estados de pedido: deben coincidir con los que use el módulo de pedidos
// de Hans cuando se conecte de verdad.
export type EstadoPedido = 'preparado' | 'en_camino' | 'entregado' | 'cancelado' | 'devuelto';

export interface ResumenDashboardAdmin {
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  productosActivos: number;
  pedidosPendientes: number;
  pedidosEntregados: number;
}

// Interfaz desacoplada del futuro módulo de pedidos (Hans). El Dashboard y
// /admin/pedidos solo conocen esta forma; no dependen de su implementación.
export interface PedidoReciente {
  id: string;
  numero: string;
  cliente: string;
  total: number;
  estado: EstadoPedido;
  fecha: string; // ISO 8601
}

export interface VentaReciente {
  numeroPedido: string;
  fecha: string;
  total: number;
  metodoPago: string;
  estado: EstadoPedido;
}

// Un registro por VARIANTE con stock bajo (no por producto): el modelo real
// es producto -> variantes[] (talla + color + stock propio).
export interface ProductoStockBajo {
  varianteId: string;
  productoId: string;
  nombre: string;
  talla: string;
  colorId: string;
  colorNombre: string;
  stock: number;
}
