import { supabase } from '@/lib/supabase';
import type { ConfiguracionEntregas, DatosZonaEntrega, ZonaEntrega, ModalidadEntrega } from '@/types/Entrega';
import { validarZonaEntrega, validarModalidadEntrega } from '@/utils/entregas';

function cliente() {
  if (!supabase) throw new Error('Falta configurar la conexión de Supabase.');
  return supabase;
}

function fallar(error: { code?: string; message: string }): never {
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST202') {
    throw new Error('No se pudo cargar la configuración de delivery. Contacta al administrador de la tienda.');
  }
  if (error.code === '23505') {
    throw new Error('Esa zona ya está registrada para la misma ubicación.');
  }
  if (error.code === '42501') throw new Error('Solo un administrador de la tienda puede guardar estos cambios.');
  throw new Error(error.message);
}

interface FilaZona {
  id: string;
  nombre: string;
  distrito: string;
  provincia: string;
  departamento: string;
  maps_url: string;
  activo: boolean;
  tarifas_entrega: { metodo_id: ModalidadEntrega['id']; costo: number | string }[];
}

function mapearZona(fila: FilaZona): ZonaEntrega {
  return {
    id: fila.id, nombre: fila.nombre, distrito: fila.distrito, provincia: fila.provincia,
    departamento: fila.departamento, activo: fila.activo,
    mapsUrl: fila.maps_url,
    tarifas: (fila.tarifas_entrega ?? []).map((tarifa) => ({
      metodoId: tarifa.metodo_id, costo: Number(tarifa.costo),
    })),
  };
}

export const servicioEntregas = {
  async obtenerConfiguracion(): Promise<ConfiguracionEntregas> {
    const db = cliente();
    const [modalidades, zonas] = await Promise.all([
      db.from('metodos_entrega').select('id, nombre, tipo, descripcion, horario, activo').order('id'),
      db.from('zonas_entrega')
        .select('id, nombre, distrito, provincia, departamento, maps_url, activo, tarifas_entrega(metodo_id, costo)')
        .order('departamento').order('provincia').order('distrito').order('nombre'),
    ]);
    if (modalidades.error) fallar(modalidades.error);
    if (zonas.error) fallar(zonas.error);
    const orden = ['estandar', 'express', 'retiro'];
    return {
      modalidades: (modalidades.data as ModalidadEntrega[]).sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id)),
      zonas: (zonas.data as unknown as FilaZona[]).map(mapearZona),
    };
  },

  async guardarModalidad(datos: ModalidadEntrega): Promise<void> {
    validarModalidadEntrega(datos);
    const { data, error } = await cliente().from('metodos_entrega').update({
      nombre: datos.nombre.trim(), descripcion: datos.descripcion.trim(),
      horario: datos.horario.trim(), activo: datos.activo,
    }).eq('id', datos.id).select('id').single();
    if (error) fallar(error);
    if (!data) throw new Error('La modalidad ya no está disponible. Recarga la pantalla.');
  },

  async guardarZona(datos: DatosZonaEntrega): Promise<string> {
    validarZonaEntrega(datos);
    const { data, error } = await cliente().rpc('guardar_zona_entrega', {
      p_nombre: datos.nombre.trim(), p_maps_url: datos.mapsUrl.trim(),
      p_distrito: datos.distrito.trim(), p_provincia: datos.provincia.trim(),
      p_departamento: datos.departamento.trim(), p_activo: datos.activo,
      p_tarifas: datos.tarifas.map((tarifa) => ({ metodo_id: tarifa.metodoId, costo: tarifa.costo })),
      p_id: datos.id ?? null,
    });
    if (error) fallar(error);
    if (typeof data !== 'string') throw new Error('No se pudo confirmar el guardado de la zona.');
    return data;
  },
};
