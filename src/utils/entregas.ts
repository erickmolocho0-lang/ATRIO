import type { DatosZonaEntrega, ModalidadEntrega } from '@/types/Entrega';

// Un campo vacío significa que no se ofrece esa modalidad en la zona.
// Cero es una tarifa válida de envío gratuito.
export function interpretarTarifa(texto: string): number | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  if (!/^\d{1,8}([.,]\d{1,2})?$/.test(limpio)) {
    throw new Error('Ingresa un precio de 0 a 99999999.99, con hasta dos decimales.');
  }
  return Number(limpio.replace(',', '.'));
}

export function validarModalidadEntrega(datos: ModalidadEntrega): void {
  if (!datos.nombre.trim() || datos.nombre.trim().length > 80) {
    throw new Error('El nombre de la modalidad debe tener entre 1 y 80 caracteres.');
  }
  if (datos.descripcion.trim().length > 300 || datos.horario.trim().length > 300) {
    throw new Error('El plazo y el horario admiten hasta 300 caracteres cada uno.');
  }
  if (datos.activo && (!datos.descripcion.trim() || !datos.horario.trim())) {
    throw new Error('Completa el plazo de entrega y el horario antes de activar esta modalidad.');
  }
}

export function validarZonaEntrega(datos: DatosZonaEntrega): void {
  if (!datos.nombre.trim() || datos.nombre.trim().length > 100) {
    throw new Error('La zona o localidad debe tener entre 1 y 100 caracteres.');
  }
  for (const [etiqueta, valor] of [
    ['Distrito', datos.distrito], ['Provincia', datos.provincia], ['Departamento', datos.departamento],
  ]) {
    if ((datos.activo && !valor.trim()) || valor.trim().length > 100) {
      throw new Error(`${etiqueta}: complétalo antes de activar la zona (máximo 100 caracteres).`);
    }
  }
  if (datos.mapsUrl.trim() && !esEnlaceMaps(datos.mapsUrl.trim())) {
    throw new Error('Usa un enlace https de Google Maps, con un máximo de 2000 caracteres.');
  }
  const modalidades = new Set<string>();
  for (const tarifa of datos.tarifas) {
    if (!['estandar', 'express'].includes(tarifa.metodoId) || modalidades.has(tarifa.metodoId)) {
      throw new Error('Cada modalidad de envío debe tener una sola tarifa por zona.');
    }
    modalidades.add(tarifa.metodoId);
    if (!Number.isFinite(tarifa.costo) || tarifa.costo < 0 || tarifa.costo > 99999999.99 ||
      Math.abs(tarifa.costo * 100 - Math.round(tarifa.costo * 100)) > 0.000001) {
      throw new Error('Las tarifas deben ser importes válidos con hasta dos decimales.');
    }
  }
  if (datos.activo && datos.tarifas.length === 0) {
    throw new Error('Configura al menos una tarifa antes de activar la cobertura de la zona.');
  }
}

export function esEnlaceMaps(valor: string): boolean {
  return valor.length <= 2000 && /^https:\/\/(maps\.app\.goo\.gl\/|www\.google\.com\/maps\/|maps\.google\.com\/)/i.test(valor);
}
