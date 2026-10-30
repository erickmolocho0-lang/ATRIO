import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import type { ColorProducto } from '@/types';
import { servicioProductos } from './servicioProductos';

// Gestión de categorías y colores desde el panel admin. La escritura la
// permiten las políticas categorias_escritura_admin y colores_escritura_admin
// del esquema base (solo es_administrador()).

export const PATRON_HEX = /^#[0-9A-Fa-f]{6}$/;

export interface DatosCategoria {
  nombre: string;
  subcategorias: string[];
  imagenUrl?: string;
}

export interface DatosColor {
  nombre: string;
  hex: string;
}

function requerirSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado en este entorno.');
  return supabase;
}

// categorias.id y colores.id son text sin valor por defecto: se derivan del
// nombre ("Polos manga larga" -> "polos-manga-larga"), igual que los ids
// que ya existen en la base.
function generarIdLegible(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

function plural(cantidad: number, singular: string, varios: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : varios}`;
}

export const servicioCatalogoAdmin = {
  async crearCategoria(datos: DatosCategoria): Promise<void> {
    const id = generarIdLegible(datos.nombre);
    if (!id) throw new Error('El nombre de la categoría no es válido.');
    const { error } = await requerirSupabase().from('categorias').insert({
      id,
      nombre: datos.nombre.trim(),
      subcategorias: datos.subcategorias,
      imagen_url: datos.imagenUrl ?? null,
    });
    if (error) {
      if (error.code === '23505') throw new Error(`Ya existe una categoría con el identificador "${id}".`);
      throw new Error(`No se pudo crear la categoría: ${error.message}`);
    }
  },

  // El id no cambia al editar: productos y campañas apuntan a él.
  async editarCategoria(id: string, datos: DatosCategoria): Promise<void> {
    const { error } = await requerirSupabase()
      .from('categorias')
      .update({
        nombre: datos.nombre.trim(),
        subcategorias: datos.subcategorias,
        imagen_url: datos.imagenUrl ?? null,
      })
      .eq('id', id);
    if (error) throw new Error(`No se pudo actualizar la categoría: ${error.message}`);
  },

  /** No borra si algún producto (activo o no) o campaña la usa. */
  async eliminarCategoria(id: string): Promise<void> {
    const cliente = requerirSupabase();
    const [{ count: productos, error: errorProductos }, { count: campanas, error: errorCampanas }] =
      await Promise.all([
        cliente.from('productos').select('id', { count: 'exact', head: true }).eq('categoria_id', id),
        cliente.from('campanas').select('id', { count: 'exact', head: true }).eq('categoria_destino', id),
      ]);
    if (errorProductos) throw new Error(`No se pudo revisar si la categoría está en uso: ${errorProductos.message}`);
    if (errorCampanas) throw new Error(`No se pudo revisar si la categoría está en uso: ${errorCampanas.message}`);

    if ((productos ?? 0) > 0) {
      throw new Error(
        `No se puede borrar: ${plural(productos ?? 0, 'producto usa', 'productos usan')} esta categoría.`,
      );
    }
    // campanas.categoria_destino no es FK: sin esta revisión el banner
    // llevaría a una categoría que ya no existe.
    if ((campanas ?? 0) > 0) {
      throw new Error(
        `No se puede borrar: ${plural(campanas ?? 0, 'campaña lleva', 'campañas llevan')} a esta categoría.`,
      );
    }

    const { error } = await cliente.from('categorias').delete().eq('id', id);
    if (error) throw new Error(`No se pudo borrar la categoría: ${error.message}`);
  },

  async obtenerColores(): Promise<ColorProducto[]> {
    const colores = await servicioProductos.obtenerColores();
    return [...colores].sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async crearColor(datos: DatosColor): Promise<void> {
    const id = generarIdLegible(datos.nombre);
    if (!id) throw new Error('El nombre del color no es válido.');
    if (!PATRON_HEX.test(datos.hex)) throw new Error('El color debe tener el formato #RRGGBB.');
    const { error } = await requerirSupabase()
      .from('colores')
      .insert({ id, nombre: datos.nombre.trim(), hex: datos.hex.toUpperCase() });
    if (error) {
      if (error.code === '23505') throw new Error(`Ya existe un color con el identificador "${id}".`);
      throw new Error(`No se pudo crear el color: ${error.message}`);
    }
  },

  async editarColor(id: string, datos: DatosColor): Promise<void> {
    if (!PATRON_HEX.test(datos.hex)) throw new Error('El color debe tener el formato #RRGGBB.');
    const { error } = await requerirSupabase()
      .from('colores')
      .update({ nombre: datos.nombre.trim(), hex: datos.hex.toUpperCase() })
      .eq('id', id);
    if (error) throw new Error(`No se pudo actualizar el color: ${error.message}`);
  },

  /** No borra si alguna variante (de cualquier producto) usa el color. */
  async eliminarColor(id: string): Promise<void> {
    const cliente = requerirSupabase();
    const { data, error: errorUso } = await cliente
      .from('variantes_producto')
      .select('producto_id')
      .eq('color_id', id);
    if (errorUso) throw new Error(`No se pudo revisar si el color está en uso: ${errorUso.message}`);

    const variantes = data ?? [];
    if (variantes.length > 0) {
      const productos = new Set(variantes.map((fila) => (fila as { producto_id: string }).producto_id)).size;
      throw new Error(
        `No se puede borrar: ${plural(productos, 'producto lo usa', 'productos lo usan')} ` +
          `(${plural(variantes.length, 'variante', 'variantes')}).`,
      );
    }

    const { error } = await cliente.from('colores').delete().eq('id', id);
    if (error) throw new Error(`No se pudo borrar el color: ${error.message}`);
  },

  /**
   * Abre la galería y sube la foto elegida con servicioProductos.subirImagen.
   * Devuelve la URL pública, o null si el usuario canceló.
   */
  async elegirYSubirImagen(): Promise<string | null> {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      throw new Error('Necesitas permitir el acceso a tus fotos para elegir una imagen.');
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    });
    if (resultado.canceled) return null;
    const activo = resultado.assets[0];
    if (!activo?.uri) return null;
    return servicioProductos.subirImagen(activo.uri, activo.mimeType ?? 'image/jpeg');
  },
};
