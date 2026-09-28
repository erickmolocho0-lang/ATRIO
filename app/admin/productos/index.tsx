import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FilaProductoAdmin } from '@/components/admin/FilaProductoAdmin';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { CampoBusqueda } from '@/components/common/CampoBusqueda';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ChipCategoria } from '@/components/products/ChipCategoria';
import { ESPACIO, MEDIDAS } from '@/constants/theme';
import { useAdminProductos, type FiltroEstado } from '@/hooks/useAdminProductos';
import { useTema } from '@/hooks/useTema';

const OPCIONES_ESTADO: { valor: FiltroEstado; texto: string }[] = [
  { valor: 'todos', texto: 'Todos' },
  { valor: 'activos', texto: 'Activos' },
  { valor: 'inactivos', texto: 'Inactivos' },
];

export default function PantallaListaProductosAdmin() {
  const { colores } = useTema();
  const {
    productos,
    totalSinFiltrar,
    categorias,
    cargando,
    busqueda,
    setBusqueda,
    categoriaId,
    setCategoriaId,
    estado,
    setEstado,
    soloStockBajo,
    setSoloStockBajo,
    alternarActivo,
  } = useAdminProductos();

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <BotonCerrarSesionAdmin />
      </SafeAreaView>
      <NavegacionAdmin />

      <EncabezadoPantalla
        titulo="Productos"
        subtitulo={cargando ? undefined : `${productos.length} DE ${totalSinFiltrar}`}
        derecha={
          <Pressable
            onPress={() => router.push('/admin/productos/nuevo')}
            style={[styles.botonNuevo, { backgroundColor: colores.tinta }]}
            accessibilityRole="button"
            accessibilityLabel="Crear producto"
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={colores.papel} />
          </Pressable>
        }
      />

      <View style={styles.filtros}>
        <CampoBusqueda
          valor={busqueda}
          alCambiar={setBusqueda}
          placeholder="Buscar por nombre o SKU"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {OPCIONES_ESTADO.map((opcion) => (
            <ChipCategoria
              key={opcion.valor}
              texto={opcion.texto}
              activo={estado === opcion.valor}
              alPresionar={() => setEstado(opcion.valor)}
            />
          ))}
          <ChipCategoria
            texto="Stock bajo"
            activo={soloStockBajo}
            alPresionar={() => setSoloStockBajo(!soloStockBajo)}
          />
          <ChipCategoria
            texto="Todas las categorías"
            activo={categoriaId === 'todas'}
            alPresionar={() => setCategoriaId('todas')}
          />
          {categorias.map((categoria) => (
            <ChipCategoria
              key={categoria.id}
              texto={categoria.nombre}
              activo={categoriaId === categoria.id}
              alPresionar={() => setCategoriaId(categoria.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={productos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FilaProductoAdmin
            producto={item}
            alPresionar={() => router.push(`/admin/productos/${item.id}`)}
            alAlternarActivo={() => alternarActivo(item.id)}
          />
        )}
        ListEmptyComponent={
          cargando ? null : (
            <EstadoVacio
              titulo="Sin productos"
              descripcion="No hay productos que coincidan con la búsqueda o los filtros."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barraSuperior: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.sm,
  },
  botonNuevo: {
    width: MEDIDAS.areaTactilMinima - 8,
    height: MEDIDAS.areaTactilMinima - 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtros: { paddingHorizontal: MEDIDAS.margenLateral, gap: ESPACIO.sm, paddingBottom: ESPACIO.sm },
  chips: { gap: ESPACIO.sm, paddingVertical: ESPACIO.xs },
  lista: { paddingBottom: ESPACIO.xxl },
});
