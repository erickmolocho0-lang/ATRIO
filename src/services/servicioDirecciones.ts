import { supabase } from '@/lib/supabase';
import { consultarLecturaCompatible } from '@/utils/compatibilidadLectura';
import type { DatosDireccion, Direccion } from '@/types';

function cliente() {
  if (!supabase) throw new Error('Falta configurar Supabase.');
  return supabase;
}

export interface FilaDireccion {
  id: string; usuario_id?: string | null; etiqueta: string | null; direccion: string;
  distrito: string | null; referencia: string | null; predeterminada: boolean;
  zona_id: string | null; destinatario: string | null; telefono: string | null;
  zonas_entrega?: { nombre: string } | null; zonaNombre?: string;
}

export function mapearDireccion(fila: FilaDireccion, usuarioId: string | null): Direccion {
  return { id: fila.id, usuarioId, etiqueta: fila.etiqueta ?? undefined,
    direccion: fila.direccion, distrito: fila.distrito ?? '', referencia: fila.referencia ?? undefined,
    predeterminada: fila.predeterminada, zonaId: fila.zona_id ?? undefined,
    zonaNombre: fila.zonaNombre ?? fila.zonas_entrega?.nombre,
    destinatario: fila.destinatario ?? undefined, telefono: fila.telefono ?? undefined };
}

const columnas = 'id, usuario_id, etiqueta, direccion, distrito, referencia, predeterminada, zona_id, destinatario, telefono, zonas_entrega(nombre)';

const columnasAnteriores = columnas.replace(', destinatario, telefono', '');

async function usuarioId(): Promise<string> {
  const { data, error } = await cliente().auth.getUser();
  if (error || !data.user) throw new Error('Debes iniciar sesion para gestionar tus direcciones.');
  return data.user.id;
}

async function guardar(datos: DatosDireccion, id?: string): Promise<Direccion> {
  const uid = await usuarioId();
  const { data, error } = await cliente().rpc('guardar_direccion_checkout', {
    p_direccion: datos.direccion.trim(), p_zona_id: datos.zonaId ?? null,
    p_destinatario: datos.destinatario?.trim() ?? '', p_telefono: datos.telefono ?? '',
    p_etiqueta: datos.etiqueta ?? null, p_referencia: datos.referencia ?? null,
    p_predeterminada: datos.predeterminada, p_id: id ?? null,
  }).single();
  if (error) throw new Error(error.code === 'PGRST202' ? 'La tienda debe habilitar la actualizacion de direcciones.' : error.message);
  return mapearDireccion(data as FilaDireccion, uid);
}

export const servicioDirecciones = {
  async obtenerDirecciones(): Promise<Direccion[]> {
    const uid = await usuarioId();
    const { data, error } = await consultarLecturaCompatible((anterior) => cliente().from('direcciones')
      .select(anterior ? columnasAnteriores : columnas).eq('usuario_id', uid).order('creado_en'), ['destinatario', 'telefono']);
    if (error) throw new Error(`No se pudieron cargar las direcciones: ${error.message}`);
    return (data as unknown as FilaDireccion[]).map((f) => mapearDireccion(f, uid));
  },
  crearDireccion: (datos: DatosDireccion) => guardar(datos),
  actualizarDireccion: (id: string, datos: DatosDireccion) => guardar(datos, id),
  async eliminarDireccion(id: string): Promise<void> {
    const uid = await usuarioId();
    const { error } = await cliente().from('direcciones').delete().eq('id', id).eq('usuario_id', uid);
    if (error) throw new Error('No se pudo eliminar la direccion. Puede estar asociada a un pedido.');
  },
};
