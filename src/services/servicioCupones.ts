import { supabase } from '@/lib/supabase';

export interface Cupon {
  codigo: string;
  porcentaje: number;
  activo: boolean;
  minimo_compra: number;
  vigente_desde: string | null;
  vigente_hasta: string | null;
  usos_maximos: number | null;
  usos_actuales: number;
}

function cliente() {
  if (!supabase) throw new Error('Falta configurar Supabase.');
  return supabase;
}

export const servicioCupones = {
  async validar(codigo: string): Promise<{ codigo: string; porcentaje: number }> {
    const { data, error } = await cliente().rpc('validar_cupon', { p_codigo: codigo.trim().toUpperCase() });
    if (error) throw new Error(error.code === 'PGRST202' ? 'Los cupones aun no estan habilitados en la tienda.' : error.message);
    const fila = data?.[0];
    if (!fila) throw new Error('No se pudo validar el cupon.');
    return { codigo: fila.codigo, porcentaje: Number(fila.porcentaje) };
  },
  async listar(): Promise<Cupon[]> {
    const { data, error } = await cliente().from('cupones').select('codigo, porcentaje, activo, minimo_compra, vigente_desde, vigente_hasta, usos_maximos, usos_actuales').order('codigo');
    if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204' ? 'Los cupones aún no están habilitados. Falta aplicar la actualización de la tienda.' : error.message);
    return (data ?? []).map((c) => ({ ...c, porcentaje: Number(c.porcentaje), minimo_compra: Number(c.minimo_compra), usos_maximos: c.usos_maximos == null ? null : Number(c.usos_maximos), usos_actuales: Number(c.usos_actuales) }));
  },
  async guardar(cupon: Omit<Cupon, 'usos_actuales'>, nuevo = false): Promise<void> {
    const datos = { codigo: cupon.codigo, porcentaje: cupon.porcentaje, activo: cupon.activo, minimo_compra: cupon.minimo_compra, vigente_desde: cupon.vigente_desde, vigente_hasta: cupon.vigente_hasta, usos_maximos: cupon.usos_maximos };
    const consulta = nuevo ? cliente().from('cupones').insert(datos) : cliente().from('cupones').update(datos).eq('codigo', cupon.codigo);
    const { error } = await consulta.select('codigo').single();
    if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204' ? 'Los cupones aún no están habilitados. Falta aplicar la actualización de la tienda.' : error.message);
  },
};
