import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import type { MetodoEntrega } from '@/types';
import { formatearSoles } from '@/utils/moneda';

interface PropiedadesOpcionEntrega {
  metodo: MetodoEntrega;
  seleccionado: boolean;
  alSeleccionar: () => void;
}

export function OpcionEntrega({ metodo, seleccionado, alSeleccionar }: PropiedadesOpcionEntrega) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  return (
    <Pressable
      style={[styles.contenedor, seleccionado && styles.seleccionado]}
      onPress={alSeleccionar}
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={metodo.nombre}
    >
      <Ionicons
        name={seleccionado ? 'radio-button-on' : 'radio-button-off'}
        size={20}
        color={seleccionado ? colores.tinta : colores.tinta40}
      />
      <View style={styles.textos}>
        <Text style={styles.nombre}>{metodo.nombre}</Text>
        <Text style={styles.descripcion}>{metodo.descripcion}</Text>
      </View>
      <Text style={styles.costo}>{metodo.costo === 0 ? 'Gratis' : formatearSoles(metodo.costo)}</Text>
    </Pressable>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  contenedor: {
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: colores.blanco,
  },
  seleccionado: { borderColor: colores.tinta },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: colores.tinta },
  descripcion: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.textoSecundario },
  costo: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: colores.tinta },
});
