import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { OrigenAsistente, ProductoChatResultado } from '@/types';

const TIMEOUT_MS = 20000;

function requerirSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

export interface MensajeHistorial {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface RespuestaAgente {
  respuesta: string;
  productos?: ProductoChatResultado[];
}

interface RespuestaEdgeFunction {
  respuesta?: string;
  productos?: ProductoChatResultado[];
  error?: string;
}

// Único punto de contacto con la Edge Function `agente-atrio`. No conoce
// nada de OpenAI: solo envía el mensaje + historial corto + origen de
// pantalla, y traduce la respuesta o el error a algo que useAgente entienda.
export const servicioAgente = {
  async enviarMensaje(datos: {
    mensaje: string;
    historial: MensajeHistorial[];
    origen: OrigenAsistente;
  }): Promise<RespuestaAgente> {
    const cliente = requerirSupabase();

    const { data, error } = await cliente.functions.invoke<RespuestaEdgeFunction>('agente-atrio', {
      body: {
        mensaje: datos.mensaje,
        historial: datos.historial,
        origen: datos.origen,
      },
      timeout: TIMEOUT_MS,
    });

    if (error) {
      if (error.message === 'Failed to fetch' || error.name === 'FunctionsFetchError') {
        throw new Error('No se pudo contactar al asistente. Revisa tu conexión a internet.');
      }
      // Con un status no-2xx, supabase-js solo da "Edge Function returned a
      // non-2xx status code": el mensaje real de la función viene en el
      // cuerpo de la respuesta (error.context), junto con el código HTTP.
      if (error instanceof FunctionsHttpError) {
        const respuesta = error.context as Response | undefined;
        const estado = respuesta?.status;
        let mensajeFuncion: string | undefined;
        try {
          mensajeFuncion = ((await respuesta?.json()) as RespuestaEdgeFunction | undefined)?.error;
        } catch {
          // Cuerpo vacío o no JSON (por ejemplo, un 401 o 404 de la plataforma).
        }
        throw new Error(
          `${mensajeFuncion ?? 'El asistente no pudo responder.'}${estado ? ` (código ${estado})` : ''}`,
        );
      }
      throw new Error(`El asistente no pudo responder: ${error.message}`);
    }

    if (!data || data.error) {
      throw new Error(data?.error ?? 'El asistente no devolvió una respuesta válida.');
    }

    return { respuesta: data.respuesta ?? '', productos: data.productos };
  },
};
