import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { CONTACTO_TIENDA } from '@/constants/contactoTienda';
import { seccionesAyuda } from '@/data/preguntasAyuda';

export interface OpcionContacto {
  id: 'whatsapp' | 'llamada' | 'correo';
  texto: string;
  icono: 'logo-whatsapp' | 'call-outline' | 'mail-outline';
  url: string;
}

const MENSAJE_WHATSAPP = 'Hola, necesito ayuda con mi compra en ATRIO.';

function construirOpcionesContacto(): OpcionContacto[] {
  const opciones: OpcionContacto[] = [];
  if (CONTACTO_TIENDA.whatsapp) {
    opciones.push({
      id: 'whatsapp',
      texto: 'Escribir por WhatsApp',
      icono: 'logo-whatsapp',
      url: `https://wa.me/${CONTACTO_TIENDA.whatsapp}?text=${encodeURIComponent(MENSAJE_WHATSAPP)}`,
    });
  }
  if (CONTACTO_TIENDA.telefono) {
    opciones.push({
      id: 'llamada',
      texto: 'Llamar a la tienda',
      icono: 'call-outline',
      url: `tel:${CONTACTO_TIENDA.telefono}`,
    });
  }
  if (CONTACTO_TIENDA.correo) {
    opciones.push({
      id: 'correo',
      texto: CONTACTO_TIENDA.correo,
      icono: 'mail-outline',
      url: `mailto:${CONTACTO_TIENDA.correo}`,
    });
  }
  return opciones;
}

export function useCentroAyuda() {
  const [preguntaAbierta, setPreguntaAbierta] = useState<string | null>(null);
  const opcionesContacto = construirOpcionesContacto();

  const alternarPregunta = useCallback((id: string) => {
    setPreguntaAbierta((actual) => (actual === id ? null : id));
  }, []);

  const abrirContacto = useCallback(async (opcion: OpcionContacto) => {
    try {
      const puedeAbrir = await Linking.canOpenURL(opcion.url);
      if (!puedeAbrir) throw new Error('No se puede abrir el enlace');
      await Linking.openURL(opcion.url);
    } catch {
      Alert.alert('No se pudo abrir', 'No encontramos una aplicación en este dispositivo para esta acción.');
    }
  }, []);

  return {
    secciones: seccionesAyuda,
    horario: CONTACTO_TIENDA.horario,
    opcionesContacto,
    preguntaAbierta,
    alternarPregunta,
    abrirContacto,
  };
}
