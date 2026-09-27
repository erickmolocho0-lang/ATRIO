import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCarrito } from '@/hooks/useCarrito';
import { useCheckout } from '@/hooks/useCheckout';
import { servicioPedidos } from '@/services/servicioPedidos';
import { metodosPago } from '@/data/metodosPago';
import type { MetodoPago } from '@/types';

export default function PantallaPago() {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { vaciarCarrito } = useCarrito();
  const { datosPago, reiniciarCheckout } = useCheckout();

  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
  const [pagando, setPagando] = useState(false);

  if (!datosPago) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <EncabezadoPantalla titulo="Pago" conBotonVolver />
        <EstadoVacio
          titulo="No hay nada que pagar"
          descripcion="Completa el checkout antes de elegir cómo pagar."
          textoBoton="IR AL CHECKOUT"
          alPresionarBoton={() => router.replace('/checkout')}
        />
      </SafeAreaView>
    );
  }

  async function pagar() {
    if (!datosPago || !metodoPago) return;
    if (!usuario) {
      router.push('/(auth)/login');
      return;
    }

    setPagando(true);
    const pedido = await servicioPedidos.crearPedido({
      ...datosPago,
      usuarioId: usuario.id,
      metodoPago,
    });
    vaciarCarrito();
    reiniciarCheckout();
    router.replace({ pathname: '/confirmacion', params: { numero: pedido.numero } });
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Pago" conBotonVolver />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>MÉTODO DE PAGO</Text>
          {metodosPago.map((opcion) => {
            const seleccionado = opcion.metodo === metodoPago;
            return (
              <Pressable
                key={opcion.metodo}
                style={[styles.opcion, seleccionado && styles.opcionSeleccionada]}
                onPress={() => setMetodoPago(opcion.metodo)}
                accessibilityRole="radio"
                accessibilityState={{ selected: seleccionado }}
              >
                <Ionicons
                  name={seleccionado ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={seleccionado ? COLORS.tinta : COLORS.tinta40}
                />
                <View style={styles.textosOpcion}>
                  <Text style={styles.nombreOpcion}>{opcion.nombre}</Text>
                  <Text style={styles.descripcionOpcion}>{opcion.descripcion}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <ResumenCarrito resumen={datosPago.resumen} envio={datosPago.resumen.envio} />
      </ScrollView>

      <View style={[styles.barraInferior, { paddingBottom: insets.bottom + ESPACIO.md }]}>
        <BotonPrimario
          texto="CONFIRMAR PEDIDO"
          onPress={pagar}
          deshabilitado={!metodoPago}
          cargando={pagando}
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
  seccion: { gap: ESPACIO.sm },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textoSecundario,
    marginBottom: ESPACIO.xs,
  },
  opcion: {
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: COLORS.blanco,
  },
  opcionSeleccionada: { borderColor: COLORS.tinta },
  textosOpcion: { flex: 1, gap: 2 },
  nombreOpcion: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  descripcionOpcion: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
  barraInferior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
    backgroundColor: COLORS.papel,
  },
});
