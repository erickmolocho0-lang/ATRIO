import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { servicioAgente } from '@/services/servicioAgente';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';
import type { MensajeChat, OrigenAsistente } from '@/types';

const MENSAJE_BIENVENIDA =
  'Hola, soy Luna, la asistente de ATRIO. Puedo ayudarte a encontrar productos, consultar tallas, colores, stock y revisar tus pedidos.';

// Máximo de mensajes que se guardan en el dispositivo por conversación.
const MAX_MENSAJES_GUARDADOS = 50;

// Cuántos turnos previos se mandan como contexto a la Edge Function — corto
// a propósito para mantener bajo el consumo de tokens (ver punto 18 del
// encargo: historial limitado).
const TURNOS_HISTORIAL = 6;

function nuevoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mensajeInicial(): MensajeChat {
  return { id: nuevoId(), rol: 'asistente', texto: MENSAJE_BIENVENIDA, creadoEn: new Date().toISOString() };
}

// Lo guardado en AsyncStorage puede venir corrupto o de una versión vieja:
// solo se aceptan mensajes con la forma mínima esperada.
function mensajesGuardadosValidos(valor: unknown): MensajeChat[] | null {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  const validos = valor.every(
    (m) =>
      !!m &&
      typeof m === 'object' &&
      typeof (m as MensajeChat).id === 'string' &&
      typeof (m as MensajeChat).texto === 'string' &&
      ((m as MensajeChat).rol === 'usuario' || (m as MensajeChat).rol === 'asistente'),
  );
  return validos ? (valor as MensajeChat[]) : null;
}

export function useAgente(origen: OrigenAsistente) {
  const { usuario } = useAuth();
  const claveChat = `${CLAVES_ALMACENAMIENTO.chatLuna}.${usuario?.id ?? 'invitado'}.${origen}`;

  const [mensajes, setMensajes] = useState<MensajeChat[]>([mensajeInicial()]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clave cuyo historial ya se leyó: hasta entonces no se guarda nada, para
  // no pisar el chat guardado con el saludo inicial.
  const [claveCargada, setClaveCargada] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setClaveCargada(null);
    setMensajes([mensajeInicial()]);
    servicioAlmacenamiento
      .obtenerDato<unknown>(claveChat)
      .then((guardado) => {
        if (cancelado) return;
        const previos = mensajesGuardadosValidos(guardado);
        // Si el usuario ya escribió mientras se leía, no se pisa lo nuevo.
        if (previos) setMensajes((actuales) => (actuales.length > 1 ? actuales : previos));
      })
      .catch(() => {
        // Sin historial legible: se queda el saludo.
      })
      .finally(() => {
        if (!cancelado) setClaveCargada(claveChat);
      });
    return () => {
      cancelado = true;
    };
  }, [claveChat]);

  useEffect(() => {
    if (claveCargada !== claveChat) return;
    // Solo el saludo: no hay nada que guardar.
    if (mensajes.length <= 1 && mensajes[0]?.rol === 'asistente') return;
    void servicioAlmacenamiento.guardarDato(claveChat, mensajes.slice(-MAX_MENSAJES_GUARDADOS));
  }, [mensajes, claveChat, claveCargada]);

  const enviarMensaje = useCallback(async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;

    const mensajeUsuario: MensajeChat = {
      id: nuevoId(),
      rol: 'usuario',
      texto: contenido,
      creadoEn: new Date().toISOString(),
    };

    const historial = [...mensajes, mensajeUsuario]
      .slice(-TURNOS_HISTORIAL)
      .map((m) => ({ rol: m.rol, texto: m.texto }));

    setMensajes((actuales) => [...actuales, mensajeUsuario]);
    setTexto('');
    setError(null);
    setEnviando(true);

    try {
      const respuesta = await servicioAgente.enviarMensaje({ mensaje: contenido, historial, origen });
      const mensajeAsistente: MensajeChat = {
        id: nuevoId(),
        rol: 'asistente',
        texto: respuesta.respuesta || 'No tengo una respuesta para eso todavía.',
        productos: respuesta.productos,
        creadoEn: new Date().toISOString(),
      };
      setMensajes((actuales) => [...actuales, mensajeAsistente]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error al hablar con el asistente.');
    } finally {
      setEnviando(false);
    }
  }, [texto, enviando, mensajes, origen]);

  const nuevaConversacion = useCallback(() => {
    void servicioAlmacenamiento.eliminarDato(claveChat);
    setMensajes([mensajeInicial()]);
    setTexto('');
    setError(null);
  }, [claveChat]);

  return { mensajes, texto, setTexto, enviando, error, enviarMensaje, nuevaConversacion };
}
