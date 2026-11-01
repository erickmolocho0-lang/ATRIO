import { supabase } from '@/lib/supabase';
import type { DatosPerfil } from '@/utils/perfil';

function requerirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

// Las políticas RLS de `perfiles` solo dejan actualizar la fila propia, y el
// trigger trg_perfiles_evitar_cambio_rol impide cambiar el rol. Si una
// actualización no toca ninguna fila (RLS la descartó en silencio), se avisa.
export const servicioPerfil = {
  async obtenerAceptaPromociones(usuarioId: string): Promise<boolean> {
    const { data, error } = await requerirSupabase()
      .from('perfiles')
      .select('acepta_promociones')
      .eq('id', usuarioId)
      .maybeSingle();
    if (error) throw error;
    return data?.acepta_promociones === true;
  },

  async actualizarAceptaPromociones(usuarioId: string, valor: boolean): Promise<void> {
    const { data, error } = await requerirSupabase()
      .from('perfiles')
      .update({ acepta_promociones: valor })
      .eq('id', usuarioId)
      .select('acepta_promociones')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se pudo guardar tu preferencia.');
  },

  async actualizarDatos(usuarioId: string, datos: DatosPerfil): Promise<void> {
    const { data, error } = await requerirSupabase()
      .from('perfiles')
      .update({ nombre: datos.nombre, telefono: datos.celular })
      .eq('id', usuarioId)
      .select('nombre')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No se pudo guardar tu perfil.');
  },
};
