import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import type { MetodoEntrega } from '@/types';
import { formatearSoles } from '@/utils/moneda';

interface PropiedadesOpcionEntrega {
  metodo: MetodoEntrega;
  seleccionado: boolean;
  alSeleccionar: () => void;
}

export function OpcionEntrega({ metodo, seleccionado, alSeleccionar }: PropiedadesOpcionEntrega) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
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
        color={seleccionado ? COLORS.tinta : COLORS.tinta40}
      />
      <View style={styles.textos}>
        <Text style={styles.nombre}>{metodo.nombre}</Text>
        <Text style={styles.descripcion}>{metodo.descripcion}</Text>
      </View>
      <Text style={styles.costo}>{metodo.costo === 0 ? 'Gratis' : formatearSoles(metodo.costo)}</Text>
    </Pressable>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: {
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
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
  seleccionado: { borderColor: COLORS.tinta },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  descripcion: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
  costo: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: COLORS.tinta },
});
