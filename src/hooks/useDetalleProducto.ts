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
  const [errorSeleccion, setErrorSeleccion] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setProducto(undefined);
    setTallaSeleccionada(null);
    setColorSeleccionado(null);
    setErrorSeleccion(false);
    servicioProductos.obtenerProductoPorId(id).then((encontrado) => {
      if (!cancelado) setProducto(encontrado);
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
    setErrorSeleccion(false);
  }, []);

  const seleccionarColor = useCallback((colorId: string) => {
    setColorSeleccionado(colorId);
    setErrorSeleccion(false);
  }, []);

  const agregarAlCarrito = useCallback((): boolean => {
    if (!producto) return false;
    if (!tallaSeleccionada || !colorSeleccionado || !varianteActual || varianteActual.stock <= 0) {
      setErrorSeleccion(true);
      return false;
    }
    agregarItem(producto, varianteActual.id, 1);
    return true;
  }, [producto, tallaSeleccionada, colorSeleccionado, varianteActual, agregarItem]);

  return {
    producto,
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
