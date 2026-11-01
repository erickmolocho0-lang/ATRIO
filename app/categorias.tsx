import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCategorias } from '@/hooks/useCategorias';

export default function PantallaCategorias() {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const categorias = useCategorias();

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Categorías" conBotonVolver />
      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={styles.fila}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: '/(tabs)/catalogo', params: { categoria: item.id } })
            }
          >
            <View style={styles.miniatura}>
              <MarcadorImagenProducto llenar sinEtiqueta radio={6} />
            </View>
            <View style={styles.textos}>
              <Text style={styles.nombre}>{item.nombre}</Text>
              <Text style={styles.subcategorias} numberOfLines={1}>
                {item.subcategorias.join(' · ')}
              </Text>
            </View>
            <Text style={styles.conteo}>{item.conteoArticulos}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.tinta45} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  lista: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
  fila: {
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borde,
  },
  miniatura: {
    width: 64,
    height: 64,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.lino,
  },
  textos: { flex: 1, gap: ESPACIO.xs },
  nombre: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 14, color: COLORS.tinta },
  subcategorias: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 11, color: COLORS.textoSecundario },
  conteo: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.tinta45 },
});
