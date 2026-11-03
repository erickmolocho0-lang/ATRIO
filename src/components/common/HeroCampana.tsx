import { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import type { CampanaInicio } from '@/types';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';
import { BotonPrimario } from './BotonPrimario';

interface PropiedadesHeroCampana {
  campana: CampanaInicio;
  alPresionarBoton: () => void;
}

const ALTURA_HERO = 330;

export function HeroCampana({ campana, alPresionarBoton }: PropiedadesHeroCampana) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  return (
    <View style={styles.contenedor}>
      <MarcadorImagenProducto uri={campana.imagenUrl} llenar radio={0} sinEtiqueta />
      <LinearGradient
        colors={['transparent', COLORS.tinta72]}
        style={styles.degradado}
        pointerEvents="none"
      />
      <View style={styles.contenido}>
        <Text style={styles.etiqueta}>{campana.etiqueta}</Text>
        <Text style={styles.titulo}>{campana.titulo}</Text>
        <BotonPrimario
          texto={campana.textoBoton}
          onPress={alPresionarBoton}
          variante="claro"
          altura={48}
          style={styles.boton}
        />
      </View>
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: {
    height: ALTURA_HERO,
    borderRadius: RADIO.imagen,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.lino,
  },
  degradado: {
    ...StyleSheet.absoluteFill,
    top: '40%',
  },
  contenido: {
    padding: ESPACIO.lg,
    gap: ESPACIO.md,
  },
  etiqueta: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 2,
    color: COLORS.papel,
  },
  titulo: {
    fontFamily: TIPOGRAFIA.display,
    fontSize: 30,
    lineHeight: 34,
    color: COLORS.papel,
  },
  boton: {
    alignSelf: 'flex-start',
    paddingHorizontal: ESPACIO.xl,
    marginTop: ESPACIO.xs,
  },
});
