import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';

interface PropiedadesSelectorTalla {
  tallas: string[];
  tallasHabilitadas: string[];
  tallaSeleccionada: string | null;
  alSeleccionar: (talla: string) => void;
}

export function SelectorTalla({
  tallas,
  tallasHabilitadas,
  tallaSeleccionada,
  alSeleccionar,
}: PropiedadesSelectorTalla) {
  return (
    <View>
      <Text style={styles.etiqueta}>TALLA</Text>
      <View style={styles.opciones}>
        {tallas.map((talla) => {
          const disponible = tallasHabilitadas.includes(talla);
          const seleccionada = talla === tallaSeleccionada;
          return (
            <Pressable
              key={talla}
              disabled={!disponible}
              onPress={() => alSeleccionar(talla)}
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionada, disabled: !disponible }}
              style={[
                styles.opcion,
                seleccionada && styles.seleccionada,
                !disponible && styles.agotada,
              ]}
            >
              <Text
                style={[
                  styles.texto,
                  seleccionada && styles.textoSeleccionada,
                  !disponible && styles.textoAgotada,
                ]}
              >
                {talla}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: COLORS.tinta50,
    marginBottom: ESPACIO.md,
  },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  opcion: {
    width: 52,
    height: 44,
    borderRadius: RADIO.talla,
    borderWidth: 1,
    borderColor: COLORS.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seleccionada: { backgroundColor: COLORS.tinta, borderColor: COLORS.tinta },
  agotada: { backgroundColor: COLORS.lino, borderColor: COLORS.borde },
  texto: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.tinta },
  textoSeleccionada: { color: COLORS.papel },
  textoAgotada: { color: COLORS.tinta40, textDecorationLine: 'line-through' },
});
