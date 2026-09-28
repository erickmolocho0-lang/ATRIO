import { useCallback, useEffect, useState } from 'react';
import { servicioReportes } from '@/services/servicioReportes';
import type { ReporteVentas } from '@/types';

export function useReportes() {
  const [usarEjemplo, setUsarEjemplo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [version, setVersion] = useState(0);

  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    servicioReportes
      .obtenerReporte({ conEjemplo: usarEjemplo })
      .then((obtenido) => {
        if (!cancelado) setReporte(obtenido);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usarEjemplo, version]);

  return { cargando, error, reporte, usarEjemplo, setUsarEjemplo, recargar };
}