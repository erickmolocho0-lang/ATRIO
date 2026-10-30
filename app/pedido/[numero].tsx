import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { FilaResumenItem } from '@/components/checkout/FilaResumenItem';
import { TarjetaDireccion } from '@/components/checkout/TarjetaDireccion';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { nombreEstadoPedido, siguientesEstados } from '@/data/estadosPedido';
import { nombreMetodoPago } from '@/data/metodosPago';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { CambioEstado, EstadoPedido, Pedido } from '@/types';

function TituloSeccion({ texto }: { texto: string }) {
  return <Text style={styles.tituloSeccion}>{texto}</Text>;
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

function FilaSeguimiento({ texto, fecha }: { texto: string; fecha: string }) {
  return (
    <View style={styles.filaSeguimiento}>
      <View style={styles.punto} />
      <Text style={styles.texto}>{texto}</Text>
      <Text style={styles.fechaSeguimiento}>{formatearFecha(fecha)}</Text>
    </View>
  );
}

export default function PantallaDetallePedido() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const { usuario } = useAuth();
  const esAdministrador = usuario?.rol === 'administrador';

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [historial, setHistorial] = useState<CambioEstado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarPedido = useCallback(() => {
    setCargando(true);
    setError(null);
    Promise.all([servicioPedidos.obtenerPedido(numero), servicioPedidos.obtenerHistorial(numero)])
      .then(([pedidoLeido, historialLeido]) => {
        setPedido(pedidoLeido);
        setHistorial(historialLeido);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el pedido.');
      })
      .finally(() => setCargando(false));
  }, [numero]);

  useEffect(() => {
    cargarPedido();
  }, [cargarPedido]);

  if (cargando) {
    return (
      <SafeAreaView style={[styles.pantalla, styles.centrado]}>
        <ActivityIndicator color={COLORS.tinta} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <EncabezadoPantalla titulo="Pedido" conBotonVolver />
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="No se pudo cargar el pedido"
          descripcion={error}
          textoBoton="REINTENTAR"
          alPresionarBoton={cargarPedido}
        />
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <EncabezadoPantalla titulo="Pedido" conBotonVolver />
        <EstadoVacio
          titulo="No encontramos este pedido"
          textoBoton="VER MIS PEDIDOS"
          alPresionarBoton={() => router.replace('/pedidos')}
        />
      </SafeAreaView>
    );
  }

  async function cambiarEstado(estado: EstadoPedido) {
    if (!pedido) return;
    try {
      setPedido(await servicioPedidos.cambiarEstado(pedido.numero, estado));
      setHistorial(await servicioPedidos.obtenerHistorial(pedido.numero));
    } catch (err) {
      Alert.alert('No se pudo cambiar el estado', err instanceof Error ? err.message : '');
    }
  }

  // El cliente puede cancelar mientras el pedido no haya salido.
  const clientePuedeCancelar =
    !esAdministrador && (pedido.estado === 'pendiente_pago' || pedido.estado === 'preparado');

  function confirmarCancelacion() {
    Alert.alert('Cancelar pedido', `¿Seguro que quieres cancelar el pedido ${pedido?.numero}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => cambiarEstado('cancelado') },
    ]);
  }

  // Solo los estados a los que se puede pasar desde el actual.
  const estadosPermitidos = siguientesEstados[pedido.estado];

  const fecha = formatearFecha(pedido.fecha);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo={`Pedido ${pedido.numero}`} subtitulo={fecha} conBotonVolver />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.filaEstado}>
          <TituloSeccion texto="ESTADO" />
          <Text style={styles.estado}>{nombreEstadoPedido[pedido.estado]}</Text>
        </View>

        {esAdministrador && estadosPermitidos.length > 0 ? (
          <View style={styles.seccion}>
            <TituloSeccion texto="CAMBIAR A" />
            <View style={styles.opcionesEstado}>
              {estadosPermitidos.map((estado) => (
                <Pressable
                  key={estado}
                  style={styles.opcionEstado}
                  onPress={() => cambiarEstado(estado)}
                  accessibilityRole="button"
                >
                  <Text style={styles.textoOpcionEstado}>{nombreEstadoPedido[estado]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.seccion}>
          <TituloSeccion texto="SEGUIMIENTO" />
          <FilaSeguimiento texto="Pedido realizado" fecha={pedido.fecha} />
          {historial.map((cambio) => (
            <FilaSeguimiento key={cambio.fecha} texto={nombreEstadoPedido[cambio.estado]} fecha={cambio.fecha} />
          ))}
        </View>

        <View style={styles.seccion}>
          <TituloSeccion texto={`PRODUCTOS (${pedido.items.length})`} />
          {pedido.items.map((item) => (
            <FilaResumenItem key={item.varianteId} item={item} />
          ))}
        </View>

        <View style={styles.seccion}>
          <TituloSeccion texto="ENTREGA" />
          <Text style={styles.texto}>{pedido.metodoEntrega.nombre}</Text>
          {pedido.direccion ? <TarjetaDireccion direccion={pedido.direccion} /> : null}
        </View>

        <View style={styles.seccion}>
          <TituloSeccion texto="PAGO" />
          <Text style={styles.texto}>{nombreMetodoPago(pedido.metodoPago)}</Text>
        </View>

        <ResumenCarrito resumen={pedido.resumen} envio={pedido.resumen.envio} />

        {clientePuedeCancelar ? (
          <BotonPrimario texto="CANCELAR PEDIDO" variante="contorno" onPress={confirmarCancelacion} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  contenido: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingBottom: ESPACIO.xxl,
    gap: MEDIDAS.separacionSecciones,
  },
  seccion: { gap: ESPACIO.md },
  filaEstado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
    color: COLORS.textoSecundario,
  },
  filaSeguimiento: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.tinta },
  fechaSeguimiento: {
    marginLeft: 'auto',
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11,
    color: COLORS.textoSecundario,
  },
  texto: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  opcionesEstado: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  opcionEstado: {
    paddingHorizontal: ESPACIO.md,
    paddingVertical: ESPACIO.sm,
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: RADIO.chip,
    backgroundColor: COLORS.blanco,
  },
  textoOpcionEstado: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.tinta },
  estado: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: COLORS.arcilla,
    backgroundColor: COLORS.arcilla10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIO.chip,
    overflow: 'hidden',
  },
});
