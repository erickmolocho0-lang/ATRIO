import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavegacionAdmin, AccionesAdmin } from '@/components/admin/NavegacionAdmin';
import { CampoEntrega } from '@/components/admin/CampoEntrega';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { useTema } from '@/hooks/useTema';
import { servicioCupones, type Cupon } from '@/services/servicioCupones';
import { interpretarTarifa } from '@/utils/entregas';
import { formatearSoles } from '@/utils/moneda';

export default function PantallaCupones() {
  const { colores } = useTema();
  const [cupones, setCupones] = useState<Cupon[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edicion, setEdicion] = useState<Cupon | null>(null);
  const [codigo, setCodigo] = useState(''); const [porcentaje, setPorcentaje] = useState('');
  const [minimo, setMinimo] = useState('0'); const [hasta, setHasta] = useState('');
  const [activo, setActivo] = useState(false); const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const recargar = useCallback(async () => {
    setCargando(true);
    try { setCupones(await servicioCupones.listar()); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudieron cargar los cupones.'); }
    finally { setCargando(false); }
  }, []);
  useFocusEffect(useCallback(() => { void recargar(); }, [recargar]));
  const editar = (c: Cupon) => { setEdicion(c); setCodigo(c.codigo); setPorcentaje(String(c.porcentaje)); setMinimo(String(c.minimo_compra)); setHasta(c.vigente_hasta ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(c.vigente_hasta)) : ''); setActivo(c.activo); setError(null); setAviso(null); };
  const guardar = async () => {
    if (guardando) return;
    setError(null); setGuardando(true);
    try {
      const codigoFinal = codigo.trim().toUpperCase(); const porcentajeFinal = interpretarTarifa(porcentaje);
      if (!/^[A-Z0-9_-]{3,30}$/.test(codigoFinal)) throw new Error('Usa un código de 3 a 30 letras, números, guion o guion bajo.');
      if (porcentajeFinal == null || porcentajeFinal <= 0 || porcentajeFinal > 100) throw new Error('El descuento debe ser mayor que 0 y hasta 100 %.');
      let fin: string | null = null;
      if (hasta.trim()) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta) || Number.isNaN(Date.parse(hasta)) || new Date(hasta).toISOString().slice(0,10) !== hasta) throw new Error('Usa una fecha válida como 2026-12-31.');
        fin = `${hasta}T23:59:59-05:00`;
      }
      await servicioCupones.guardar({ codigo: codigoFinal, porcentaje: porcentajeFinal, minimo_compra: interpretarTarifa(minimo) ?? 0,
        activo, vigente_desde: edicion?.vigente_desde ?? null, vigente_hasta: fin }, !edicion?.codigo);
      setEdicion(null); setAviso('El cupón se guardó.'); await recargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setGuardando(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colores.papel }} edges={['top']}>
    <EncabezadoPantalla titulo="Cupones" derecha={<AccionesAdmin />} /><NavegacionAdmin />
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      {error ? <Text accessibilityRole="alert" style={{ color: colores.arcilla }}>{error}</Text> : null}
      {aviso ? <Text accessibilityLiveRegion="polite" style={{ color: colores.tinta }}>{aviso}</Text> : null}
      {edicion ? <>
        <CampoEntrega etiqueta="Código" valor={codigo} alCambiar={setCodigo} autoCapitalize="characters" maxLength={30} deshabilitado={guardando || !!edicion.codigo} />
        <CampoEntrega etiqueta="Descuento (%)" valor={porcentaje} alCambiar={setPorcentaje} keyboardType="decimal-pad" deshabilitado={guardando} />
        <CampoEntrega etiqueta="Compra mínima en productos (S/)" valor={minimo} alCambiar={setMinimo} keyboardType="decimal-pad" deshabilitado={guardando} />
        <CampoEntrega etiqueta="Último día válido (AAAA-MM-DD, opcional; hora de Perú)" valor={hasta} alCambiar={setHasta} maxLength={10} deshabilitado={guardando} />
        <View style={styles.fila}><Text style={{ color: colores.tinta }}>Cupón activo</Text><Switch value={activo} onValueChange={setActivo} disabled={guardando} accessibilityLabel="Cupón activo" /></View>
        <Text style={{ color: colores.textoSecundario }}>El porcentaje se aplica a los productos. El delivery se suma después.</Text>
        <BotonPrimario texto="Guardar cupón" onPress={() => void guardar()} cargando={guardando} />
        <BotonPrimario texto="Cancelar" variante="contorno" onPress={() => setEdicion(null)} deshabilitado={guardando} />
      </> : <>
        <BotonPrimario texto="Agregar cupón" onPress={() => editar({ codigo: '', porcentaje: 10, minimo_compra: 0, activo: false, vigente_desde: null, vigente_hasta: null })} />
        {cargando ? <ActivityIndicator color={colores.tinta} /> : null}
        {!cargando && !cupones.length ? <Text style={{ color: colores.textoSecundario }}>Aún no hay cupones. Crea las promociones que hayas definido.</Text> : null}
        {cupones.map((c) => <Pressable key={c.codigo} accessibilityRole="button" onPress={() => editar(c)} style={[styles.tarjeta, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
          <Text style={{ color: colores.tinta }}>{c.codigo} · {c.porcentaje} % · {c.activo ? 'Activo' : 'Inactivo'}</Text>
          <Text style={{ color: colores.textoSecundario }}>Mínimo {formatearSoles(c.minimo_compra)}{c.vigente_hasta ? ` · Hasta ${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(c.vigente_hasta))}` : ''}</Text>
        </Pressable>)}
        {error ? <BotonPrimario texto="Reintentar" variante="contorno" onPress={() => void recargar()} /> : null}
      </>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ contenido: { padding: 20, gap: 16, paddingBottom: 44 }, tarjeta: { padding: 16, borderWidth: 1, borderRadius: 9, gap: 8 }, fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } });
