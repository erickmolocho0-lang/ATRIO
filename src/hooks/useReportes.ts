import { useCallback, useEffect, useMemo, useState } from 'react';
import { servicioReportes } from '@/services/servicioReportes';
import {
  calcularRango,
  construirRangoPersonalizado,
  formatearRango,
  type PresetRango,
  type RangoFechas,
} from '@/utils/rangoFechas';
import type { ReporteVentas } from '@/types';

export function useReportes() {
  const [usarEjemploActivado, setUsarEjemplo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteVentas | null>(null);
  const [version, setVersion] = useState(0);

  const [preset, setPreset] = useState<PresetRango>('mes');
  const [rangoPersonalizado, setRangoPersonalizado] = useState<RangoFechas | null>(null);
  const [errorRango, setErrorRango] = useState<string | null>(null);

  // Los datos de ejemplo son solo para desarrollo: en una app publicada nunca
  // se mezclan con ventas reales.
  const usarEjemplo = __DEV__ && usarEjemploActivado;

  // Se recalcula al recargar, para que "Hoy" no quede fijo si la app pasa la medianoche abierta.
  const rango = useMemo<RangoFechas>(() => {
    if (preset === 'personalizado' && rangoPersonalizado) return rangoPersonalizado;
    return calcularRango(preset === 'personalizado' ? 'mes' : preset);
  }, [preset, rangoPersonalizado, version]);

  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  const seleccionarPreset = useCallback((nuevo: PresetRango) => {
    setErrorRango(null);
    setPreset(nuevo);
  }, []);

  const aplicarRangoPersonalizado = useCallback((desdeTexto: string, hastaTexto: string) => {
    const resultado = construirRangoPersonalizado(desdeTexto, hastaTexto);
    if ('error' in resultado) {
      setErrorRango(resultado.error);
      return;
    }
    setErrorRango(null);
    setRangoPersonalizado(resultado.rango);
    setPreset('personalizado');
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError(null);

    servicioReportes
      .obtenerReporte({ conEjemplo: usarEjemplo, rango })
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
  }, [usarEjemplo, rango]);

  return {
    cargando,
    error,
    reporte,
    usarEjemplo,
    setUsarEjemplo,
    recargar,
    preset,
    seleccionarPreset,
    rango,
    etiquetaRango: formatearRango(rango),
    aplicarRangoPersonalizado,
    errorRango,
  };
}
