import { useCallback, useEffect, useMemo, useState } from 'react';
import { servicioProductos } from '@/services/servicioProductos';
import type { Producto } from '@/types';
import { buscarVariante, coloresConStock, tallasConStock, tallasDelProducto } from '@/utils/variantes';
import { useCarrito } from './useCarrito';

export function useDetalleProducto(id: string) {
  const [producto, setProducto] = useState<Producto | undefined>(undefined);
  const { agregarItem, contador } = useCarrito();

  const [tallaSeleccionada, setTallaSeleccionada] = useState<string | null>(null);
  const [colorSeleccionado, setColorSeleccionado] = useState<string | null>(null);
  const [errorSeleccion, setErrorSeleccion] = useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setProducto(undefined);
    setTallaSeleccionada(null);
    setColorSeleccionado(null);
    setErrorSeleccion(null);
    setCargando(true);
    setError(null);
    servicioProductos
      .obtenerProductoPorId(id)
      .then((encontrado) => {
        if (!cancelado) setProducto(encontrado);
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el producto.');
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  const tallasDisponibles = useMemo(
    () => (producto ? tallasDelProducto(producto) : []),
    [producto],
  );
  const tallasHabilitadas = useMemo(
    () => (producto ? tallasConStock(producto, colorSeleccionado) : []),
    [producto, colorSeleccionado],
  );
  const coloresHabilitados = useMemo(
    () => (producto ? coloresConStock(producto, tallaSeleccionada) : []),
    [producto, tallaSeleccionada],
  );

  const varianteActual = useMemo(
    () =>
      producto && tallaSeleccionada && colorSeleccionado
        ? buscarVariante(producto, tallaSeleccionada, colorSeleccionado)
        : undefined,
    [producto, tallaSeleccionada, colorSeleccionado],
  );

  const seleccionarTalla = useCallback((talla: string) => {
    setTallaSeleccionada(talla);
    setErrorSeleccion(null);
  }, []);

  const seleccionarColor = useCallback((colorId: string) => {
    setColorSeleccionado(colorId);
    setErrorSeleccion(null);
  }, []);

  const agregarAlCarrito = useCallback((): boolean => {
    if (!producto) return false;
    // Se llega acá con productos inactivos desde carrito o favoritos
    // (obtenerProductoPorId no filtra por `activo`).
    if (!producto.activo) {
      setErrorSeleccion('Este producto ya no está disponible.');
      return false;
    }
    if (!tallaSeleccionada || !colorSeleccionado || !varianteActual || varianteActual.stock <= 0) {
      setErrorSeleccion('Selecciona talla y color para continuar.');
      return false;
    }
    agregarItem(producto, varianteActual.id, 1);
    return true;
  }, [producto, tallaSeleccionada, colorSeleccionado, varianteActual, agregarItem]);

  return {
    producto,
    cargando,
    error,
    tallaSeleccionada,
    seleccionarTalla,
    tallasDisponibles,
    tallasHabilitadas,
    colorSeleccionado,
    seleccionarColor,
    coloresHabilitados,
    varianteActual,
    errorSeleccion,
    agregarAlCarrito,
    contadorCarrito: contador,
  };
}
