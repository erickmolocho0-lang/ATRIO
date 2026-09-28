import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { FilaResumenItem } from '@/components/checkout/FilaResumenItem';
import { OpcionEntrega } from '@/components/checkout/OpcionEntrega';
import { TarjetaDireccion } from '@/components/checkout/TarjetaDireccion';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCheckout } from '@/hooks/useCheckout';

function TituloSeccion({ texto }: { texto: string }) {
  return <Text style={styles.tituloSeccion}>{texto}</Text>;
}

export default function PantallaCheckout() {
  const insets = useSafeAreaInsets();
  const {
    items,
    resumen,
    metodosEntrega,
    metodoEntrega,
    seleccionarMetodoEntrega,
    direccion,
    problemas,
    puedeContinuar,
    validando,
    continuarAPago,
  } = useCheckout();

  // El retiro en tienda no necesita dirección; antes de elegir método, la mostramos igual.
  const requiereDireccion = metodoEntrega?.tipo !== 'retiro';

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <EncabezadoPantalla titulo="Checkout" conBotonVolver />
        <EstadoVacio
          titulo="Tu carrito está vacío"
          descripcion="Agrega productos desde el catálogo antes de continuar con el checkout."
          textoBoton="IR AL CARRITO"
          alPresionarBoton={() => router.replace('/(tabs)/carrito')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Checkout" conBotonVolver />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.seccion}>
          <TituloSeccion texto="MÉTODO DE ENTREGA" />
          <View style={styles.listaOpciones}>
            {metodosEntrega.map((metodo) => (
              <OpcionEntrega
                key={metodo.id}
                metodo={metodo}
                seleccionado={metodo.id === metodoEntrega?.id}
                alSeleccionar={() => seleccionarMetodoEntrega(metodo.id)}
              />
            ))}
          </View>
        </View>

        {requiereDireccion ? (
          <View style={styles.seccion}>
            <View style={styles.encabezadoSeccion}>
              <TituloSeccion texto="DIRECCIÓN DE ENVÍO" />
              <Pressable
                onPress={() => router.push('/direcciones')}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.enlace}>{direccion ? 'CAMBIAR' : 'AGREGAR'}</Text>
              </Pressable>
            </View>
            {direccion ? (
              <TarjetaDireccion direccion={direccion} />
            ) : (
              <Text style={styles.avisoDireccion}>Aún no tienes una dirección para el envío.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.seccion}>
          <TituloSeccion texto={`PRODUCTOS (${items.length})`} />
          <View style={styles.listaProductos}>
            {items.map((item) => (
              <FilaResumenItem key={`${item.producto.id}-${item.varianteId}`} item={item} />
            ))}
          </View>
        </View>

        <ResumenCarrito resumen={resumen} envio={metodoEntrega ? resumen.envio : null} />

        {problemas.length > 0 ? (
          <View style={styles.avisos}>
            {problemas.map((problema) => (
              <Text key={`${problema.codigo}-${problema.mensaje}`} style={styles.aviso}>
                • {problema.mensaje}
              </Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.barraInferior, { paddingBottom: insets.bottom + ESPACIO.md }]}>
        <BotonPrimario
          texto="CONTINUAR AL PAGO"
          onPress={continuarAPago}
          deshabilitado={!puedeContinuar}
          cargando={validando}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  contenido: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingBottom: ESPACIO.xxl,
    gap: MEDIDAS.separacionSecciones,
  },
  seccion: { gap: ESPACIO.md },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textoSecundario,
  },
  enlace: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11,
    letterSpacing: 0.6,
    color: COLORS.tinta,
    textDecorationLine: 'underline',
  },
  listaOpciones: { gap: ESPACIO.sm },
  listaProductos: { gap: ESPACIO.base },
  avisoDireccion: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 12,
    color: COLORS.textoSecundario,
  },
  avisos: { gap: ESPACIO.xs },
  aviso: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11.5,
    color: COLORS.arcilla,
  },
  barraInferior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
    backgroundColor: COLORS.papel,
  },
});
