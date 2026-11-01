import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';
import type { MetodoPago } from '@/types';

export interface PreferenciasConfiguracion {
  notificaciones: boolean;
  modoOscuro: boolean;
  biometria: boolean;
  // Qué método aparece marcado en /pago. Nunca datos de tarjeta.
  metodoPagoPreferido: MetodoPago | null;
}

const PREFERENCIAS_INICIALES: PreferenciasConfiguracion = {
  notificaciones: true,
  modoOscuro: false,
  biometria: false,
  metodoPagoPreferido: null,
};

interface ValorConfiguracionContext {
  preferencias: PreferenciasConfiguracion;
  hidratado: boolean;
  alternarPreferencia: (clave: keyof PreferenciasConfiguracion) => void;
  elegirMetodoPagoPreferido: (metodo: MetodoPago | null) => void;
}

export const ConfiguracionContext = createContext<ValorConfiguracionContext | null>(null);

export function ConfiguracionProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasConfiguracion>(PREFERENCIAS_INICIALES);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    servicioAlmacenamiento
      .obtenerDato<PreferenciasConfiguracion>(CLAVES_ALMACENAMIENTO.preferenciasConfiguracion)
      .then((guardadas) => {
        if (guardadas) setPreferencias({ ...PREFERENCIAS_INICIALES, ...guardadas });
      })
      .finally(() => setHidratado(true));
  }, []);

  useEffect(() => {
    if (hidratado) {
      void servicioAlmacenamiento.guardarDato(
        CLAVES_ALMACENAMIENTO.preferenciasConfiguracion,
        preferencias,
      );
    }
  }, [preferencias, hidratado]);

  const alternarPreferencia = useCallback((clave: keyof PreferenciasConfiguracion) => {
    setPreferencias((previas) => ({ ...previas, [clave]: !previas[clave] }));
  }, []);

  const elegirMetodoPagoPreferido = useCallback((metodo: MetodoPago | null) => {
    setPreferencias((previas) => ({ ...previas, metodoPagoPreferido: metodo }));
  }, []);

  const valor = useMemo<ValorConfiguracionContext>(
    () => ({ preferencias, hidratado, alternarPreferencia, elegirMetodoPagoPreferido }),
    [preferencias, hidratado, alternarPreferencia, elegirMetodoPagoPreferido],
  );

  return (
    <ConfiguracionContext.Provider value={valor}>{children}</ConfiguracionContext.Provider>
  );
}