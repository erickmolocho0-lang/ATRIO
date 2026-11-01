import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { nombreMetodoPago } from '@/data/metodosPago';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { Pedido } from '@/types';
import { formatearSoles } from '@/utils/moneda';

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  return (
    <View style={styles.fila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

export default function PantallaConfirmacion() {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const insets = useSafeAreaInsets();
  const { numero } = useLocalSearchParams<{ numero: string }>();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    servicioPedidos
      .obtenerPedido(numero)
      .then(setPedido)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la confirmación.');
      })
      .finally(() => setCargando(false));
  }, [numero]);

  if (cargando) {
    return (
      <SafeAreaView style={[styles.pantalla, styles.centrado]}>
        <ActivityIndicator color={colores.tinta} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="No se pudo cargar tu confirmación"
          descripcion={error}
          textoBoton="VER MIS PEDIDOS"
          alPresionarBoton={() => router.replace('/pedidos')}
        />
      </SafeAreaView>
    );
  }

  if (!pedido) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <EstadoVacio
          titulo="No encontramos tu pedido"
          textoBoton="IR AL INICIO"
          alPresionarBoton={() => router.replace('/(tabs)')}
        />
      </SafeAreaView>
    );
  }

  const fecha = new Date(pedido.fecha).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.contenido}>
        <Ionicons name="checkmark-circle-outline" size={64} color={colores.tinta} />
        <Text style={styles.titulo}>{pedido.estado === 'pendiente_pago' ? 'Pedido pendiente de pago' : pedido.estado === 'cancelado' ? 'Pedido cancelado' : '¡Pedido registrado!'}</Text>
        <Text style={styles.subtitulo}>{pedido.estado === 'pendiente_pago' ? 'El pago aun no esta confirmado. Revisa el estado de tu pedido.' : pedido.estado === 'cancelado' ? 'Este pedido ya no se procesara.' : 'Puedes consultar su estado en Mis pedidos.'}</Text>

        <View style={styles.detalle}>
          <Fila etiqueta="Número de pedido" valor={pedido.numero} />
          <Fila etiqueta="Total" valor={formatearSoles(pedido.resumen.total)} />
          <Fila etiqueta="Método de pago" valor={nombreMetodoPago(pedido.metodoPago)} />
          <Fila etiqueta="Fecha" valor={fecha} />
        </View>
      </View>

      <View style={[styles.botones, { paddingBottom: insets.bottom + ESPACIO.md }]}>
        <BotonPrimario
          texto="VER MI PEDIDO"
          onPress={() =>
            router.replace({ pathname: '/pedido/[numero]', params: { numero: pedido.numero } })
          }
        />
        <BotonPrimario
          texto="SEGUIR COMPRANDO"
          variante="contorno"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    </SafeAreaView>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.papel },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: MEDIDAS.margenLateral,
    gap: ESPACIO.md,
  },
  titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 22, color: colores.tinta },
  subtitulo: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: colores.textoSecundario },
  detalle: {
    alignSelf: 'stretch',
    marginTop: ESPACIO.lg,
    paddingTop: ESPACIO.base,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    gap: ESPACIO.md,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between' },
  etiqueta: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: colores.textoSecundario },
  valor: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: colores.tinta },
  botones: {
    paddingHorizontal: MEDIDAS.margenLateral,
    gap: ESPACIO.sm,
  },
});
