import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CarruselCampana } from '@/components/common/CarruselCampana';
import { CirculoCategoria } from '@/components/products/CirculoCategoria';
import { TarjetaProducto } from '@/components/products/TarjetaProducto';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useInicio } from '@/hooks/useInicio';

export default function PantallaInicio() {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const { campanas, categorias, novedades } = useInicio();
  const { esFavorito, alternarFavorito, cantidadFavoritos } = useFavoritos();

  const irACatalogo = (categoria?: string) =>
    router.push(
      categoria
        ? { pathname: '/(tabs)/catalogo', params: { categoria } }
        : '/(tabs)/catalogo',
    );

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cabecera}>
          <Text style={styles.marca}>ATRIO</Text>
          <View style={styles.accesos}>
            <Pressable
              onPress={() => irACatalogo()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Buscar"
              style={styles.acceso}
            >
              <Ionicons name="search" size={22} color={COLORS.tinta} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/favoritos')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Favoritos"
              style={styles.acceso}
            >
              <Ionicons name="heart-outline" size={22} color={COLORS.tinta} />
              {cantidadFavoritos > 0 ? (
                <View style={styles.contador}>
                  <Text style={styles.contadorTexto}>{cantidadFavoritos}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.bloque}>
          <CarruselCampana campanas={campanas} alPresionarBoton={irACatalogo} />
        </View>

        <View style={[styles.bloque, styles.encabezadoSeccion]}>
          <Text style={styles.tituloSeccion}>Categorías</Text>
          <Pressable
            onPress={() => router.push('/categorias')}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.enlace}>Ver todas →</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carrusel}
        >
          {categorias.map((categoria) => (
            <CirculoCategoria
              key={categoria.id}
              categoria={categoria}
              alPresionar={() => irACatalogo(categoria.id)}
            />
          ))}
        </ScrollView>

        <View style={[styles.bloque, styles.encabezadoSeccion]}>
          <Text style={styles.tituloSeccion}>Novedades</Text>
          <Pressable
            onPress={() => irACatalogo()}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.enlace}>Ver todo →</Text>
          </Pressable>
        </View>

        <View style={[styles.bloque, styles.rejilla]}>
          {novedades.map((producto) => (
            <View key={producto.id} style={styles.celda}>
              <TarjetaProducto
                producto={producto}
                alPresionar={() => router.push(`/producto/${producto.id}`)}
                esFavorito={esFavorito(producto.id)}
                alAlternarFavorito={() => alternarFavorito(producto.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  contenido: { paddingBottom: ESPACIO.xxl },
  bloque: { paddingHorizontal: MEDIDAS.margenLateral },
  cabecera: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingVertical: ESPACIO.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MEDIDAS.areaTactilMinima,
  },
  marca: { fontFamily: TIPOGRAFIA.display, fontSize: 21, color: COLORS.tinta },
  accesos: { flexDirection: 'row', gap: ESPACIO.base },
  acceso: {
    minWidth: MEDIDAS.areaTactilMinima,
    minHeight: MEDIDAS.areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contador: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: COLORS.arcilla,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 9, color: COLORS.papel },
  carrusel: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.base,
    gap: ESPACIO.base,
  },
  encabezadoSeccion: {
    marginTop: MEDIDAS.separacionSecciones,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloSeccion: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18, color: COLORS.tinta },
  enlace: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, color: COLORS.textoSecundario },
  rejilla: {
    marginTop: ESPACIO.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MEDIDAS.gapTarjetas,
  },
  celda: { width: '47%', flexGrow: 1 },
});
