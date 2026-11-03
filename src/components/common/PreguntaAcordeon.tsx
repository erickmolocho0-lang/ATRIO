import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';

interface PropiedadesPreguntaAcordeon {
  pregunta: string;
  respuesta: string;
  abierta: boolean;
  alPulsar: () => void;
}

export function PreguntaAcordeon({ pregunta, respuesta, abierta, alPulsar }: PropiedadesPreguntaAcordeon) {
  const { colores } = useTema();

  return (
    <View style={[styles.contenedor, { borderBottomColor: colores.borde }]}>
      <Pressable
        onPress={alPulsar}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierta }}
        style={({ pressed }) => [styles.cabecera, pressed && styles.presionado]}
      >
        <Text style={[styles.pregunta, { color: colores.tinta }]}>{pregunta}</Text>
        <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={18} color={colores.tinta35} />
      </Pressable>
      {abierta ? <Text style={[styles.respuesta, { color: colores.textoSecundario }]}>{respuesta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { borderBottomWidth: StyleSheet.hairlineWidth },
  cabecera: {
    minHeight: MEDIDAS.areaTactilMinima,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.md,
    paddingVertical: ESPACIO.md,
  },
  presionado: { opacity: 0.6 },
  pregunta: { flex: 1, fontFamily: TIPOGRAFIA.titulo, fontSize: 14, lineHeight: 20 },
  respuesta: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, lineHeight: 19, paddingBottom: ESPACIO.md },
});
