export interface LineaVenta {
  productoId: string;
  productoNombre: string;
  categoriaId: string;
  categoriaNombre: string;
  cantidad: number;
  precioUnitario: number;
}

// Un pedido tal como lo necesita el reporte. El total es el del pedido
// (con IGV, descuento y envío), para que coincida con el Dashboard.
export interface PedidoVenta {
  pedidoId: string;
  fecha: string; // ISO 8601
  total: number;
  lineas: LineaVenta[];
}

export interface ResumenReporte {
  totalIngresos: number;
  totalPedidos: number;
  unidadesVendidas: number;
  ticketPromedio: number;
}

export interface ProductoVendido {
  productoId: string;
  nombre: string;
  categoriaNombre: string;
  unidades: number;
  ingresos: number; // a precio de lista
}

export interface CategoriaVendida {
  categoriaId: string;
  nombre: string;
  unidades: number;
  ingresos: number; // a precio de lista
  porcentaje: number;
}

export interface VentaDiaria {
  fecha: string; // YYYY-MM-DD
  total: number;
}

export interface ReporteVentas {
  resumen: ResumenReporte;
  productosVendidos: ProductoVendido[];
  categoriasVendidas: CategoriaVendida[];
  ventasPorDia: VentaDiaria[];
}