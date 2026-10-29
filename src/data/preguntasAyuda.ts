import { CONTACTO_TIENDA } from '@/constants/contactoTienda';
import { metodosEntrega } from '@/data/metodosEntrega';
import { metodosPago } from '@/data/metodosPago';
import { nombreEstadoPedido } from '@/data/estadosPedido';
import { formatearSoles } from '@/utils/moneda';

export interface PreguntaAyuda {
  id: string;
  pregunta: string;
  respuesta: string;
}

export interface SeccionAyuda {
  id: string;
  titulo: string;
  preguntas: PreguntaAyuda[];
}

// Las respuestas sobre entrega, pagos y estados se arman con los mismos datos
// que usa el checkout, así que no quedan desactualizadas si cambia un precio
// o se quita un método de pago.
const textoEntregas = metodosEntrega
  .map((metodo) => {
    const costo = metodo.costo > 0 ? ` (${formatearSoles(metodo.costo)})` : '';
    return `• ${metodo.nombre}: ${metodo.descripcion}${costo}`;
  })
  .join('\n');

const textoPagos = metodosPago.map((opcion) => `• ${opcion.nombre}: ${opcion.descripcion}`).join('\n');

const textoEstados = Object.values(nombreEstadoPedido).join(', ');

const respuestaDevoluciones = [
  'Escríbenos indicando tu número de pedido (lo ves en Perfil → Mis pedidos) y el motivo, y te indicamos cómo continuar.',
  CONTACTO_TIENDA.politicaCambios,
]
  .filter(Boolean)
  .join('\n\n');

export const seccionesAyuda: SeccionAyuda[] = [
  {
    id: 'pedidos',
    titulo: 'PEDIDOS',
    preguntas: [
      {
        id: 'hacer-pedido',
        pregunta: '¿Cómo hago un pedido?',
        respuesta:
          'Elige un producto, selecciona su talla y color y agrégalo al carrito. Luego sigue los pasos del checkout: entrega y pago.',
      },
      {
        id: 'estado-pedido',
        pregunta: '¿Dónde veo el estado de mi pedido?',
        respuesta: `En Perfil → Mis pedidos. Ahí aparece cada pedido con su estado: ${textoEstados}.`,
      },
    ],
  },
  {
    id: 'envios',
    titulo: 'ENVÍOS Y ENTREGA',
    preguntas: [
      {
        id: 'opciones-entrega',
        pregunta: '¿Qué opciones de entrega hay y cuánto cuestan?',
        respuesta: textoEntregas,
      },
    ],
  },
  {
    id: 'pagos',
    titulo: 'PAGOS',
    preguntas: [
      {
        id: 'metodos-pago',
        pregunta: '¿Qué métodos de pago aceptan?',
        respuesta: textoPagos,
      },
    ],
  },
  {
    id: 'tallas',
    titulo: 'TALLAS',
    preguntas: [
      {
        id: 'tallas-disponibles',
        pregunta: '¿Cómo sé qué tallas hay disponibles?',
        respuesta:
          'En la ficha de cada producto verás todas las tallas. Las que no tienen stock aparecen deshabilitadas y no se pueden elegir.',
      },
      {
        id: 'duda-talla',
        pregunta: '¿Y si dudo entre dos tallas?',
        respuesta:
          'Escríbenos con el nombre del producto y las tallas que dudas, y te orientamos. Encuentras los medios de contacto al final de esta pantalla.',
      },
    ],
  },
  {
    id: 'cambios',
    titulo: 'CAMBIOS Y DEVOLUCIONES',
    preguntas: [
      {
        id: 'cambios-devoluciones',
        pregunta: '¿Puedo cambiar o devolver un producto?',
        respuesta: respuestaDevoluciones,
      },
    ],
  },
  {
    id: 'cuenta',
    titulo: 'MI CUENTA',
    preguntas: [
      {
        id: 'olvide-contrasena',
        pregunta: 'Olvidé mi contraseña, ¿qué hago?',
        respuesta:
          'En la pantalla de inicio de sesión pulsa "¿Olvidaste tu contraseña?" e ingresa tu correo. Te enviaremos un enlace para crear una nueva.',
      },
    ],
  },
];
