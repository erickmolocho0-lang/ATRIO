import type { CategoriaVendida, PedidoVenta, ProductoVendido, ReporteVentas } from '@/types';

export function construirReporte(pedidos: PedidoVenta[]): ReporteVentas {
  const porProducto = new Map<string, ProductoVendido>();
  const porCategoria = new Map<string, Omit<CategoriaVendida, 'porcentaje'>>();
  const porDia = new Map<string, number>();
  let totalIngresos = 0;
  let unidadesVendidas = 0;
  let ingresosLineas = 0;

  for (const pedido of pedidos) {
    totalIngresos += pedido.total;
    const dia = pedido.fecha.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + pedido.total);

    for (const linea of pedido.lineas) {
      const ingreso = linea.cantidad * linea.precioUnitario;
      unidadesVendidas += linea.cantidad;
      ingresosLineas += ingreso;

      const producto = porProducto.get(linea.productoId) ?? {
        productoId: linea.productoId,
        nombre: linea.productoNombre,
        categoriaNombre: linea.categoriaNombre,
        unidades: 0,
        ingresos: 0,
      };
      producto.unidades += linea.cantidad;
      producto.ingresos += ingreso;
      porProducto.set(linea.productoId, producto);

      const categoria = porCategoria.get(linea.categoriaId) ?? {
        categoriaId: linea.categoriaId,
        nombre: linea.categoriaNombre,
        unidades: 0,
        ingresos: 0,
      };
      categoria.unidades += linea.cantidad;
      categoria.ingresos += ingreso;
      porCategoria.set(linea.categoriaId, categoria);
    }
  }

  const totalPedidos = pedidos.length;

  return {
    resumen: {
      totalIngresos,
      totalPedidos,
      unidadesVendidas,
      ticketPromedio: totalPedidos > 0 ? totalIngresos / totalPedidos : 0,
    },
    productosVendidos: [...porProducto.values()].sort(
      (a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos,
    ),
    categoriasVendidas: [...porCategoria.values()]
      .sort((a, b) => b.ingresos - a.ingresos)
      .map((categoria) => ({
        ...categoria,
        porcentaje: ingresosLineas > 0 ? (categoria.ingresos / ingresosLineas) * 100 : 0,
      })),
    ventasPorDia: [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total })),
  };
}

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsvProductos(reporte: ReporteVentas): string {
  const filas: (string | number)[][] = [
    ['Producto', 'Categoría', 'Unidades', 'Ingresos (S/)'],
    ...reporte.productosVendidos.map((p) => [
      p.nombre,
      p.categoriaNombre,
      p.unidades,
      p.ingresos.toFixed(2),
    ]),
  ];
  return filas.map((fila) => fila.map(celdaCsv).join(',')).join('\n');
}