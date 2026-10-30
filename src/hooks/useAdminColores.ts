import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { servicioCatalogoAdmin, type DatosColor } from '@/services/servicioCatalogoAdmin';
import type { ColorProducto } from '@/types';

export function useAdminColores() {
  const [colores, setColores] = useState<ColorProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setColores(await servicioCatalogoAdmin.obtenerColores());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los colores.');
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
    async (datos: DatosColor, id?: string) => {
      setGuardando(true);
      try {
        if (id) await servicioCatalogoAdmin.editarColor(id, datos);
        else await servicioCatalogoAdmin.crearColor(datos);
        await recargar();
      } finally {
        setGuardando(false);
      }
    },
    [recargar],
  );

  const eliminar = useCallback(
    async (id: string) => {
      await servicioCatalogoAdmin.eliminarColor(id);
      await recargar();
    },
    [recargar],
  );

  return { colores, cargando, error, guardando, guardar, eliminar };
}
