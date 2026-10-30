import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCarrito } from '@/hooks/useCarrito';
import { useCheckout } from '@/hooks/useCheckout';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { servicioPedidos } from '@/services/servicioPedidos';
import { servicioMercadoPago } from '@/services/servicioMercadoPago';
import { metodosPago } from '@/data/metodosPago';
import type { MetodoPago } from '@/types';

export default function PantallaPago() {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();
  const { vaciarCarrito } = useCarrito();
  const { datosPago, reiniciarCheckout } = useCheckout();
  const { preferencias } = useConfiguracion();

  // Preseleccionada desde Perfil → Métodos de pago.
  // Solo se preselecciona si el método sigue disponible (Plin ya no lo está).
  const preferido = preferencias.metodoPagoPreferido;
  const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(
    metodosPago.some((opcion) => opcion.metodo === preferido) ? preferido : null,
  );
  const [pagando, setPagando] = useState(false);
  const [celularYape, setCelularYape] = useState('');
  const [codigoYape, setCodigoYape] = useState('');

  // Yape necesita el celular (9 dígitos) y el código de la app Yape (6 dígitos).
  const pagoConYape = metodoPago === 'yape';
  const celularValido = /^\d{9}$/.test(celularYape);
  const codigoValido = /^\d{6}$/.test(codigoYape);
  const puedePagar = metodoPago !== null && (!pagoConYape || (celularValido && codigoValido));

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
      // Con tarjeta se abre la página de pago de Mercado Pago.
      if (metodoPago === 'tarjeta') {
        await servicioMercadoPago.pagarConTarjeta(numero);
      }
      if (metodoPago === 'yape') {
        await servicioMercadoPago.pagarConYape(numero, celularYape, codigoYape);
      }
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
                  color={seleccionado ? colores.tinta : colores.tinta40}
                />
                <View style={styles.textosOpcion}>
                  <Text style={styles.nombreOpcion}>{opcion.nombre}</Text>
                  <Text style={styles.descripcionOpcion}>{opcion.descripcion}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {pagoConYape ? (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>YAPE</Text>
            <CampoTexto
              etiqueta="CELULAR"
              valor={celularYape}
              alCambiar={setCelularYape}
              placeholder="987654321"
              maxLength={9}
              keyboardType="number-pad"
              error={celularYape && !celularValido ? 'El celular tiene 9 dígitos.' : undefined}
            />
            <CampoTexto
              etiqueta="CÓDIGO DE APROBACIÓN"
              valor={codigoYape}
              alCambiar={setCodigoYape}
              placeholder="123456"
              maxLength={6}
              keyboardType="number-pad"
              error={codigoYape && !codigoValido ? 'El código tiene 6 dígitos.' : undefined}
            />
            <Text style={styles.descripcionOpcion}>Lo encuentras en tu app Yape, en el menú.</Text>
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

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.papel },
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
    color: colores.textoSecundario,
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
    borderColor: colores.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: colores.blanco,
  },
  opcionSeleccionada: { borderColor: colores.tinta },
  textosOpcion: { flex: 1, gap: 2 },
  nombreOpcion: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: colores.tinta },
  descripcionOpcion: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.textoSecundario },
  barraInferior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.papel,
  },
});
