import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { servicioNotificaciones } from '@/services/servicioNotificaciones';

const MS_LIMITE_RED = 3000;

function plataformaActual(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return 'web';
}

// Registra este dispositivo para recibir avisos de la cuenta que tiene la
// sesión iniciada. Ninguno de los dos métodos lanza error: las notificaciones
// remotas son un extra y no deben afectar el inicio ni el cierre de sesión.
export const servicioDispositivosPush = {
  async registrar(): Promise<void> {
    try {
      if (!supabase) return;
      const token = await servicioNotificaciones.obtenerTokenPush({ pedirPermiso: true });
      if (!token) return;

      const { error } = await supabase.rpc('registrar_dispositivo_push', {
        p_token: token,
        p_plataforma: plataformaActual(),
      });
      if (error) throw error;
    } catch (error) {
      console.warn('No se pudo registrar el dispositivo para notificaciones.', error);
    }
  },

  // Se llama antes de cerrar sesión (o al apagar las notificaciones), mientras
  // todavía hay sesión: así el teléfono deja de recibir avisos de esa cuenta.
  async eliminar(): Promise<void> {
    try {
      if (!supabase) return;
      const token = await servicioNotificaciones.obtenerTokenPush({ pedirPermiso: false });
      if (!token) return;

      const limite = new Promise<void>((resolver) => setTimeout(resolver, MS_LIMITE_RED));
      await Promise.race([supabase.rpc('eliminar_dispositivo_push', { p_token: token }), limite]);
    } catch (error) {
      console.warn('No se pudo quitar el dispositivo de notificaciones.', error);
    }
  },
};
