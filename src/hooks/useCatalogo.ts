import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { servicioProductos, type OpcionesPaginaCatalogo } from '@/services/servicioProductos';
import type { Producto } from '@/types';

export type OrdenCatalogo = 'novedad' | 'precio' | 'popularidad';

export interface FiltrosCatalogo {
  tallas: string[];
  colores: string[];
  precioMax: number | null;
  soloDisponibles: boolean;
}

const FILTROS_INICIALES: FiltrosCatalogo = {
  tallas: [],
  colores: [],
  precioMax: null,
  soloDisponibles: false,
};

// Espera antes de consultar mientras se escribe en el buscador: ahora cada
// búsqueda es una consulta a Supabase, no un filtro en memoria.
const RETRASO_BUSQUEDA_MS = 300;

interface OpcionesUseCatalogo {
  categoriaInicial?: string;
}

export function useCatalogo({ categoriaInicial = 'todo' }: OpcionesUseCatalogo = {}) {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(categoriaInicial);
  const [orden, setOrden] = useState<OrdenCatalogo>('novedad');
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(FILTROS_INICIALES);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada cambio de filtros abre una "generación" nueva: las respuestas de
  // generaciones anteriores (que pueden llegar tarde) se descartan.
  const generacionRef = useRef(0);

  useEffect(() => {
    const temporizador = setTimeout(() => setBusquedaAplicada(terminoBusqueda.trim()), RETRASO_BUSQUEDA_MS);
    return () => clearTimeout(temporizador);
  }, [terminoBusqueda]);

  const opciones = useMemo<OpcionesPaginaCatalogo>(
    () => ({
      categoriaId: categoriaActiva,
      busqueda: busquedaAplicada,
      precioMax: filtros.precioMax,
      tallas: filtros.tallas,
      colores: filtros.colores,
      soloDisponibles: filtros.soloDisponibles,
      orden,
    }),
    [categoriaActiva, busquedaAplicada, filtros, orden],
  );

  // Cualquier cambio de filtros, búsqueda u orden vuelve a la página 1.
  useEffect(() => {
    generacionRef.current += 1;
    const generacion = generacionRef.current;
    setCargando(true);
    setCargandoMas(false);
    setError(null);
    servicioProductos
      .obtenerPaginaCatalogo({ ...opciones, pagina: 1 })
      .then((resultado) => {
        if (generacion !== generacionRef.current) return;
        setProductos(resultado.productos);
        setHayMas(resultado.hayMas);
        setTotal(resultado.total);
        setPagina(1);
      })
      .catch((err) => {
        if (generacion !== generacionRef.current) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
        setProductos([]);
        setHayMas(false);
        setTotal(0);
      })
      .finally(() => {
        if (generacion === generacionRef.current) setCargando(false);
      });
    return () => {
      generacionRef.current += 1;
    };
  }, [opciones]);

  const cargarMas = useCallback(() => {
    if (cargando || cargandoMas || !hayMas) return;
    const generacion = generacionRef.current;
    const siguiente = pagina + 1;
    setCargandoMas(true);
    servicioProductos
      .obtenerPaginaCatalogo({ ...opciones, pagina: siguiente })
      .then((resultado) => {
        if (generacion !== generacionRef.current) return;
        // Si el catálogo cambió entre páginas, se evita mostrar un producto dos veces.
        setProductos((actuales) => {
          const vistos = new Set(actuales.map((producto) => producto.id));
          return [...actuales, ...resultado.productos.filter((producto) => !vistos.has(producto.id))];
        });
        setHayMas(resultado.hayMas);
        setTotal(resultado.total);
        setPagina(siguiente);
      })
      .catch((err) => {
        if (generacion !== generacionRef.current) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar más productos.');
      })
      .finally(() => {
        if (generacion === generacionRef.current) setCargandoMas(false);
      });
  }, [cargando, cargandoMas, hayMas, pagina, opciones]);

  return {
    terminoBusqueda,
    setTerminoBusqueda,
    categoriaActiva,
    setCategoriaActiva,
    orden,
    setOrden,
    filtros,
    setFiltros,
    reiniciarFiltros: () => setFiltros(FILTROS_INICIALES),
    productosVisibles: productos,
    contadorResultados: total,
    hayMas,
    cargarMas,
    cargando,
    cargandoMas,
    error,
  };
}
