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
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState('todas');
  const [estado, setEstado] = useState<FiltroEstado>('todos');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const recargar = useCallback(async () => {
    const [productosCargados, categoriasCargadas] = await Promise.all([
      servicioProductos.obtenerProductos(),
      servicioProductos.obtenerCategorias(),
    ]);
    setProductos(productosCargados);
    setCategorias(categoriasCargadas);
    setCargando(false);
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
      await servicioProductos.alternarActivo(id);
      await recargar();
    },
    [recargar],
  );

  return {
    productos: productosFiltrados,
    totalSinFiltrar: productos.length,
    categorias,
    cargando,
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
