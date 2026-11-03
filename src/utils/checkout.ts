import { CANTIDAD_MAXIMA, CANTIDAD_MINIMA } from '@/context/CarritoContext';
import type {
  DatosDireccion,
  Direccion,
  ItemCarrito,
  MetodoEntrega,
  ProblemaCheckout,
  Producto,
} from '@/types';
import { buscarVariante } from '@/utils/variantes';

export function detectarProblemasSeleccion(
  items: ItemCarrito[],
  metodoEntrega: MetodoEntrega | null,
  direccion: Direccion | null,
): ProblemaCheckout[] {
  const problemas: ProblemaCheckout[] = [];
  if (items.length === 0) {
    problemas.push({ codigo: 'carrito-vacio', mensaje: 'Tu carrito está vacío.' });
  }
  if (!metodoEntrega) {
    problemas.push({ codigo: 'sin-metodo-entrega', mensaje: 'Elige un método de entrega.' });
  } else if (metodoEntrega.tipo === 'envio' && !direccion) {
    problemas.push({
      codigo: 'sin-direccion',
      mensaje: 'Agrega o elige una dirección para el envío.',
    });
  }
  if (metodoEntrega?.tipo === 'envio' && direccion &&
    (!direccion.zonaId || !direccion.destinatario?.trim() || !/^9\d{8}$/.test(direccion.telefono ?? ''))) {
    problemas.push({ codigo: 'direccion-incompleta', mensaje: 'Edita tu direccion para completar zona, destinatario y celular.' });
  }
  return problemas;
}

export function detectarProblemasCantidad(items: ItemCarrito[]): ProblemaCheckout[] {
  return items
    .filter(
      (item) =>
        !Number.isInteger(item.cantidad) ||
        item.cantidad < CANTIDAD_MINIMA ||
        item.cantidad > CANTIDAD_MAXIMA,
    )
    .map((item) => ({
      codigo: 'cantidad-invalida' as const,
      mensaje: `Revisa la cantidad de «${item.producto.nombre}» (talla ${item.talla}): debe estar entre ${CANTIDAD_MINIMA} y ${CANTIDAD_MAXIMA}.`,
    }));
}

/**
 * Un problema por cada producto del carrito que el admin desactivó. Usa los
 * productos releídos (productosActuales), no la copia guardada en el carrito.
 */
export function detectarProblemasInactivos(
  items: ItemCarrito[],
  productosActuales: Map<string, Producto>,
): ProblemaCheckout[] {
  const avisados = new Set<string>();
  const problemas: ProblemaCheckout[] = [];
  for (const item of items) {
    const actual = productosActuales.get(item.producto.id);
    if (!actual || actual.activo || avisados.has(actual.id)) continue;
    avisados.add(actual.id);
    problemas.push({
      codigo: 'producto-inactivo',
      mensaje: `«${item.producto.nombre}» ya no está disponible. Quítalo del carrito para continuar.`,
    });
  }
  return problemas;
}

/**
 * Validación de stock solo para UX, sobre el modelo de variantes
 * (producto.variantes[].stock, por talla+color). La validación definitiva
 * se hace en la nube al confirmar la compra.
 */
export function detectarProblemasStock(
  items: ItemCarrito[],
  productosActuales: Map<string, Producto>,
): ProblemaCheckout[] {
  const problemas: ProblemaCheckout[] = [];
  const avisados = new Set<string>();
  const pedidoPorVariante = new Map<string, number>();
  for (const item of items) {
    const acumulado = pedidoPorVariante.get(item.varianteId) ?? 0;
    pedidoPorVariante.set(item.varianteId, acumulado + item.cantidad);
  }

  const avisar = (clave: string, mensaje: string) => {
    if (avisados.has(clave)) return;
    avisados.add(clave);
    problemas.push({ codigo: 'sin-stock', mensaje });
  };

  for (const item of items) {
    const nombre = item.producto.nombre;
    const actual = productosActuales.get(item.producto.id);
    if (!actual) {
      avisar(`${item.producto.id}:ausente`, `«${nombre}» ya no está disponible.`);
      continue;
    }
    // Los inactivos los reporta detectarProblemasInactivos.
    if (!actual.activo) continue;
    const variante = buscarVariante(actual, item.talla, item.colorId);
    if (!variante) {
      avisar(
        `${item.varianteId}:ausente`,
        `«${nombre}» (talla ${item.talla}) ya no está disponible.`,
      );
      continue;
    }
    const pedido = pedidoPorVariante.get(item.varianteId) ?? 0;
    if (pedido > variante.stock) {
      avisar(
        `${item.varianteId}:stock`,
        variante.stock <= 0
          ? `«${nombre}» (talla ${item.talla}) está agotado.`
          : `Solo quedan ${variante.stock} unidades de «${nombre}» (talla ${item.talla}).`,
      );
    }
  }
  return problemas;
}

export interface ErroresDireccion {
  direccion?: string;
  distrito?: string;
  zonaId?: string;
  destinatario?: string;
  telefono?: string;
}

export function validarDatosDireccion(datos: DatosDireccion): ErroresDireccion {
  const errores: ErroresDireccion = {};
  if (datos.direccion.trim().length < 5) {
    errores.direccion = 'Ingresa una dirección de al menos 5 caracteres.';
  }
  if (datos.distrito.trim().length < 2) {
    errores.distrito = 'Ingresa el distrito.';
  }
  if (!datos.zonaId) errores.zonaId = 'Selecciona una zona con cobertura.';
  if ((datos.destinatario?.trim().length ?? 0) < 2) errores.destinatario = 'Ingresa el nombre del destinatario.';
  if (!/^9\d{8}$/.test(datos.telefono ?? '')) errores.telefono = 'Ingresa un celular peruano de 9 digitos que empiece con 9.';
  return errores;
}
