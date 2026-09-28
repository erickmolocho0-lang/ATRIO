import type { PedidoVenta, Producto } from '@/types';

// Datos de DEMOSTRACIÓN generados a partir del catálogo real. Solo se usan
// cuando se activa "Datos de ejemplo" en Reportes.
export function generarPedidosDeEjemplo(productos: Producto[], hoy = new Date()): PedidoVenta[] {
  const activos = productos.filter((producto) => producto.activo);
  const pedidos: PedidoVenta[] = [];

  for (let dia = 0; dia < 14; dia++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - dia);

    for (let n = 0; n < 2; n++) {
      const lineas = activos
        .filter((_, indice) => (indice + dia + n) % 4 === 0)
        .map((producto, indice) => ({
          productoId: producto.id,
          productoNombre: producto.nombre,
          categoriaId: producto.categoriaId,
          categoriaNombre: producto.categoriaNombre,
          cantidad: ((indice + dia + n) % 3) + 1,
          precioUnitario: producto.precio,
        }));

      if (lineas.length === 0) continue;

      pedidos.push({
        pedidoId: `EJ-${dia}-${n}`,
        fecha: fecha.toISOString(),
        total: lineas.reduce((acc, linea) => acc + linea.cantidad * linea.precioUnitario, 0),
        lineas,
      });
    }
  }

  return pedidos;
}