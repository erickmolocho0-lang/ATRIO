import { useContext, useEffect, useState } from 'react';
import { FavoritosContext } from '@/context/FavoritosContext';
import { servicioProductos } from '@/services/servicioProductos';
import type { Producto } from '@/types';

export function useFavoritos() {
  const contexto = useContext(FavoritosContext);
  if (!contexto) {
    throw new Error('useFavoritos debe usarse dentro de <FavoritosProvider>');
  }

  const [productosFavoritos, setProductosFavoritos] = useState<Producto[]>([]);
  const { idsFavoritos } = contexto;

  useEffect(() => {
    let cancelado = false;
    Promise.all(idsFavoritos.map((id) => servicioProductos.obtenerProductoPorId(id))).then(
      (resultados) => {
        if (cancelado) return;
        setProductosFavoritos(
          resultados.filter((producto): producto is Producto => producto !== undefined),
        );
      },
    );
    return () => {
      cancelado = true;
    };
  }, [idsFavoritos]);

  return { ...contexto, productosFavoritos };
}
