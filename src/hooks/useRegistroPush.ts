import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { servicioDispositivosPush } from '@/services/servicioDispositivosPush';

// Mantiene al día los avisos remotos: con sesión iniciada y las notificaciones
// activadas en Configuración, este dispositivo queda registrado; si se apagan,
// se quita. Se espera a que las preferencias se hayan leído del teléfono para
// no registrar y borrar de inmediato a quien las tenía apagadas.
export function useRegistroPush() {
  const { usuario } = useAuth();
  const { preferencias, hidratado } = useConfiguracion();
  const usuarioId = usuario?.id;
  const activadas = preferencias.notificaciones;

  useEffect(() => {
    if (!usuarioId || !hidratado) return;
    if (activadas) void servicioDispositivosPush.registrar();
    else void servicioDispositivosPush.eliminar();
  }, [usuarioId, activadas, hidratado]);
}
