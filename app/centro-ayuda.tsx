import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MEDIDAS, TIPOGRAFIA, ESPACIO, RADIO } from '@/constants/theme';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { PreguntaAcordeon } from '@/components/common/PreguntaAcordeon';
import { useCentroAyuda } from '@/hooks/useCentroAyuda';
import { useTema } from '@/hooks/useTema';

export default function PantallaCentroAyuda() {
  const { colores } = useTema();
  const { secciones, horario, opcionesContacto, preguntaAbierta, alternarPregunta, abrirContacto } =
    useCentroAyuda();

  return (
    <SafeAreaView style={[styles.contenedor, { backgroundColor: colores.papel }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <EncabezadoPantalla titulo="Centro de ayuda" conBotonVolver />

        {secciones.map((seccion) => (
          <View key={seccion.id} style={styles.seccion}>
            <Text style={[styles.etiquetaSeccion, { color: colores.tinta50 }]}>{seccion.titulo}</Text>
            {seccion.preguntas.map((item) => (
              <PreguntaAcordeon
                key={item.id}
                pregunta={item.pregunta}
                respuesta={item.respuesta}
                abierta={preguntaAbierta === item.id}
                alPulsar={() => alternarPregunta(item.id)}
              />
            ))}
          </View>
        ))}

        {opcionesContacto.length > 0 ? (
          <View style={[styles.tarjetaContacto, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
            <Text style={[styles.tituloContacto, { color: colores.tinta }]}>¿Necesitas más ayuda?</Text>
            {horario ? (
              <Text style={[styles.horario, { color: colores.textoSecundario }]}>Atención: {horario}</Text>
            ) : null}
            {opcionesContacto.map((opcion) => (
              <Pressable
                key={opcion.id}
                onPress={() => abrirContacto(opcion)}
                accessibilityRole="button"
                accessibilityLabel={opcion.texto}
                style={({ pressed }) => [
                  styles.botonContacto,
                  { borderColor: colores.borde, backgroundColor: colores.lino },
                  pressed && styles.presionado,
                ]}
              >
                <Ionicons name={opcion.icono} size={20} color={colores.arcilla} />
                <Text style={[styles.textoBoton, { color: colores.tinta }]}>{opcion.texto}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  contenido: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxxl, gap: ESPACIO.lg },
  seccion: { gap: ESPACIO.xs },
  etiquetaSeccion: { fontFamily: TIPOGRAFIA.mono, fontSize: 9.5, letterSpacing: 1.5, marginTop: ESPACIO.sm },
  tarjetaContacto: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIO.resumen,
    padding: ESPACIO.base,
    gap: ESPACIO.sm,
    marginTop: ESPACIO.sm,
  },
  tituloContacto: { fontFamily: TIPOGRAFIA.titulo, fontSize: 15 },
  horario: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12.5 },
  botonContacto: {
    minHeight: MEDIDAS.areaTactilMinima,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIO.resumen,
    paddingHorizontal: ESPACIO.base,
  },
  textoBoton: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 14 },
  presionado: { opacity: 0.6 },
});
