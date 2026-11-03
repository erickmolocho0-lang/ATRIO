import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import type { Categoria } from '@/types';
import { MarcadorImagenProducto } from './MarcadorImagenProducto';

interface PropiedadesCirculoCategoria {
  categoria: Categoria;
  alPresionar: () => void;
}

const DIAMETRO = 82;

export function CirculoCategoria({ categoria, alPresionar }: PropiedadesCirculoCategoria) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  return (
    <Pressable style={styles.contenedor} onPress={alPresionar} accessibilityRole="button">
      <View style={styles.circulo}>
        <MarcadorImagenProducto uri={categoria.imagenUrl} llenar radio={DIAMETRO / 2} sinEtiqueta />
      </View>
      <Text style={styles.nombre} numberOfLines={1}>
        {categoria.nombre}
      </Text>
    </Pressable>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: { alignItems: 'center', gap: ESPACIO.sm, width: DIAMETRO },
  circulo: {
    width: DIAMETRO,
    height: DIAMETRO,
    borderRadius: DIAMETRO / 2,
    overflow: 'hidden',
    backgroundColor: COLORS.lino,
  },
  nombre: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11,
    color: COLORS.tinta,
  },
});
