import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { servicioCupones } from '@/services/servicioCupones';
import { servicioCarrito } from '@/services/servicioCarrito';
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
  limpiarCompraConfirmada: () => void;
  sincronizarCarrito: () => Promise<void>;
  aplicarCupon: (codigo: string) => Promise<boolean>;
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

export function CarritoProvider({ children }: { children: ReactNode }) {
  const { usuario, listo } = useAuth();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [codigoCupon, setCodigoCupon] = useState<string | null>(null);
  const [cuponValidado, setCuponValidado] = useState<{ codigo: string; porcentaje: number } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [usuarioCargado, setUsuarioCargado] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!listo) return;
    let cancelado = false;
    async function cargar() {
      try {
        if (usuario) {
          const itemsReales = await servicioCarrito.obtenerItems();
          if (!cancelado) { setItems(itemsReales); setError(null); }
        } else {
          const guardado = await servicioAlmacenamiento.obtenerDato<EstadoCarritoPersistido>(
            CLAVES_ALMACENAMIENTO.carrito,
          );
          if (!cancelado) {
            setError(null);
            setItems(lineasValidas(guardado?.items ?? []));
            setCodigoCupon(guardado?.codigoCupon ?? null);
          }
        }
      } catch (err) {
        if (!cancelado) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el carrito.');
        }
      } finally {
        if (!cancelado) { setUsuarioCargado(usuario?.id ?? null); setCargando(false); }
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [usuario, listo]);

  useEffect(() => {
    if (!listo || usuario || cargando || usuarioCargado !== null) return;
    const aPersistir: EstadoCarritoPersistido = { items, codigoCupon };
    void servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.carrito, aPersistir);
  }, [items, codigoCupon, usuario, listo, cargando, usuarioCargado]);

  const persistir = useCallback((operacion: Promise<void>, alFallar: (err: unknown) => void) => {
    setPendientes((n) => n + 1);
    void operacion.catch(alFallar).finally(() => setPendientes((n) => n - 1));
  }, []);
  const sincronizarCarrito = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    try { setItems(await servicioCarrito.obtenerItems()); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito.'); }
    finally { setCargando(false); }
  }, [usuario]);

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

      persistir(servicioCarrito.fijarCantidad(varianteId, nuevaCantidad), (err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo agregar al carrito.');
      });
    },
    [items, usuario, persistir],
  );

  const quitarItem = useCallback(
    (productoId: string, varianteId: string) => {
      const previos = items;
      setItems(previos.filter((item) => !mismaLinea(item, productoId, varianteId)));
      setError(null);
      if (!usuario) return;

      persistir(servicioCarrito.quitarItem(varianteId), (err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo quitar el producto.');
      });
    },
    [items, usuario, persistir],
  );

  const cambiarCantidad = useCallback(
    (productoId: string, varianteId: string, cantidad: number) => {
      const previos = items;

      if (cantidad < CANTIDAD_MINIMA) {
        setItems(previos.filter((item) => !mismaLinea(item, productoId, varianteId)));
        setError(null);
        if (usuario) {
          persistir(servicioCarrito.quitarItem(varianteId), (err) => {
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

      persistir(servicioCarrito.fijarCantidad(varianteId, cantidadFinal), (err) => {
        setItems(previos);
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito.');
      });
    },
    [items, usuario, persistir],
  );

  const vaciarCarrito = useCallback(() => {
    const previos = items;
    setItems([]);
    setCodigoCupon(null);
    setError(null);
    if (!usuario) return;

    persistir(servicioCarrito.vaciar(), (err) => {
      setItems(previos);
      setError(err instanceof Error ? err.message : 'No se pudo vaciar el carrito.');
    });
  }, [items, usuario, persistir]);

  // confirmar_compra ya vacio el carrito en servidor. No borrar prendas nuevas agregadas durante el pago.
  const limpiarCompraConfirmada = useCallback(() => {
    setItems([]); setCodigoCupon(null); setCuponValidado(null); setError(null);
  }, []);

  const aplicarCupon = useCallback(async (codigo: string) => {
    const validado = await servicioCupones.validar(codigo);
    setCuponValidado(validado);
    setCodigoCupon(validado.codigo);
    return true;
  }, []);

  const quitarCupon = useCallback(() => setCodigoCupon(null), []);

  useEffect(() => {
    if (!codigoCupon || !usuario) return;
    let actual = true;
    servicioCupones.validar(codigoCupon).then((c) => { if (actual) setCuponValidado(c); })
      .catch(() => { if (actual) setCuponValidado(null); });
    return () => { actual = false; };
  }, [codigoCupon, usuario, items]);

  const porcentajeDescuento = cuponValidado?.codigo === codigoCupon ? cuponValidado.porcentaje : 0;
  const contador = items.reduce((acc, item) => acc + item.cantidad, 0);
  const resumen = useMemo(
    () => calcularResumenCompra(items, porcentajeDescuento),
    [items, porcentajeDescuento],
  );

  const valor = useMemo<ValorCarritoContext>(
    () => ({
      items,
      contador,
      cargando: cargando || pendientes > 0 || !listo || usuarioCargado !== (usuario?.id ?? null),
      error,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      limpiarCompraConfirmada,
      sincronizarCarrito,
      aplicarCupon,
      quitarCupon,
    }),
    [
      items,
      contador,
      cargando,
      pendientes,
      usuarioCargado,
      usuario?.id,
      listo,
      error,
      codigoCupon,
      porcentajeDescuento,
      resumen,
      agregarItem,
      quitarItem,
      cambiarCantidad,
      vaciarCarrito,
      limpiarCompraConfirmada,
      sincronizarCarrito,
      aplicarCupon,
      quitarCupon,
    ],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}
