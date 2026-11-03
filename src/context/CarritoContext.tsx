import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cupones } from '@/data/cupones';
import { servicioCarrito } from '@/services/servicioCarrito';
import { servicioProductos } from '@/services/servicioProductos';
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
  cargando: boolean;
  error: string | null;
  codigoCupon: string | null;
  porcentajeDescuento: number;
  resumen: ResumenCompra;
  agregarItem: (producto: Producto, varianteId: string, cantidad?: number) => void;
  quitarItem: (productoId: string, varianteId: string) => void;
  cambiarCantidad: (productoId: string, varianteId: string, cantidad: number) => void;
  vaciarCarrito: () => void;
  aplicarCupon: (codigo: string) => boolean;
  quitarCupon: () => void;
  /** Vuelve a leer los productos del carrito (activo, precio, variantes) sin mostrar "cargando". */
  sincronizarCarrito: () => Promise<void>;
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
  const { usuario, listo } = useAuth();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [codigoCupon, setCodigoCupon] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listo) return;
    let cancelado = false;
    setCargando(true);
    setError(null);

    async function cargar() {
      try {
        if (usuario) {
          const itemsReales = await servicioCarrito.obtenerItems();
          if (!cancelado) setItems(itemsReales);
        } else {
          const guardado = await servicioAlmacenamiento.obtenerDato<EstadoCarritoPersistido>(
            CLAVES_ALMACENAMIENTO.carrito,
          );
          if (!cancelado) {
            setItems(lineasValidas(guardado?.items ?? []));
            setCodigoCupon(guardado?.codigoCupon ?? null);
          }
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el carrito.');
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [usuario, listo]);

  useEffect(() => {
    if (!listo || usuario || cargando) return;
    const aPersistir: EstadoCarritoPersistido = { items, codigoCupon };
    void servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.carrito, aPersistir);
  }, [items, codigoCupon, usuario, listo, cargando]);

  // Los ítems se leen desde una ref para que sincronizarCarrito no cambie en
  // cada render: la pantalla la llama al enfocarse y, si dependiera de
  // `items`, cada refresco volvería a disparar otro refresco.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Refresco silencioso: no toca `cargando` ni `error`. Si falla la red, el
  // carrito se queda como estaba (el checkout vuelve a validar igual).
  const sincronizarCarrito = useCallback(async () => {
    if (!listo || cargando) return;
    try {
      if (usuario) {
        setItems(await servicioCarrito.obtenerItems());
        return;
      }

      // Invitado: el carrito vive en el dispositivo con una copia de cada
      // producto; se reemplaza esa copia por la versión actual (activo,
      // precio y variantes). obtenerProductoPorId no filtra inactivos.
      const ids = [...new Set(itemsRef.current.map((item) => item.producto.id))];
      if (ids.length === 0) return;
      const frescos = await Promise.all(ids.map((id) => servicioProductos.obtenerProductoPorId(id)));
      const porId = new Map<string, Producto>();
      for (const producto of frescos) {
        if (producto) porId.set(producto.id, producto);
      }
      setItems((actuales) =>
        lineasValidas(
          actuales.map((item) => {
            const actual = porId.get(item.producto.id);
            return actual ? { ...item, producto: actual } : item;
          }),
        ),
      );
    } catch (err) {
      console.warn('CarritoContext: no se pudo refrescar el carrito.', err);
    }
  }, [usuario, listo, cargando]);

  const agregarItem = useCallback(
    (producto: Producto, varianteId: string, cantidad = 1) => {
      const variante = buscarVariantePorId(producto, varianteId);
      if (!variante || variante.stock <= 0) return;

      const previos = items;
      const existente = previos.find((item) => mismaLinea(item, producto.id, varianteId));
      const nuevaCantidad = limitarCantidad((existente?.cantidad ?? 0) + cantidad, variante.stock);

      const siguientes = existente
        ? previos.map((item) =>
            mismaLinea(item, producto.id, varianteId) ? { ...item, cantidad: nuevaCantidad } : item,
          )
        : [
            ...previos,
            { producto, varianteId, talla: variante.talla, colorId: variante.colorId, cantidad: nuevaCantidad },
          ];

      setItems(siguientes);
      setError(null);
      if (!usuario) return;

      servicioCarrito.fijarCantidad(varianteId, nuevaCantidad).catch((err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
      });
    },
    [items, usuario],
  );

  const quitarItem = useCallback(
    (productoId: string, varianteId: string) => {
      const previos = items;
      setItems(previos.filter((item) => !mismaLinea(item, productoId, varianteId)));
      setError(null);
      if (!usuario) return;

      servicioCarrito.quitarItem(varianteId).catch((err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo quitar el producto.');
      });
    },
    [items, usuario],
  );

  const cambiarCantidad = useCallback(
    (productoId: string, varianteId: string, cantidad: number) => {
      const previos = items;

      if (cantidad < CANTIDAD_MINIMA) {
        setItems(previos.filter((item) => !mismaLinea(item, productoId, varianteId)));
        setError(null);
        if (usuario) {
          servicioCarrito.quitarItem(varianteId).catch((err) => {
            setItems(previos);
            setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito.');
          });
        }
        return;
      }

      let cantidadFinal = cantidad;
      const siguientes = previos.map((item) => {
        if (!mismaLinea(item, productoId, varianteId)) return item;
        const variante = buscarVariantePorId(item.producto, varianteId);
        const tope = variante?.stock ?? CANTIDAD_MAXIMA;
        cantidadFinal = limitarCantidad(cantidad, tope);
        return { ...item, cantidad: cantidadFinal };
      });

      setItems(siguientes);
      setError(null);
      if (!usuario) return;

      servicioCarrito.fijarCantidad(varianteId, cantidadFinal).catch((err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito.');
      });
    },
    [items, usuario],
  );

  const vaciarCarrito = useCallback(() => {
    const previos = items;
    setItems([]);
    setCodigoCupon(null);
    setError(null);
    if (!usuario) return;

    servicioCarrito.vaciar().catch((err) => {
      setItems(previos);
      setError(err instanceof Error ? err.message : 'No se pudo vaciar el carrito.');
    });
  }, [items, usuario]);

  const aplicarCupon = useCallback((codigo: string) => {
    const porcentaje = buscarPorcentajeCupon(codigo);
    if (porcentaje == null) return false;
    setCodigoCupon(codigo.trim().toUpperCase());
    return true;
  }, []);

  const quitarCupon = useCallback(() => setCodigoCupon(null), []);

  const porcentajeDescuento = codigoCupon ? buscarPorcentajeCupon(codigoCupon) ?? 0 : 0;
  const contador = items.reduce((acc, item) => acc + item.cantidad, 0);
  // Los productos desactivados no se pueden comprar: no suman al total.
  const resumen = useMemo(
    () => calcularResumenCompra(items.filter((item) => item.producto.activo !== false), porcentajeDescuento),
    [items, porcentajeDescuento],
  );

  const valor = useMemo<ValorCarritoContext>(
    () => ({
      items,
      contador,
      cargando,
      error,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      aplicarCupon,
      quitarCupon,
      sincronizarCarrito,
    }),
    [
      items,
      contador,
      cargando,
      error,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      aplicarCupon,
      quitarCupon,
      sincronizarCarrito,
    ],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
