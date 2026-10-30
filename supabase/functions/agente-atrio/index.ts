import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS_HEADERS } from '../_shared/cors.ts';
import { construirDefinicionesTools, EJECUTORES, type ContextoAgente } from './tools.ts';
import { llamarOpenAI, type MensajeOpenAI } from './openai.ts';

const MAX_ITERACIONES_TOOLS = 4;
const MAX_TURNOS_HISTORIAL = 6;

const SYSTEM_PROMPT = `Te llamas Luna y eres la asistente virtual de ATRIO, una tienda de ropa.

Ayudas a los clientes a encontrar productos, consultar precios, colores, tallas, stock y sus pedidos.

Utiliza las herramientas disponibles siempre que necesites información real del negocio.

Nunca inventes:
- productos;
- precios;
- stock;
- tallas;
- colores;
- pedidos;
- estados.

Si no puedes consultar un dato, indícalo claramente.

No reveles información de otros usuarios.

No ejecutes compras, pagos, cambios de stock ni otras operaciones administrativas.

Responde de manera breve, clara y amable.`;

interface CuerpoSolicitud {
  mensaje?: unknown;
  historial?: unknown;
  origen?: unknown;
}

function respuestaJson(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function historialValido(valor: unknown): { rol: 'usuario' | 'asistente'; texto: string }[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter(
      (m): m is { rol: string; texto: string } =>
        !!m && typeof m === 'object' && (m as { rol?: unknown }).rol !== undefined && typeof (m as { texto?: unknown }).texto === 'string',
    )
    .filter((m) => m.rol === 'usuario' || m.rol === 'asistente')
    .slice(-MAX_TURNOS_HISTORIAL)
    .map((m) => ({ rol: m.rol as 'usuario' | 'asistente', texto: m.texto.slice(0, 1000) }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return respuestaJson({ error: 'Método no permitido.' }, 405);

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!openaiApiKey || !supabaseUrl || !supabaseAnonKey) {
    console.error('agente-atrio: faltan secretos (OPENAI_API_KEY / SUPABASE_URL / SUPABASE_ANON_KEY).');
    return respuestaJson({ error: 'El asistente no está configurado correctamente. Intenta más tarde.' }, 500);
  }

  let cuerpo: CuerpoSolicitud;
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaJson({ error: 'Cuerpo de la solicitud inválido.' }, 400);
  }

  const mensajeUsuario = typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje.trim() : '';
  if (!mensajeUsuario) return respuestaJson({ error: 'El mensaje no puede estar vacío.' }, 400);
  if (mensajeUsuario.length > 1000) return respuestaJson({ error: 'El mensaje es demasiado largo.' }, 400);

  const origen = cuerpo.origen === 'catalogo' ? 'catalogo' : 'inicio';
  const historial = historialValido(cuerpo.historial);

  // Todo lo que sigue puede fallar de formas inesperadas (red, GoTrue,
  // OpenAI) y SIEMPRE debe volver como JSON con headers CORS — un throw sin
  // capturar aquí devolvería el error crudo de Deno sin
  // Access-Control-Allow-Origin, lo que rompe el fetch en Web aunque la
  // causa real no tenga nada que ver con CORS.
  try {
    // Cliente "de usuario": se crea reenviando el header Authorization tal
    // cual llega (token del usuario logueado, o la anon key si es
    // anónimo/invitado). Así todas las consultas de las tools respetan RLS
    // exactamente igual que el cliente React Native — nunca se usa
    // service_role aquí. Un invitado sin sesión SIEMPRE llega con al menos
    // la anon key como Bearer (así lo manda supabase-js), así que
    // usuarioId queda null pero la solicitud sigue siendo válida: no se
    // bloquea todo el asistente por no tener sesión.
    const authHeader = req.headers.get('Authorization') ?? `Bearer ${supabaseAnonKey}`;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    let usuarioId: string | null = null;
    try {
      const { data: datosUsuario } = await supabase.auth.getUser();
      usuarioId = datosUsuario.user?.id ?? null;
    } catch (err) {
      // Token inválido/expirado o falla de red hacia GoTrue: se degrada a
      // invitado en vez de tumbar la respuesta completa.
      console.error('agente-atrio: no se pudo resolver el usuario, se trata como invitado.', err);
    }

    let esAdmin = false;
    if (usuarioId) {
      try {
        const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', usuarioId).maybeSingle();
        esAdmin = (perfil as { rol?: string } | null)?.rol === 'administrador';
      } catch (err) {
        console.error('agente-atrio: no se pudo leer el rol del perfil, se trata como cliente.', err);
      }
    }

    const ctx: ContextoAgente = { supabase, usuarioId, esAdmin };
    const tools = construirDefinicionesTools({ usuarioId, esAdmin });

    const mensajes: MensajeOpenAI[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nContexto: el usuario ${usuarioId ? 'está autenticado' : 'NO está autenticado (invitado)'}. Pantalla de origen: ${origen}.`,
      },
      ...historial.map((m): MensajeOpenAI => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
      { role: 'user', content: mensajeUsuario },
    ];

    let ultimosProductos: unknown[] | undefined;

    for (let iteracion = 0; iteracion < MAX_ITERACIONES_TOOLS; iteracion += 1) {
      const mensaje = await llamarOpenAI({ apiKey: openaiApiKey, mensajes, tools });
      mensajes.push(mensaje);

      if (!mensaje.tool_calls || mensaje.tool_calls.length === 0) {
        return respuestaJson({ respuesta: mensaje.content ?? '', productos: ultimosProductos });
      }

      for (const llamada of mensaje.tool_calls) {
        const ejecutor = EJECUTORES[llamada.function.name];
        let resultado: unknown;
        if (!ejecutor) {
          resultado = { error: `Herramienta desconocida: ${llamada.function.name}` };
        } else {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(llamada.function.arguments || '{}');
          } catch {
            resultado = { error: 'Argumentos inválidos.' };
          }
          if (!resultado) {
            try {
              resultado = await ejecutor(args, ctx);
            } catch (err) {
              resultado = { error: err instanceof Error ? err.message : 'Error al ejecutar la consulta.' };
            }
          }
        }

        const resultadoObjeto = resultado as { productos?: unknown[]; producto?: unknown };
        if (Array.isArray(resultadoObjeto?.productos)) ultimosProductos = resultadoObjeto.productos;
        else if (resultadoObjeto?.producto) ultimosProductos = [resultadoObjeto.producto];

        mensajes.push({
          role: 'tool',
          tool_call_id: llamada.id,
          content: JSON.stringify(resultado).slice(0, 4000),
        });
      }
    }

    return respuestaJson({
      respuesta: 'No pude terminar de procesar tu consulta. ¿Puedes reformularla de forma más simple?',
      productos: ultimosProductos,
    });
  } catch (err) {
    // El detalle completo (status HTTP, modelo, cuerpo de la respuesta de
    // OpenAI) queda en `console.error` para consultarlo desde el dashboard
    // de Supabase (Edge Functions → agente-atrio → Logs) — nunca se manda
    // al cliente RN, y nunca incluye la API key.
    console.error('agente-atrio: error procesando la conversación.', err);
    return respuestaJson({ error: 'El asistente no está disponible en este momento. Intenta de nuevo.' }, 502);
  }
});
