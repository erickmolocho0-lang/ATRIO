import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { metodosPago } from '@/data/metodosPago';

// El cliente elige qué método aparece marcado al pagar.
// No se guardan tarjetas: los datos de la tarjeta se escriben en Mercado Pago.
export default function PantallaMetodosPago() {
  const { preferencias, elegirMetodoPagoPreferido } = useConfiguracion();

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Métodos de pago" conBotonVolver />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.tituloSeccion}>MÉTODO PREFERIDO</Text>
        {metodosPago.map((opcion) => {
          const seleccionado = opcion.metodo === preferencias.metodoPagoPreferido;
          return (
            <Pressable
              key={opcion.metodo}
              style={[styles.opcion, seleccionado && styles.opcionSeleccionada]}
              onPress={() => elegirMetodoPagoPreferido(opcion.metodo)}
              accessibilityRole="radio"
              accessibilityState={{ selected: seleccionado }}
            >
              <Ionicons
                name={seleccionado ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={seleccionado ? COLORS.tinta : COLORS.tinta40}
              />
              <View style={styles.textos}>
                <Text style={styles.nombre}>{opcion.nombre}</Text>
                <Text style={styles.detalle}>{opcion.descripcion}</Text>
              </View>
            </Pressable>
          );
        })}
        <Text style={styles.detalle}>Los pagos con tarjeta y Yape se procesan con Mercado Pago.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  contenido: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.sm,
    paddingBottom: ESPACIO.xxl,
    gap: ESPACIO.base,
  },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textoSecundario,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: COLORS.blanco,
  },
  opcionSeleccionada: { borderColor: COLORS.tinta },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  detalle: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
});
