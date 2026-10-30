import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { servicioProductos } from '@/services/servicioProductos';
import type { Categoria, Producto } from '@/types';
import { esStockBajo, stockTotal } from '@/utils/variantes';

export type FiltroEstado = 'todos' | 'activos' | 'inactivos';

export function useAdminProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('todas');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [productosCargados, categoriasCargadas] = await Promise.all([
        servicioProductos.obtenerProductosAdmin(),
        servicioProductos.obtenerCategorias(),
      ]);
      setProductos(productosCargados);
      setCategorias(categoriasCargadas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return productos.filter((producto) => {
      if (
        termino &&
        !producto.nombre.toLowerCase().includes(termino) &&
        !producto.sku.toLowerCase().includes(termino)
      ) {
        return false;
      }
      if (categoriaId !== 'todas' && producto.categoriaId !== categoriaId) return false;
      if (estado === 'activos' && !producto.activo) return false;
      if (estado === 'inactivos' && producto.activo) return false;
      if (soloStockBajo && !producto.variantes.some((v) => esStockBajo(v.stock))) return false;
      return true;
    });
  }, [productos, busqueda, categoriaId, estado, soloStockBajo]);

  const alternarActivo = useCallback(
    async (id: string) => {
      // Se reemplaza solo esa fila en su lugar, sin recargar toda la lista:
      // así el producto no cambia de posición al activarlo o desactivarlo.
      // El cambio se ve al instante y se revierte si Supabase lo rechaza.
      const invertir = (previos: Producto[]) =>
        previos.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p));
      setProductos(invertir);
      try {
        const actualizado = await servicioProductos.alternarActivo(id);
        setProductos((previos) => previos.map((p) => (p.id === id ? actualizado : p)));
      } catch (err) {
        setProductos(invertir);
        setError(err instanceof Error ? err.message : 'No se pudo cambiar el estado del producto.');
      }
    },
    [],
  );

  return {
    productos: productosFiltrados,
    totalSinFiltrar: productos.length,
    categorias,
    cargando,
    error,
    busqueda,
    setBusqueda,
    categoriaId,
    setCategoriaId,
    estado,
    setEstado,
    soloStockBajo,
    setSoloStockBajo,
    alternarActivo,
    stockTotal,
  };
}
