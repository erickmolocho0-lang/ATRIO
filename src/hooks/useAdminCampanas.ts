import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { servicioCampana } from '@/services/servicioCampana';
import type { CampanaAdmin, DatosCampana } from '@/types';

export function useAdminCampanas() {
  const [campanas, setCampanas] = useState<CampanaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setCampanas(await servicioCampana.obtenerTodas());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las campañas.');
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
    async (datos: DatosCampana, id?: string) => {
      setGuardando(true);
      try {
        if (id) await servicioCampana.actualizar(id, datos);
        else await servicioCampana.crear(datos);
        await recargar();
      } finally {
        setGuardando(false);
      }
    },
    [recargar],
  );

  // Igual que en productos: la fila cambia en su lugar, sin recargar la lista.
  const alternarActiva = useCallback(async (campana: CampanaAdmin) => {
    const actualizada = await servicioCampana.alternarActiva(campana.id, campana.activa);
    setCampanas((previas) => previas.map((c) => (c.id === actualizada.id ? actualizada : c)));
  }, []);

  const eliminar = useCallback(
    async (id: string) => {
      await servicioCampana.eliminar(id);
      await recargar();
    },
    [recargar],
  );

  return { campanas, cargando, error, guardando, guardar, alternarActiva, eliminar };
}
