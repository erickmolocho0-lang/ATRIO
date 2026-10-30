import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccionesAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { FormularioZonaEntrega } from '@/components/admin/FormularioZonaEntrega';
import { FormularioModalidadEntrega } from '@/components/admin/FormularioModalidadEntrega';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioEntregas } from '@/services/servicioEntregas';
import type { ConfiguracionEntregas, DatosZonaEntrega, ZonaEntrega, ModalidadEntrega } from '@/types/Entrega';
import { formatearSoles } from '@/utils/moneda';

type Edicion = { tipo: 'zona'; datos?: ZonaEntrega } | { tipo: 'modalidad'; datos: ModalidadEntrega };

export default function PantallaEntregasAdmin() {
  const { colores } = useTema();
  const [configuracion, setConfiguracion] = useState<ConfiguracionEntregas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const solicitud = useRef(0);
  const scroll = useRef<ScrollViewInstance>(null);

  const recargar = useCallback(async () => {
    const numero = ++solicitud.current;
    setCargando(true);
    setError(null);
    try {
      const datos = await servicioEntregas.obtenerConfiguracion();
      if (numero === solicitud.current) setConfiguracion(datos);
    } catch (err) {
      if (numero === solicitud.current) setError(err instanceof Error ? err.message : 'No se pudo cargar el delivery.');
    } finally {
      if (numero === solicitud.current) setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void recargar();
    return () => { solicitud.current += 1; };
  }, [recargar]));

  const editar = (datos: Edicion) => {
    setEdicion(datos);
    setError(null);
    setAviso(null);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const guardar = async (datos: DatosZonaEntrega | ModalidadEntrega) => {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      if ('tarifas' in datos) await servicioEntregas.guardarZona(datos);
      else await servicioEntregas.guardarModalidad(datos);
      setEdicion(null);
      setAviso('Los cambios de delivery se guardaron.');
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <EncabezadoPantalla titulo="Delivery" subtitulo="COBERTURA Y TARIFAS" derecha={<AccionesAdmin />} />
      <NavegacionAdmin />
      <ScrollView ref={scroll} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        {error ? <View style={styles.seccion}>
          <Text accessibilityRole="alert" style={[styles.nota, { color: colores.arcilla }]}>{error}</Text>
          {!edicion ? <BotonPrimario texto="Reintentar" variante="contorno" onPress={() => void recargar()} deshabilitado={cargando} /> : null}
        </View> : null}
        {aviso ? <Text accessibilityLiveRegion="polite" style={[styles.nota, { color: colores.tinta }]}>{aviso}</Text> : null}
        {edicion?.tipo === 'zona' && configuracion ? (
          <FormularioZonaEntrega key={edicion.datos?.id ?? 'nuevo'} inicial={edicion.datos}
            modalidades={configuracion.modalidades} guardando={guardando}
            alGuardar={(datos) => void guardar(datos)} alCancelar={() => { setEdicion(null); setError(null); }} />
        ) : edicion?.tipo === 'modalidad' ? (
          <FormularioModalidadEntrega key={edicion.datos.id} inicial={edicion.datos} guardando={guardando}
            alGuardar={(datos) => void guardar(datos)} alCancelar={() => { setEdicion(null); setError(null); }} />
        ) : cargando ? (
          <ActivityIndicator color={colores.tinta} accessibilityLabel="Cargando delivery" />
        ) : configuracion ? <>
          <Text style={[styles.nota, { color: colores.textoSecundario }]}>
            Configura las modalidades, sus horarios y el precio para cada zona o localidad. Puedes guardar zonas inactivas y habilitarlas cuando estén listas.
          </Text>
          <View style={styles.seccion}>
            <Text style={[styles.titulo, { color: colores.tinta }]}>Modalidades y horarios</Text>
            {configuracion.modalidades.map((modalidad) => (
              <Pressable key={modalidad.id} accessibilityRole="button" accessibilityLabel={`Editar ${modalidad.nombre}`}
                onPress={() => editar({ tipo: 'modalidad', datos: modalidad })}
                style={[styles.tarjeta, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
                <Text style={[styles.nombre, { color: colores.tinta }]}>{modalidad.nombre} · {modalidad.activo ? 'Activa' : 'Inactiva'}</Text>
                <Text style={[styles.nota, { color: colores.textoSecundario }]}>{modalidad.descripcion || 'Plazo pendiente de configurar'}</Text>
                <Text style={[styles.nota, { color: colores.textoSecundario }]}>{modalidad.horario || 'Horario pendiente de configurar'}</Text>
                <Text style={[styles.editar, { color: colores.arcilla }]}>Editar modalidad</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.seccion}>
            <Text style={[styles.titulo, { color: colores.tinta }]}>Zonas con cobertura</Text>
            <BotonPrimario texto="Agregar zona" onPress={() => editar({ tipo: 'zona' })} />
            {configuracion.zonas.length === 0 ? <Text style={[styles.nota, { color: colores.textoSecundario }]}>
              Aún no hay zonas registradas. Agrega la primera con las tarifas que hayas definido.
            </Text> : configuracion.zonas.map((zona) => (
              <Pressable key={zona.id} accessibilityRole="button" accessibilityLabel={`Editar zona ${zona.nombre}`}
                onPress={() => editar({ tipo: 'zona', datos: zona })}
                style={[styles.tarjeta, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
                <Text style={[styles.nombre, { color: colores.tinta }]}>{zona.nombre} · {zona.activo ? 'Activo' : 'Inactivo'}</Text>
                <Text style={[styles.nota, { color: colores.textoSecundario }]}>{[zona.distrito, zona.provincia, zona.departamento].filter(Boolean).join(', ') || 'Ubicación administrativa pendiente'}</Text>
                {zona.tarifas.map((tarifa) => {
                  const modalidad = configuracion.modalidades.find((m) => m.id === tarifa.metodoId);
                  return <Text key={tarifa.metodoId} style={[styles.nota, { color: colores.textoSecundario }]}>
                    {modalidad?.nombre ?? tarifa.metodoId}: {formatearSoles(tarifa.costo)}{modalidad?.activo ? '' : ' · Modalidad inactiva'}
                  </Text>;
                })}
                {zona.tarifas.length === 0 ? <Text style={[styles.nota, { color: colores.textoSecundario }]}>Sin tarifas configuradas</Text> : null}
                <Text style={[styles.editar, { color: colores.arcilla }]}>Editar zona y tarifas</Text>
              </Pressable>
            ))}
          </View>
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 }, contenido: { padding: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxxl, gap: ESPACIO.xl },
  seccion: { gap: ESPACIO.md }, titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18 },
  nombre: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 15 }, nota: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, lineHeight: 20 },
  tarjeta: { borderWidth: 1, borderRadius: RADIO.imagen, padding: ESPACIO.base, gap: ESPACIO.sm },
  editar: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, marginTop: ESPACIO.xs },
});
