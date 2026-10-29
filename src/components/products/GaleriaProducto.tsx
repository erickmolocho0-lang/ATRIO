import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, RELACION_IMAGEN } from '@/constants/theme';
import { MarcadorImagenProducto } from './MarcadorImagenProducto';

interface PropiedadesGaleriaProducto {
  imagenes: string[];
  esFavorito: boolean;
  alAlternarFavorito: () => void;
  alVolver: () => void;
  offsetSuperior?: number;
}

const ANCHO = Dimensions.get('window').width;
const ALTO = ANCHO / RELACION_IMAGEN.producto;

export function GaleriaProducto({
  imagenes,
  esFavorito,
  alAlternarFavorito,
  alVolver,
  offsetSuperior = 0,
}: PropiedadesGaleriaProducto) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const cantidad = imagenes.length > 0 ? imagenes.length : 3;
  const [indiceActivo, setIndiceActivo] = useState(0);

  const alDesplazar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    const indice = Math.round(evento.nativeEvent.contentOffset.x / ANCHO);
    if (indice !== indiceActivo) setIndiceActivo(indice);
  };

  return (
    <View style={{ height: ALTO }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alDesplazar}
      >
        {Array.from({ length: cantidad }).map((_, indice) => (
          <MarcadorImagenProducto
            key={indice}
            uri={imagenes[indice]}
            relacion={RELACION_IMAGEN.producto}
            radio={0}
            style={{ width: ANCHO }}
          />
        ))}
      </ScrollView>

      <View style={[styles.botones, { top: offsetSuperior + ESPACIO.md }]} pointerEvents="box-none">
        <Pressable
          style={styles.botonCircular}
          onPress={alVolver}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.tinta} />
        </Pressable>
        <Pressable
          style={styles.botonCircular}
          onPress={alAlternarFavorito}
          accessibilityRole="button"
          accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          hitSlop={8}
        >
          <Ionicons
            name={esFavorito ? 'heart' : 'heart-outline'}
            size={19}
            color={esFavorito ? COLORS.arcilla : COLORS.tinta}
          />
        </Pressable>
      </View>

      <View style={styles.indicadores} pointerEvents="none">
        {Array.from({ length: cantidad }).map((_, indice) => (
          <View
            key={indice}
            style={[styles.indicador, indice === indiceActivo && styles.indicadorActivo]}
          />
        ))}
      </View>
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  botones: {
    position: 'absolute',
    left: ESPACIO.lg,
    right: ESPACIO.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonCircular: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.papel90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicadores: {
    position: 'absolute',
    bottom: ESPACIO.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: ESPACIO.xs,
  },
  indicador: {
    width: 22,
    height: 3,
    backgroundColor: COLORS.tinta20,
  },
  indicadorActivo: { backgroundColor: COLORS.tinta },
});
