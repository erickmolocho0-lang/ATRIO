import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { servicioCatalogoAdmin, type DatosCategoria } from '@/services/servicioCatalogoAdmin';
import { servicioProductos } from '@/services/servicioProductos';
import type { Categoria } from '@/types';

export function useAdminCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCategorias(await servicioProductos.obtenerCategorias());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorías.');
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  /** Crea si no hay id; si hay, edita. Lanza el error para que el formulario lo muestre. */
  const guardar = useCallback(
    async (datos: DatosCategoria, id?: string) => {
      setGuardando(true);
      try {
        if (id) await servicioCatalogoAdmin.editarCategoria(id, datos);
        else await servicioCatalogoAdmin.crearCategoria(datos);
        await recargar();
      } finally {
        setGuardando(false);
      }
    },
    [recargar],
  );

  const eliminar = useCallback(
    async (id: string) => {
      await servicioCatalogoAdmin.eliminarCategoria(id);
      await recargar();
    },
    [recargar],
  );

  return { categorias, cargando, error, guardando, guardar, eliminar };
}
