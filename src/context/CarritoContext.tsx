import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cupones } from '@/data/cupones';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';
import type { ItemCarrito, Producto, ResumenCompra } from '@/types';
import { calcularResumenCompra } from '@/utils/precio';
import { buscarVariantePorId } from '@/utils/variantes';

export const CANTIDAD_MINIMA = 1;
export const CANTIDAD_MAXIMA = 20;

interface EstadoCarritoPersistido {
  items: ItemCarrito[];
  codigoCupon: string | null;
}

interface ValorCarritoContext {
  items: ItemCarrito[];
  contador: number;
  codigoCupon: string | null;
  porcentajeDescuento: number;
  resumen: ResumenCompra;
  agregarItem: (producto: Producto, varianteId: string, cantidad?: number) => void;
  quitarItem: (productoId: string, varianteId: string) => void;
  cambiarCantidad: (productoId: string, varianteId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  aplicarCupon: (codigo: string) => boolean;
  quitarCupon: () => void;
}

export const CarritoContext = createContext<ValorCarritoContext | null>(null);

function limitarCantidad(cantidad: number, tope: number): number {
  return Math.max(CANTIDAD_MINIMA, Math.min(CANTIDAD_MAXIMA, tope, cantidad));
}

function mismaLinea(item: ItemCarrito, productoId: string, varianteId: string): boolean {
  return item.producto.id === productoId && item.varianteId === varianteId;
}

/** Descarta líneas persistidas cuya variante ya no exista (p. ej. carritos guardados con el esquema anterior). */
function lineasValidas(items: ItemCarrito[]): ItemCarrito[] {
  return items.filter((item) => buscarVariantePorId(item.producto, item.varianteId) !== undefined);
}

function buscarPorcentajeCupon(codigo: string): number | null {
  const encontrado = cupones.find(
    (cupon) => cupon.codigo.toUpperCase() === codigo.trim().toUpperCase(),
  );
  return encontrado ? encontrado.porcentaje : null;
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [codigoCupon, setCodigoCupon] = useState<string | null>(null);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    servicioAlmacenamiento
      .obtenerDato<EstadoCarritoPersistido>(CLAVES_ALMACENAMIENTO.carrito)
      .then((guardado) => {
        if (guardado) {
          setItems(lineasValidas(guardado.items ?? []));
          setCodigoCupon(guardado.codigoCupon ?? null);
        }
      })
      .finally(() => setHidratado(true));
  }, []);

  useEffect(() => {
    if (hidratado) {
      const aPersistir: EstadoCarritoPersistido = { items, codigoCupon };
      void servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.carrito, aPersistir);
    }
  }, [items, codigoCupon, hidratado]);

  const agregarItem = useCallback((producto: Producto, varianteId: string, cantidad = 1) => {
    const variante = buscarVariantePorId(producto, varianteId);
    if (!variante || variante.stock <= 0) return;

    setItems((previos) => {
      const existente = previos.find((item) => mismaLinea(item, producto.id, varianteId));
      if (existente) {
        return previos.map((item) =>
          mismaLinea(item, producto.id, varianteId)
            ? { ...item, cantidad: limitarCantidad(item.cantidad + cantidad, variante.stock) }
            : item,
        );
      }
      return [
        ...previos,
        {
          producto,
          varianteId,
          talla: variante.talla,
          colorId: variante.colorId,
          cantidad: limitarCantidad(cantidad, variante.stock),
        },
      ];
    });
  }, []);

  const quitarItem = useCallback((productoId: string, varianteId: string) => {
    setItems((previos) => previos.filter((item) => !mismaLinea(item, productoId, varianteId)));
  }, []);

  const cambiarCantidad = useCallback(
    (productoId: string, varianteId: string, cantidad: number) => {
      setItems((previos) => {
        if (cantidad < CANTIDAD_MINIMA) {
          return previos.filter((item) => !mismaLinea(item, productoId, varianteId));
        }
        return previos.map((item) => {
          if (!mismaLinea(item, productoId, varianteId)) return item;
          const variante = buscarVariantePorId(item.producto, varianteId);
          const tope = variante?.stock ?? CANTIDAD_MAXIMA;
          return { ...item, cantidad: limitarCantidad(cantidad, tope) };
        });
      });
    },
    [],
  );

  const vaciarCarrito = useCallback(() => {
    setItems([]);
    setCodigoCupon(null);
  }, []);

  const aplicarCupon = useCallback((codigo: string) => {
    const porcentaje = buscarPorcentajeCupon(codigo);
    if (porcentaje == null) return false;
    setCodigoCupon(codigo.trim().toUpperCase());
    return true;
  }, []);

  const quitarCupon = useCallback(() => setCodigoCupon(null), []);

  const porcentajeDescuento = codigoCupon ? buscarPorcentajeCupon(codigoCupon) ?? 0 : 0;
  const contador = items.reduce((acc, item) => acc + item.cantidad, 0);
  const resumen = useMemo(
    () => calcularResumenCompra(items, porcentajeDescuento),
    [items, porcentajeDescuento],
  );

  const valor = useMemo<ValorCarritoContext>(
    () => ({
      items,
      contador,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      aplicarCupon,
      quitarCupon,
    }),
    [
      items,
      contador,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      aplicarCupon,
      quitarCupon,
    ],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
