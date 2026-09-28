import { useEffect, useMemo, useState } from 'react';
import { servicioProductos } from '@/services/servicioProductos';
import type { Producto } from '@/types';
import { stockTotal } from '@/utils/variantes';

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

const ITEMS_POR_PAGINA = 20;

interface OpcionesUseCatalogo {
  categoriaInicial?: string;
}

export function useCatalogo({ categoriaInicial = 'todo' }: OpcionesUseCatalogo = {}) {
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(categoriaInicial);
  const [orden, setOrden] = useState<OrdenCatalogo>('novedad');
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);

  const [todos, setTodos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    servicioProductos.obtenerProductos().then((productos) => {
      if (!cancelado) {
        setTodos(productos);
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const productosFiltrados = useMemo<Producto[]>(() => {
    const termino = terminoBusqueda.trim().toLowerCase();

    let lista = todos.filter((producto) => {
      if (categoriaActiva !== 'todo' && producto.categoriaId !== categoriaActiva) return false;
      if (
        termino &&
        !producto.nombre.toLowerCase().includes(termino) &&
        !producto.categoriaNombre.toLowerCase().includes(termino)
      ) {
        return false;
      }
      if (filtros.soloDisponibles && stockTotal(producto) <= 0) return false;
      if (filtros.precioMax != null && producto.precio > filtros.precioMax) return false;
      if (
        filtros.tallas.length > 0 &&
        !producto.variantes.some((v) => v.stock > 0 && filtros.tallas.includes(v.talla))
      ) {
        return false;
      }
      if (
        filtros.colores.length > 0 &&
        !producto.variantes.some((v) => v.stock > 0 && filtros.colores.includes(v.colorId))
      ) {
        return false;
      }
      return true;
    });

    lista = [...lista].sort((a, b) => {
      if (orden === 'precio') return a.precio - b.precio;
      if (orden === 'popularidad') return b.popularidad30d - a.popularidad30d;
      return b.fechaAlta.localeCompare(a.fechaAlta);
    });

    return lista;
  }, [todos, categoriaActiva, terminoBusqueda, orden, filtros]);

  useEffect(() => {
    setPagina(1);
  }, [categoriaActiva, terminoBusqueda, orden, filtros]);

  const productosVisibles = productosFiltrados.slice(0, pagina * ITEMS_POR_PAGINA);
  const hayMas = productosVisibles.length < productosFiltrados.length;

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
    productosVisibles,
    contadorResultados: productosFiltrados.length,
    hayMas,
    cargarMas: () => setPagina((actual) => actual + 1),
    cargando,
  };
}
