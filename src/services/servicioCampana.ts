import { supabase } from '@/lib/supabase';
import { campanaInicio } from '@/data/campana';
import type { CampanaAdmin, CampanaInicio, DatosCampana } from '@/types';

const SELECT_CAMPANA_ADMIN = 'id, etiqueta, titulo, texto_boton, categoria_destino, imagen_url, activa';

interface FilaCampanaAdmin extends FilaCampana {
  id: string;
  activa: boolean;
}

function mapearFilaAdmin(fila: FilaCampanaAdmin): CampanaAdmin {
  return { ...mapearFila(fila), id: fila.id, activa: fila.activa };
}

function aFila(datos: DatosCampana) {
  return {
    etiqueta: datos.etiqueta.trim(),
    titulo: datos.titulo.trim(),
    texto_boton: datos.textoBoton.trim(),
    categoria_destino: datos.categoriaDestino,
    imagen_url: datos.imagenUrl ?? null,
    activa: datos.activa,
  };
}

// Las funciones de admin, a diferencia de obtenerCampanasActivas, sí lanzan:
// el panel tiene que mostrar el error en vez de esconderlo con el respaldo.
function requerirSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado en este entorno.');
  return supabase;
}

interface FilaCampana {
  etiqueta: string;
  titulo: string;
  texto_boton: string;
  categoria_destino: string;
  imagen_url: string | null;
}

function mapearFila(fila: FilaCampana): CampanaInicio {
  return {
    etiqueta: fila.etiqueta,
    titulo: fila.titulo,
    textoBoton: fila.texto_boton,
    categoriaDestino: fila.categoria_destino,
    imagenUrl: fila.imagen_url ?? undefined,
  };
}

export const servicioCampana = {
  // Nunca lanza: si Supabase no está configurado, la tabla está vacía, o la
  // consulta falla, se cae de vuelta al objeto fijo de src/data/campana.ts
  // — Inicio siempre tiene algo que mostrar (un carrusel de un solo slide),
  // la campaña nunca rompe la pantalla principal de la app.
  async obtenerCampanasActivas(): Promise<CampanaInicio[]> {
    if (!supabase) return [campanaInicio];

    const { data, error } = await supabase
      .from('campanas')
      .select('etiqueta, titulo, texto_boton, categoria_destino, imagen_url')
      .eq('activa', true)
      .order('creado_en', { ascending: false });

    if (error) {
      console.error('servicioCampana: no se pudieron cargar las campañas activas, se usa la de respaldo.', error);
      return [campanaInicio];
    }
    if (!data || data.length === 0) return [campanaInicio];

    return (data as FilaCampana[]).map(mapearFila);
  },

  /** Panel admin: todas, activas e inactivas (la política de admin permite leerlas). */
  async obtenerTodas(): Promise<CampanaAdmin[]> {
    const { data, error } = await requerirSupabase()
      .from('campanas')
      .select(SELECT_CAMPANA_ADMIN)
      .order('creado_en', { ascending: false });
    if (error) throw new Error(`No se pudieron cargar las campañas: ${error.message}`);
    return ((data ?? []) as FilaCampanaAdmin[]).map(mapearFilaAdmin);
  },

  async crear(datos: DatosCampana): Promise<CampanaAdmin> {
    const { data, error } = await requerirSupabase()
      .from('campanas')
      .insert(aFila(datos))
      .select(SELECT_CAMPANA_ADMIN)
      .single();
    if (error) throw new Error(`No se pudo crear la campaña: ${error.message}`);
    return mapearFilaAdmin(data as FilaCampanaAdmin);
  },

  async actualizar(id: string, datos: DatosCampana): Promise<CampanaAdmin> {
    const { data, error } = await requerirSupabase()
      .from('campanas')
      .update(aFila(datos))
      .eq('id', id)
      .select(SELECT_CAMPANA_ADMIN)
      .single();
    if (error) throw new Error(`No se pudo actualizar la campaña: ${error.message}`);
    return mapearFilaAdmin(data as FilaCampanaAdmin);
  },

  /** Recibe el estado actual y guarda el contrario. */
  async alternarActiva(id: string, activaActual: boolean): Promise<CampanaAdmin> {
    const { data, error } = await requerirSupabase()
      .from('campanas')
      .update({ activa: !activaActual })
      .eq('id', id)
      .select(SELECT_CAMPANA_ADMIN)
      .single();
    if (error) throw new Error(`No se pudo cambiar el estado de la campaña: ${error.message}`);
    return mapearFilaAdmin(data as FilaCampanaAdmin);
  },

  async eliminar(id: string): Promise<void> {
    const { error } = await requerirSupabase().from('campanas').delete().eq('id', id);
    if (error) throw new Error(`No se pudo eliminar la campaña: ${error.message}`);
  },
};
