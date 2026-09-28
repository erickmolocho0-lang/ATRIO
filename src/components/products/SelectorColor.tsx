import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import type { ColorProducto } from '@/types';

interface PropiedadesSelectorColor {
  colores: ColorProducto[];
  coloresHabilitados: string[];
  colorSeleccionado: string | null;
  alSeleccionar: (colorId: string) => void;
}

export function SelectorColor({
  colores,
  coloresHabilitados,
  colorSeleccionado,
  alSeleccionar,
}: PropiedadesSelectorColor) {
  return (
    <View>
      <Text style={styles.etiqueta}>COLOR</Text>
      <View style={styles.opciones}>
        {colores.map((color) => {
          const disponible = coloresHabilitados.includes(color.id);
          const seleccionado = color.id === colorSeleccionado;
          return (
            <Pressable
              key={color.id}
              disabled={!disponible}
              onPress={() => alSeleccionar(color.id)}
              accessibilityRole="button"
              accessibilityLabel={color.nombre}
              accessibilityState={{ selected: seleccionado, disabled: !disponible }}
              style={styles.opcion}
            >
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: color.hex },
                  seleccionado && styles.swatchSeleccionado,
                  !disponible && styles.swatchAgotado,
                ]}
              />
              <Text style={[styles.texto, !disponible && styles.textoAgotado]}>{color.nombre}</Text>
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
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.md },
  opcion: { alignItems: 'center', gap: ESPACIO.xs, width: 52 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borde,
  },
  swatchSeleccionado: { borderWidth: 2, borderColor: COLORS.tinta },
  swatchAgotado: { opacity: 0.3 },
  texto: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 10,
    color: COLORS.tinta,
    textAlign: 'center',
  },
  textoAgotado: { color: COLORS.tinta40, textDecorationLine: 'line-through' },
});
