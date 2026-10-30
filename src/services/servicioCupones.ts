import { supabase } from '@/lib/supabase';

export interface Cupon {
  codigo: string;
  porcentaje: number;
  activo: boolean;
  minimo_compra: number;
  vigente_desde: string | null;
  vigente_hasta: string | null;
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
    const { data, error } = await cliente().from('cupones').select('*').order('codigo');
    if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'Los cupones aún no están habilitados. Falta aplicar la actualización de la tienda.' : error.message);
    return (data ?? []).map((c) => ({ ...c, porcentaje: Number(c.porcentaje), minimo_compra: Number(c.minimo_compra) }));
  },
  async guardar(cupon: Cupon, nuevo = false): Promise<void> {
    const consulta = nuevo ? cliente().from('cupones').insert(cupon) : cliente().from('cupones').update(cupon).eq('codigo', cupon.codigo);
    const { error } = await consulta.select('codigo').single();
    if (error) throw new Error(error.code === 'PGRST205' || error.code === '42P01' ? 'Los cupones aún no están habilitados. Falta aplicar la actualización de la tienda.' : error.message);
  },
};
