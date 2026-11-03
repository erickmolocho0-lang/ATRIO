import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { servicioEntregas } from '@/services/servicioEntregas';
import type { ConfiguracionEntregas } from '@/types/Entrega';

export function useCoberturaEntrega() {
  const [datos, setDatos] = useState<ConfiguracionEntregas>({ modalidades: [], zonas: [] });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try { setDatos(await servicioEntregas.obtenerCobertura()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo consultar la cobertura.'); }
    finally { setCargando(false); }
  }, []);
  useFocusEffect(useCallback(() => { let actual = true;
    servicioEntregas.obtenerCobertura().then((c) => { if (actual) { setDatos(c); setError(null); } })
      .catch((err) => { if (actual) setError(err instanceof Error ? err.message : 'No se pudo consultar la cobertura.'); })
      .finally(() => { if (actual) setCargando(false); });
    return () => { actual = false; };
  }, []));
  return { ...datos, cargando, error, recargar };
}
