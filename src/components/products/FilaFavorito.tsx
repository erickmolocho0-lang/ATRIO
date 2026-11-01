import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import type { Producto } from '@/types';
import { formatearSoles } from '@/utils/moneda';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { MarcadorImagenProducto } from './MarcadorImagenProducto';

interface PropiedadesFilaFavorito {
  producto: Producto;
  alPresionar: () => void;
  alQuitarFavorito: () => void;
  alAgregar: () => void;
}

export function FilaFavorito({
  producto,
  alPresionar,
  alQuitarFavorito,
  alAgregar,
}: PropiedadesFilaFavorito) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const noDisponible = producto.activo === false;

  return (
    <View style={styles.contenedor}>
      <Pressable style={styles.miniatura} onPress={alPresionar} accessibilityRole="button">
        <MarcadorImagenProducto uri={producto.imagenes[0]} llenar sinEtiqueta />
      </Pressable>

      <View style={styles.info}>
        <View style={styles.filaSuperior}>
          <Pressable style={styles.textos} onPress={alPresionar} accessibilityRole="button">
            <Text style={styles.nombre} numberOfLines={1}>
              {producto.nombre}
            </Text>
            <Text style={styles.categoria}>{producto.categoriaNombre}</Text>
            <Text style={styles.precio}>{formatearSoles(producto.precio)}</Text>
            {noDisponible ? <Text style={styles.noDisponible}>Ya no disponible</Text> : null}
          </Pressable>
          <Pressable
            onPress={alQuitarFavorito}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Quitar de favoritos"
          >
            <Ionicons name="heart" size={18} color={COLORS.arcilla} />
          </Pressable>
        </View>

        <BotonPrimario
          texto={noDisponible ? 'NO DISPONIBLE' : 'AÑADIR'}
          onPress={alAgregar}
          deshabilitado={noDisponible}
          altura={40}
          style={styles.boton}
        />
      </View>
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: { flexDirection: 'row', gap: ESPACIO.md },
  miniatura: {
    width: 78,
    height: 104,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.lino,
  },
  info: { flex: 1, justifyContent: 'space-between' },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ESPACIO.sm,
  },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, color: COLORS.tinta },
  categoria: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.tinta50 },
  precio: {
    marginTop: ESPACIO.xs,
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 13,
    color: COLORS.tinta,
  },
  noDisponible: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11, color: COLORS.arcilla },
  boton: { alignSelf: 'flex-start', paddingHorizontal: ESPACIO.xl, marginTop: ESPACIO.sm },
});
