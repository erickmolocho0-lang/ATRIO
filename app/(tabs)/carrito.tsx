import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { CampoCupon } from '@/components/cart/CampoCupon';
import { FilaItemCarrito } from '@/components/cart/ItemCarrito';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCarrito } from '@/hooks/useCarrito';
import { formatearSoles } from '@/utils/moneda';

export default function PantallaCarrito() {
  const insets = useSafeAreaInsets();
  const {
    items,
    contador,
    codigoCupon,
    resumen,
    cambiarCantidad,
    quitarItem,
    aplicarCupon,
    quitarCupon,
  } = useCarrito();

  const vacio = items.length === 0;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla
        titulo="Carrito"
        derecha={
          !vacio ? (
            <Text style={styles.itemsCabecera}>
              {contador} {contador === 1 ? 'ÍTEM' : 'ÍTEMS'}
            </Text>
          ) : undefined
        }
      />

      {vacio ? (
        <EstadoVacio
          titulo="Tu carrito está vacío"
          descripcion="Añade prendas desde el catálogo para continuar con la compra."
          textoBoton="VER NOVEDADES"
          alPresionarBoton={() => router.push('/(tabs)')}
        />
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => `${item.producto.id}-${item.varianteId}`}
            contentContainerStyle={styles.lista}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <FilaItemCarrito
                item={item}
                alCambiarCantidad={(cantidad) =>
                  cambiarCantidad(item.producto.id, item.varianteId, cantidad)
                }
                alEliminar={() => quitarItem(item.producto.id, item.varianteId)}
              />
            )}
            ListFooterComponent={
              <View style={styles.pie}>
                <CampoCupon
                  codigoAplicado={codigoCupon}
                  alAplicar={aplicarCupon}
                  alQuitar={quitarCupon}
                />
                <ResumenCarrito resumen={resumen} />
              </View>
            }
          />

          <View style={[styles.barraInferior, { paddingBottom: insets.bottom + ESPACIO.md }]}>
            <Pressable
              style={({ pressed }) => [styles.botonPagar, pressed && styles.botonPagarPresionado]}
              accessibilityRole="button"
              onPress={() => router.push('/checkout')}
            >
              <Text style={styles.botonPagarTexto}>CONTINUAR AL PAGO</Text>
              <Text style={styles.botonPagarImporte}>{formatearSoles(resumen.total)}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  itemsCabecera: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.textoSecundario,
  },
  lista: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
  separador: { height: MEDIDAS.separacionSecciones },
  pie: { marginTop: MEDIDAS.separacionSecciones, gap: ESPACIO.base },
  barraInferior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
    backgroundColor: COLORS.papel,
  },
  botonPagar: {
    height: 54,
    borderRadius: 9,
    backgroundColor: COLORS.tinta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: ESPACIO.lg,
  },
  botonPagarPresionado: { opacity: 0.85 },
  botonPagarTexto: {
    fontFamily: TIPOGRAFIA.titulo,
    fontSize: 13,
    letterSpacing: 1,
    color: COLORS.papel,
  },
  botonPagarImporte: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 14,
    color: COLORS.papel,
  },
});
