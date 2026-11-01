import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS } from '../_shared/cors.ts';

function respuestaJson(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return respuestaJson({ error: 'Método no permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('eliminar-cuenta: faltan secretos de Supabase en el entorno de la función.');
    return respuestaJson({ error: 'El servicio de eliminación no está configurado.' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return respuestaJson({ error: 'Se requiere una sesión válida.' }, 401);

  const clienteAutenticacion = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let usuarioId: string;
  try {
    const { data: { user }, error } = await clienteAutenticacion.auth.getUser(token);
    if (error || !user) return respuestaJson({ error: 'La sesión no es válida o expiró.' }, 401);
    usuarioId = user.id;
  } catch (error) {
    console.error('eliminar-cuenta: no se pudo validar la sesión.', error);
    return respuestaJson({ error: 'No se pudo validar la sesión. Inténtalo de nuevo.' }, 502);
  }

  const clienteAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { error: errorPedidos } = await clienteAdmin
      .from('pedidos')
      .update({ usuario_id: null, direccion_id: null })
      .eq('usuario_id', usuarioId);
    if (errorPedidos) {
      console.error('eliminar-cuenta: no se pudo anonimizar el historial de pedidos.', errorPedidos);
      return respuestaJson({ error: 'No se pudo completar la eliminación de la cuenta.' }, 500);
    }

    const { error } = await clienteAdmin.auth.admin.deleteUser(usuarioId);
    if (error) {
      console.error('eliminar-cuenta: Supabase rechazó la eliminación de la cuenta.', error);
      return respuestaJson({ error: 'No se pudo completar la eliminación de la cuenta.' }, 500);
    }
  } catch (error) {
    console.error('eliminar-cuenta: falló la solicitud de eliminación.', error);
    return respuestaJson({ error: 'No se pudo completar la eliminación de la cuenta.' }, 502);
  }

  return respuestaJson({ success: true });
});
