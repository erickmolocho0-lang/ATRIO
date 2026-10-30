import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { CampoBusqueda } from '@/components/common/CampoBusqueda';
import { ChipCategoria } from '@/components/products/ChipCategoria';
import { PanelFiltros } from '@/components/products/PanelFiltros';
import { TarjetaProducto } from '@/components/products/TarjetaProducto';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCatalogo } from '@/hooks/useCatalogo';
import { useCategorias } from '@/hooks/useCategorias';
import { useFavoritos } from '@/hooks/useFavoritos';
import { useTema } from '@/hooks/useTema';

export default function PantallaCatalogo() {
  const { colores } = useTema();
  const parametros = useLocalSearchParams<{ categoria?: string }>();
  const categorias = useCategorias();
  const { esFavorito, alternarFavorito } = useFavoritos();
  const [panelVisible, setPanelVisible] = useState(false);

  const catalogo = useCatalogo({ categoriaInicial: parametros.categoria ?? 'todo' });
  const {
    terminoBusqueda,
    setTerminoBusqueda,
    categoriaActiva,
    setCategoriaActiva,
    orden,
    setOrden,
    filtros,
    setFiltros,
    reiniciarFiltros,
    productosVisibles,
    contadorResultados,
    hayMas,
    cargarMas,
    cargandoMas,
  } = catalogo;

  useEffect(() => {
    if (parametros.categoria) setCategoriaActiva(parametros.categoria);
  }, [parametros.categoria, setCategoriaActiva]);

  const nombreCategoriaActiva =
    categoriaActiva === 'todo'
      ? 'TODO'
      : (categorias.find((c) => c.id === categoriaActiva)?.nombre ?? 'TODO').toUpperCase();

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <View style={[styles.bloqueSuperior, { borderBottomColor: colores.borde }]}>
        <View style={styles.filaBusqueda}>
          <CampoBusqueda
            valor={terminoBusqueda}
            alCambiar={setTerminoBusqueda}
            placeholder="Buscar prendas, marcas, colores"
          />
          <Pressable
            style={[styles.botonOrden, { backgroundColor: colores.tinta }]}
            onPress={() => setPanelVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Orden y filtros"
          >
            <Ionicons name="options-outline" size={20} color={colores.papel} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <ChipCategoria
            texto="Todo"
            activo={categoriaActiva === 'todo'}
            alPresionar={() => setCategoriaActiva('todo')}
          />
          {categorias.map((categoria) => (
            <ChipCategoria
              key={categoria.id}
              texto={categoria.nombre}
              activo={categoriaActiva === categoria.id}
              alPresionar={() => setCategoriaActiva(categoria.id)}
            />
          ))}
        </ScrollView>

        <Text style={[styles.contador, { color: colores.textoSecundario }]}>
          {contadorResultados} {contadorResultados === 1 ? 'RESULTADO' : 'RESULTADOS'} ·{' '}
          {nombreCategoriaActiva}
        </Text>
      </View>

      <FlatList
        data={productosVisibles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.filaRejilla}
        contentContainerStyle={styles.rejilla}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hayMas && cargarMas()}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <View style={styles.celda}>
            <TarjetaProducto
              producto={item}
              mostrarEtiquetas
              alPresionar={() => router.push(`/producto/${item.id}`)}
              esFavorito={esFavorito(item.id)}
              alAlternarFavorito={() => alternarFavorito(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          cargandoMas ? (
            <View style={styles.pieCargando}>
              <ActivityIndicator color={colores.textoSecundario} size="small" />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EstadoVacio
            titulo={`Sin resultados para «${terminoBusqueda.trim() || nombreCategoriaActiva.toLowerCase()}»`}
            descripcion="Prueba con otra categoría o cambia los filtros."
            textoBoton="VER TODO"
            alPresionarBoton={() => {
              setTerminoBusqueda('');
              setCategoriaActiva('todo');
              reiniciarFiltros();
            }}
          />
        }
      />

      <PanelFiltros
        visible={panelVisible}
        alCerrar={() => setPanelVisible(false)}
        orden={orden}
        alCambiarOrden={setOrden}
        filtros={filtros}
        alCambiarFiltros={setFiltros}
        alReiniciar={reiniciarFiltros}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  bloqueSuperior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    paddingBottom: ESPACIO.md,
    borderBottomWidth: 1,
  },
  filaBusqueda: { flexDirection: 'row', gap: ESPACIO.sm },
  botonOrden: {
    width: MEDIDAS.areaTactilMinima,
    height: MEDIDAS.areaTactilMinima,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: ESPACIO.sm, paddingTop: ESPACIO.md },
  contador: {
    marginTop: ESPACIO.md,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  rejilla: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.base,
    paddingBottom: ESPACIO.xxl,
    flexGrow: 1,
  },
  filaRejilla: { gap: MEDIDAS.gapTarjetas },
  celda: { flex: 1, marginBottom: MEDIDAS.gapTarjetas },
  pieCargando: { paddingVertical: ESPACIO.base, alignItems: 'center' },
});
