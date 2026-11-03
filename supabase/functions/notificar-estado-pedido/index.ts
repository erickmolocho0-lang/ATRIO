// Envía una notificación push al cliente cuando cambia el estado de su pedido.
//
// La llama la base de datos (trigger de historial_estados_pedido), no la app:
// no hay sesión de usuario. La seguridad es el secreto compartido en la
// cabecera x-webhook-secret (secreto de la función: PUSH_WEBHOOK_SECRET).
//
// Secretos: PUSH_WEBHOOK_SECRET (obligatorio) y EXPO_ACCESS_TOKEN (opcional,
// solo si el proyecto de Expo tiene activada la seguridad mejorada de push).

import { createClient } from 'npm:@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

// Texto por estado. Los estados son los de pedidos.estado.
const MENSAJES: Record<string, (numero: string) => string> = {
  pendiente_pago: (n) => `Tu pedido ${n} está pendiente de pago.`,
  preparado: (n) => `Tu pedido ${n} cambió a "Preparado".`,
  en_camino: (n) => `Tu pedido ${n} va en camino.`,
  entregado: (n) => `Tu pedido ${n} fue entregado.`,
  cancelado: (n) => `Tu pedido ${n} fue cancelado.`,
  devuelto: (n) => `Tu pedido ${n} figura como devuelto.`,
};

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Comparación en tiempo constante para no filtrar el secreto por tiempos.
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405);

  const esperado = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const recibido = req.headers.get('x-webhook-secret') ?? '';
  if (!esperado || !iguales(recibido, esperado)) return respuesta({ error: 'No autorizado.' }, 401);

  let datos: { usuario_id?: unknown; numero?: unknown; estado_nuevo?: unknown };
  try {
    datos = await req.json();
  } catch {
    return respuesta({ error: 'Cuerpo inválido.' }, 400);
  }
  const { usuario_id, numero, estado_nuevo } = datos;
  if (typeof usuario_id !== 'string' || typeof numero !== 'string' || typeof estado_nuevo !== 'string') {
    return respuesta({ error: 'Faltan datos del pedido.' }, 400);
  }
  const mensaje = MENSAJES[estado_nuevo];
  if (!mensaje) return respuesta({ enviados: 0, motivo: 'Estado sin mensaje.' });

  // Con la clave de servicio: la tabla dispositivos_push no es legible desde la app.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: dispositivos, error } = await supabase
    .from('dispositivos_push')
    .select('token')
    .eq('usuario_id', usuario_id);
  if (error) return respuesta({ error: 'No se pudieron leer los dispositivos.' }, 500);
  if (!dispositivos || dispositivos.length === 0) return respuesta({ enviados: 0 });

  const mensajes = dispositivos.map((dispositivo) => ({
    to: dispositivo.token,
    title: 'ATRIO',
    body: mensaje(numero),
    data: { numero },
    sound: 'default',
    channelId: 'default',
  }));

  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const tokenExpo = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (tokenExpo) cabeceras.Authorization = `Bearer ${tokenExpo}`;

  const res = await fetch(EXPO_PUSH, { method: 'POST', headers: cabeceras, body: JSON.stringify(mensajes) });
  if (!res.ok) return respuesta({ error: 'Expo rechazó el envío.' }, 502);
  const cuerpo = await res.json();

  // Un token que Expo ya no reconoce (app desinstalada) se borra para no reintentar.
  const tickets: Array<{ status: string; details?: { error?: string } }> = cuerpo.data ?? [];
  const invalidos = tickets.flatMap((ticket, i) =>
    ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? [dispositivos[i].token] : [],
  );
  if (invalidos.length > 0) await supabase.from('dispositivos_push').delete().in('token', invalidos);

  return respuesta({ enviados: dispositivos.length - invalidos.length });
});
