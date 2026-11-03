// Datos de contacto de la tienda. Es el único lugar que hay que editar para
// actualizar el Centro de ayuda: los botones de contacto aparecen solo si el
// dato tiene valor, así que lo que quede vacío simplemente no se muestra.
interface ContactoTienda {
  whatsapp: string;
  telefono: string;
  correo: string;
  horario: string;
  politicaCambios: string;
}

export const CONTACTO_TIENDA: ContactoTienda = {
  // Número de WhatsApp en formato internacional, solo dígitos (sin "+", espacios ni guiones).
  // Ejemplo: '519XXXXXXXX'. Vacío = no se muestra el botón.
  whatsapp: '',

  // Teléfono para llamadas, tal como se debe marcar. Ejemplo: '+519XXXXXXXX'.
  // Vacío = no se muestra el botón.
  telefono: '',

  // Pendiente de confirmar con la propietaria que este correo exista y se atienda.
  correo: 'soporte@atrio.pe',

  // Texto libre, por ejemplo 'Lunes a sábado, 9:00 a 19:00'. Vacío = no se muestra.
  horario: '',

  // Política de cambios y devoluciones (plazo, condiciones del producto, etc.).
  // Se agrega a la respuesta de "¿Puedo cambiar o devolver un producto?".
  // Vacío = la respuesta solo indica cómo iniciar el trámite.
  politicaCambios: '',
};
