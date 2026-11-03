import { useEffect, useState, useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { RADIO, RELACION_IMAGEN, TIPOGRAFIA } from '@/constants/theme';

interface PropiedadesMarcadorImagenProducto {
  /** URL o URI real de la foto. Sin esto, se muestra el marcador de posición (rayas). */
  uri?: string;
  relacion?: number;
  etiquetaDimension?: string;
  radio?: number;
  sinEtiqueta?: boolean;
  llenar?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CANTIDAD_RAYAS = 26;

export function MarcadorImagenProducto({
  uri,
  relacion = RELACION_IMAGEN.producto,
  etiquetaDimension = '900×1200',
  radio = RADIO.imagen,
  sinEtiqueta = false,
  llenar = false,
  style,
}: PropiedadesMarcadorImagenProducto) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const [fallo, setFallo] = useState(false);

  // Si cambia la URL (ej. otro producto/categoría reutilizando el mismo
  // componente), se reintenta desde cero en vez de arrastrar el error de
  // la imagen anterior.
  useEffect(() => {
    setFallo(false);
  }, [uri]);

  if (uri && !fallo) {
    return (
      <View style={[styles.contenedor, { borderRadius: radio }, llenar ? styles.lleno : { aspectRatio: relacion }, style]}>
        <Image
          source={{ uri }}
          style={styles.imagenReal}
          resizeMode="cover"
          onError={() => setFallo(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.contenedor,
        { borderRadius: radio },
        llenar ? styles.lleno : { aspectRatio: relacion },
        style,
      ]}
    >
      <View style={styles.rayas} pointerEvents="none">
        {Array.from({ length: CANTIDAD_RAYAS }).map((_, indice) => (
          <View key={indice} style={[styles.raya, { top: indice * 26 - 160 }]} />
        ))}
      </View>
      {!sinEtiqueta ? <Text style={styles.etiqueta}>{`[ ${etiquetaDimension} ]`}</Text> : null}
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: {
    width: '100%',
    backgroundColor: COLORS.lino,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lleno: StyleSheet.absoluteFill,
  imagenReal: { width: '100%', height: '100%' },
  rayas: StyleSheet.absoluteFill,
  raya: {
    position: 'absolute',
    left: -200,
    right: -200,
    height: 1.5,
    backgroundColor: COLORS.tinta08,
    transform: [{ rotate: '-45deg' }],
  },
  etiqueta: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.tinta45,
  },
});
