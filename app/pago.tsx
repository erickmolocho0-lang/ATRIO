import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCarrito } from '@/hooks/useCarrito';
import { useCheckout } from '@/hooks/useCheckout';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { servicioPedidos } from '@/services/servicioPedidos';
import { servicioTarjetas } from '@/services/servicioTarjetas';
import { metodosPago } from '@/data/metodosPago';
import type { MetodoPago, Tarjeta } from '@/types';

export default function PantallaPago() {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { vaciarCarrito } = useCarrito();
  const { datosPago, reiniciarCheckout } = useCheckout();
  const { preferencias } = useConfiguracion();

  // Preseleccionada desde Perfil → Métodos de pago (solo la preferencia, ver
  // la decisión de diseño documentada en app/metodos-pago.tsx).
  // Solo se preselecciona si el método sigue disponible (Plin ya no lo está).
  const preferido = preferencias.metodoPagoPreferido;
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(
    metodosPago.some((opcion) => opcion.metodo === preferido) ? preferido : null,
  );
  const [pagando, setPagando] = useState(false);
  const [tarjeta, setTarjeta] = useState<Tarjeta | null>(null);
  const [cvv, setCvv] = useState('');

  // Al volver de "Métodos de pago" se lee otra vez la tarjeta predeterminada.
  useFocusEffect(
    useCallback(() => {
      servicioTarjetas
        .obtenerTarjetas()
        .then((tarjetas) => setTarjeta(tarjetas.find((t) => t.predeterminada) ?? null));
    }, []),
  );

  // El CVV solo se valida; nunca se guarda.
  const pagoConTarjeta = metodoPago === 'tarjeta';
  const cvvValido = /^\d{3,4}$/.test(cvv);
  const puedePagar = metodoPago !== null && (!pagoConTarjeta || (tarjeta !== null && cvvValido));

  const irAMetodosPago = () =>
    router.push({ pathname: '/metodos-pago', params: { desdePago: 'si' } });

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
    if (!datosPago || !metodoPago || !puedePagar) return;
    if (!usuario) {
      router.push('/(auth)/login');
      return;
    }

    // Pendiente real (ver auditoría): la RPC confirmar_compra todavía no
    // sabe de cupones — no hay tabla `cupones` en el esquema confirmado, así
    // que aplicarlos aquí sería cobrar un total distinto al que la nube
    // registra. Se bloquea en vez de cobrar de más en silencio.
    if (datosPago.resumen.descuento > 0) {
      Alert.alert(
        'Cupón no disponible todavía',
        'Los cupones de descuento aún no están conectados al cobro real. Quita el cupón del carrito para continuar.',
      );
      return;
    }

    setPagando(true);
    try {
      const { numero } = await servicioPedidos.confirmarCompra({
        metodoPago,
        tipoEntrega: datosPago.metodoEntrega.tipo,
        direccionId: datosPago.direccion?.id ?? null,
      });
      vaciarCarrito();
      reiniciarCheckout();
      // Cierra Checkout y Pago: terminada la compra, "atrás" ya no vuelve a ellos.
      router.dismissAll();
      router.push({ pathname: '/confirmacion', params: { numero } });
    } catch (error) {
      Alert.alert('No se pudo confirmar la compra', (error as Error).message);
    } finally {
      setPagando(false);
    }
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

        {pagoConTarjeta ? (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>TARJETA</Text>
            {tarjeta ? (
              <>
                <View style={styles.filaTarjeta}>
                  <Text style={styles.nombreOpcion}>
                    {tarjeta.marca} •••• {tarjeta.ultimos4}
                  </Text>
                  <Pressable onPress={irAMetodosPago} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.enlace}>CAMBIAR</Text>
                  </Pressable>
                </View>
                <CampoTexto
                  etiqueta="CVV"
                  valor={cvv}
                  alCambiar={setCvv}
                  placeholder="123"
                  maxLength={4}
                  error={cvv && !cvvValido ? 'El CVV tiene 3 o 4 dígitos.' : undefined}
                />
              </>
            ) : (
              <Pressable onPress={irAMetodosPago} accessibilityRole="button">
                <Text style={styles.enlace}>AGREGAR UNA TARJETA</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <ResumenCarrito resumen={datosPago.resumen} envio={datosPago.resumen.envio} />
      </ScrollView>

      <View style={[styles.barraInferior, { paddingBottom: insets.bottom + ESPACIO.md }]}>
        <BotonPrimario
          texto="CONFIRMAR PEDIDO"
          onPress={pagar}
          deshabilitado={!puedePagar}
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
  filaTarjeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  enlace: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11,
    letterSpacing: 0.6,
    color: COLORS.tinta,
    textDecorationLine: 'underline',
  },
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
