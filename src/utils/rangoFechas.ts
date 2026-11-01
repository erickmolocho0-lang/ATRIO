export type PresetRango = 'hoy' | '7dias' | 'mes' | 'personalizado';

export interface RangoFechas {
  desde: Date; // inicio del primer día (hora local)
  hasta: Date; // final del último día (hora local)
}

export const OPCIONES_RANGO: { id: PresetRango; texto: string }[] = [
  { id: 'hoy', texto: 'Hoy' },
  { id: '7dias', texto: '7 días' },
  { id: 'mes', texto: 'Este mes' },
  { id: 'personalizado', texto: 'Personalizado' },
];

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
}

function finDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
}

// Rangos predefinidos. "7 días" incluye hoy: de hace 6 días hasta hoy.
export function calcularRango(preset: Exclude<PresetRango, 'personalizado'>, hoy = new Date()): RangoFechas {
  if (preset === 'hoy') return { desde: inicioDelDia(hoy), hasta: finDelDia(hoy) };
  if (preset === '7dias') {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 6);
    return { desde: inicioDelDia(inicio), hasta: finDelDia(hoy) };
  }
  return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0, 0), hasta: finDelDia(hoy) };
}

export function dentroDelRango(fechaIso: string, rango: RangoFechas): boolean {
  const instante = new Date(fechaIso).getTime();
  if (Number.isNaN(instante)) return false;
  return instante >= rango.desde.getTime() && instante <= rango.hasta.getTime();
}

// Día calendario en hora local (YYYY-MM-DD). Los pedidos se guardan en UTC,
// y en Perú (UTC-5) una venta de las 8 p. m. caería en el día siguiente si se
// agrupara por la fecha UTC.
export function fechaLocalIso(valor: string | Date): string {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(fecha.getTime())) return typeof valor === 'string' ? valor.slice(0, 10) : '';
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function formatearFecha(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

export function formatearRango(rango: RangoFechas): string {
  const desde = formatearFecha(rango.desde);
  const hasta = formatearFecha(rango.hasta);
  return desde === hasta ? desde : `${desde} – ${hasta}`;
}

// Convierte "DD/MM/AAAA" en una fecha local. Devuelve null si el texto no tiene
// ese formato o la fecha no existe (por ejemplo 31/02/2026).
export function parsearFechaLocal(texto: string): Date | null {
  const coincidencia = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!coincidencia) return null;
  const dia = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const anio = Number(coincidencia[3]);
  const fecha = new Date(anio, mes - 1, dia);
  const existe = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe ? fecha : null;
}

// Valida los dos textos del rango personalizado. Devuelve el rango o un mensaje de error.
export function construirRangoPersonalizado(
  desdeTexto: string,
  hastaTexto: string,
): { rango: RangoFechas } | { error: string } {
  const desde = parsearFechaLocal(desdeTexto);
  const hasta = parsearFechaLocal(hastaTexto);
  if (!desde || !hasta) return { error: 'Escribe las fechas como DD/MM/AAAA, por ejemplo 15/10/2026.' };
  if (desde.getTime() > hasta.getTime()) return { error: 'La fecha "Desde" no puede ser posterior a "Hasta".' };
  return { rango: { desde: inicioDelDia(desde), hasta: finDelDia(hasta) } };
}
