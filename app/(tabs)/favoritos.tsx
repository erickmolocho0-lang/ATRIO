import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { FilaFavorito } from '@/components/products/FilaFavorito';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS } from '@/constants/theme';
import { useCarrito } from '@/hooks/useCarrito';
import { useFavoritos } from '@/hooks/useFavoritos';

export default function PantallaFavoritos() {
  const { productosFavoritos, quitarFavorito } = useFavoritos();
  const { agregarItem } = useCarrito();

  const cantidad = productosFavoritos.length;
  const subtitulo =
    cantidad === 1 ? '1 PRENDA GUARDADA' : `${cantidad} PRENDAS GUARDADAS`;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla
        titulo="Favoritos"
        subtitulo={cantidad > 0 ? subtitulo : undefined}
      />
      <FlatList
        data={productosFavoritos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FilaFavorito
            producto={item}
            alPresionar={() => router.push(`/producto/${item.id}`)}
            alQuitarFavorito={() => quitarFavorito(item.id)}
            alAgregar={() => {
              const varianteDisponible = item.variantes.find((v) => v.stock > 0);
              if (!varianteDisponible) {
                router.push(`/producto/${item.id}`);
                return;
              }
              agregarItem(item, varianteDisponible.id, 1);
              router.push('/(tabs)/carrito');
            }}
          />
        )}
        ListEmptyComponent={
          <EstadoVacio
            icono="heart-outline"
            titulo="Aún no guardas prendas"
            descripcion="Guarda desde el catálogo o el detalle de producto para tenerlas a mano."
            textoBoton="EXPLORAR CATÁLOGO"
            alPresionarBoton={() => router.push('/(tabs)/catalogo')}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  lista: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingBottom: ESPACIO.xxl,
    flexGrow: 1,
  },
  separador: { height: MEDIDAS.separacionSecciones },
});
