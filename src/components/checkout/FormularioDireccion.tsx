import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { FilaInterruptor } from '@/components/profile/FilaInterruptor';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { useCoberturaEntrega } from '@/hooks/useCoberturaEntrega';
import type { DatosDireccion } from '@/types';
import { validarDatosDireccion } from '@/utils/checkout';

interface Propiedades {
  inicial?: DatosDireccion; yaEsPredeterminada: boolean; guardando: boolean;
  textoBoton: string; alGuardar: (datos: DatosDireccion) => void | Promise<void>;
}

export function FormularioDireccion({ inicial, yaEsPredeterminada, guardando, textoBoton, alGuardar }: Propiedades) {
  const { colores } = useTema();
  const cobertura = useCoberturaEntrega();
  const [datos, setDatos] = useState<DatosDireccion>(() => ({ etiqueta: '', direccion: '', distrito: '',
    referencia: '', destinatario: '', telefono: '', predeterminada: false, ...inicial }));
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errores = intentado ? validarDatosDireccion(datos) : {};
  const cambiar = (clave: keyof DatosDireccion, valor: string | boolean) => setDatos((d) => ({ ...d, [clave]: valor }));
  const enviar = async () => {
    setIntentado(true); setError(null);
    if (guardando || Object.keys(validarDatosDireccion(datos)).length || !cobertura.zonas.some((z) => z.id === datos.zonaId)) return;
    try { await alGuardar(datos); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la direccion.'); }
  };
  return <View style={styles.formulario}>
    <CampoTexto etiqueta="Etiqueta (opcional)" valor={datos.etiqueta ?? ''} alCambiar={(v) => cambiar('etiqueta', v)} maxLength={30} editable={!guardando} />
    <CampoTexto etiqueta="Nombre del destinatario" valor={datos.destinatario ?? ''} alCambiar={(v) => cambiar('destinatario', v)} maxLength={100} error={errores.destinatario} editable={!guardando} />
    <CampoTexto etiqueta="Celular del destinatario" valor={datos.telefono ?? ''} alCambiar={(v) => cambiar('telefono', v)} keyboardType="phone-pad" maxLength={9} placeholder="9 dígitos, empieza con 9" error={errores.telefono} editable={!guardando} />
    <CampoTexto etiqueta="Dirección" valor={datos.direccion} alCambiar={(v) => cambiar('direccion', v)} maxLength={300} error={errores.direccion} editable={!guardando} />
    <Text style={[styles.texto, { color: colores.tinta }]}>Zona o localidad de entrega</Text>
    {cobertura.cargando ? <Text style={{ color: colores.textoSecundario }}>Consultando cobertura…</Text> : null}
    {cobertura.error ? <><Text accessibilityRole="alert" style={{ color: colores.arcilla }}>{cobertura.error}</Text><BotonPrimario texto="Reintentar cobertura" variante="contorno" onPress={() => void cobertura.recargar()} /></> : null}
    {!cobertura.cargando && !cobertura.error && cobertura.zonas.length === 0 ? <Text style={{ color: colores.textoSecundario }}>Aún no hay zonas con reparto habilitado. Puedes elegir retiro en tienda si está disponible.</Text> : null}
    {cobertura.zonas.map((zona) => <Pressable key={zona.id} disabled={guardando} accessibilityRole="radio"
      accessibilityState={{ selected: zona.id === datos.zonaId }} onPress={() => setDatos((d) => ({ ...d, zonaId: zona.id, zonaNombre: zona.nombre, distrito: zona.distrito }))}
      style={[styles.zona, { borderColor: zona.id === datos.zonaId ? colores.tinta : colores.borde, backgroundColor: colores.blanco }]}>
      <Text style={[styles.texto, { color: colores.tinta }]}>{zona.id === datos.zonaId ? '● ' : '○ '}{zona.nombre}</Text>
      <Text style={{ color: colores.textoSecundario }}>{zona.distrito}, {zona.provincia}, {zona.departamento}</Text>
    </Pressable>)}
    {errores.zonaId ? <Text style={{ color: colores.arcilla }}>{errores.zonaId}</Text> : null}
    {datos.zonaId && !cobertura.cargando && !cobertura.zonas.some((z) => z.id === datos.zonaId) ? <Text style={{ color: colores.arcilla }}>Tu zona anterior ya no tiene cobertura. Selecciona otra disponible.</Text> : null}
    <CampoTexto etiqueta="Referencia (opcional)" valor={datos.referencia ?? ''} alCambiar={(v) => cambiar('referencia', v)} maxLength={300} editable={!guardando} />
    {yaEsPredeterminada ? <Text style={{ color: colores.textoSecundario }}>Esta es tu dirección predeterminada.</Text> :
      <View style={{ marginHorizontal: -MEDIDAS.margenLateral }}><FilaInterruptor titulo="Usar como predeterminada" valor={datos.predeterminada} onCambiar={(v) => { if (!guardando) cambiar('predeterminada', v); }} /></View>}
    {error ? <Text accessibilityRole="alert" style={{ color: colores.arcilla }}>{error}</Text> : null}
    <BotonPrimario texto={textoBoton} onPress={() => void enviar()} cargando={guardando}
      deshabilitado={cobertura.cargando || !!cobertura.error || !cobertura.zonas.some((z) => z.id === datos.zonaId)} />
  </View>;
}
const styles = StyleSheet.create({ formulario: { gap: ESPACIO.base }, zona: { borderWidth: 1, borderRadius: 9, padding: 12, gap: 4 }, texto: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 } });
