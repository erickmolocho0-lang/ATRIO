import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { metodosEntrega } from '@/data/metodosEntrega';
import { servicioProductos } from '@/services/servicioProductos';
import type { DatosPago, ProblemaCheckout, Producto } from '@/types';
import {
  detectarProblemasCantidad,
  detectarProblemasInactivos,
  detectarProblemasSeleccion,
  detectarProblemasStock,
} from '@/utils/checkout';
import { calcularResumenCheckout } from '@/utils/precio';
import { useCarrito } from './useCarrito';
import { useDirecciones } from './useDirecciones';
import { useSeleccionCheckout } from './useSeleccionCheckout';

export function useCheckout() {
  const { items, resumen: resumenCarrito } = useCarrito();
  const { metodoEntregaId, seleccionarMetodoEntrega, reiniciarCheckout } = useSeleccionCheckout();
  const { direccionSeleccionada, cargando: cargandoDirecciones } = useDirecciones();

  const [problemasStock, setProblemasStock] = useState<ProblemaCheckout[]>([]);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metodoEntrega = useMemo(
    () => metodosEntrega.find((metodo) => metodo.id === metodoEntregaId) ?? null,
    [metodoEntregaId],
  );

  const resumen = useMemo(
    () => calcularResumenCheckout(resumenCarrito, metodoEntrega?.costo ?? 0),
    [resumenCarrito, metodoEntrega],
  );

  // Relee el stock actual desde el servicio (el carrito guarda una copia vieja del producto).
  const validarStock = useCallback(async (): Promise<ProblemaCheckout[]> => {
    const ids = [...new Set(items.map((item) => item.producto.id))];
    const encontrados = await Promise.all(ids.map((id) => servicioProductos.obtenerProductoPorId(id)));
    const actuales = new Map<string, Producto>();
    for (const producto of encontrados) {
      if (producto) actuales.set(producto.id, producto);
    }
    return [...detectarProblemasInactivos(items, actuales), ...detectarProblemasStock(items, actuales)];
  }, [items]);

  useEffect(() => {
    let cancelado = false;
    setValidando(true);
    setError(null);
    validarStock()
      .then((problemas) => {
        if (!cancelado) setProblemasStock(problemas);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudo validar el stock.');
        }
      })
      .finally(() => {
        if (!cancelado) setValidando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [validarStock]);

  // Reintento manual: si la validación inicial falló, el botón de abajo no se
  // queda bloqueado para siempre — esto la vuelve a correr.
  const reintentarValidacion = useCallback(async () => {
    setValidando(true);
    setError(null);
    try {
      setProblemasStock(await validarStock());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el stock.');
    } finally {
      setValidando(false);
    }
  }, [validarStock]);

  const problemasLocales = useMemo(
    () => [
      ...detectarProblemasSeleccion(items, metodoEntrega, direccionSeleccionada),
      ...detectarProblemasCantidad(items),
    ],
    [items, metodoEntrega, direccionSeleccionada],
  );

  const problemas = useMemo(
    () => [...problemasLocales, ...problemasStock],
    [problemasLocales, problemasStock],
  );

  const puedeContinuar = problemas.length === 0 && !validando && !cargandoDirecciones && !error;

  const datosPago = useMemo<DatosPago | null>(() => {
    if (!puedeContinuar || !metodoEntrega) return null;
    return {
      items,
      direccion: metodoEntrega.tipo === 'envio' ? direccionSeleccionada : null,
      metodoEntrega,
      resumen,
    };
  }, [puedeContinuar, metodoEntrega, items, direccionSeleccionada, resumen]);

  const continuarAPago = useCallback(async () => {
    if (validando || problemasLocales.length > 0) return;
    setValidando(true);
    setError(null);
    try {
      const frescos = await validarStock();
      setProblemasStock(frescos);
      if (frescos.length === 0) router.push('/pago');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo validar el stock. Intenta de nuevo.');
    } finally {
      setValidando(false);
    }
  }, [validando, problemasLocales, validarStock]);

  return {
    items,
    resumen,
    metodosEntrega,
    metodoEntrega,
    seleccionarMetodoEntrega,
    direccion: direccionSeleccionada,
    problemas,
    puedeContinuar,
    validando,
    error,
    datosPago,
    continuarAPago,
    reintentarValidacion,
    reiniciarCheckout,
  };
}
