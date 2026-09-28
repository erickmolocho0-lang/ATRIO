import { useEffect, useState } from 'react';
import { servicioProductos } from '@/services/servicioProductos';
import type { Categoria } from '@/types';

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    let cancelado = false;
    servicioProductos.obtenerCategorias().then((categoriasCargadas) => {
      if (!cancelado) setCategorias(categoriasCargadas);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return categorias;
}
