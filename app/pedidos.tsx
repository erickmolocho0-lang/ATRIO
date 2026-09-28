import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { nombreEstadoPedido } from '@/data/estadosPedido';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { Pedido } from '@/types';
import { formatearSoles } from '@/utils/moneda';

function FilaPedido({ pedido }: { pedido: Pedido }) {
  const fecha = new Date(pedido.fecha).toLocaleDateString('es-PE', { dateStyle: 'medium' });
  const cantidadProductos = pedido.items.reduce((total, item) => total + item.cantidad, 0);

  return (
    <Pressable
      style={styles.fila}
      onPress={() => router.push({ pathname: '/pedido/[numero]', params: { numero: pedido.numero } })}
      accessibilityRole="button"
    >
      <View style={styles.izquierda}>
        <Text style={styles.numero}>{pedido.numero}</Text>
        <Text style={styles.secundario}>
          {fecha} · {cantidadProductos} {cantidadProductos === 1 ? 'producto' : 'productos'}
        </Text>
      </View>
      <View style={styles.derecha}>
        <Text style={styles.total}>{formatearSoles(pedido.resumen.total)}</Text>
        <Text style={styles.estado}>{nombreEstadoPedido[pedido.estado]}</Text>
      </View>
    </Pressable>
  );
}

export default function PantallaPedidos() {
  const { usuario } = useAuth();

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) {
      setCargando(false);
      return;
    }
    servicioPedidos
      .obtenerPedidosDeUsuario(usuario.id)
      .then(setPedidos)
      .finally(() => setCargando(false));
  }, [usuario]);

  function contenido() {
    if (cargando) {
      return <ActivityIndicator style={styles.cargando} color={COLORS.tinta} />;
    }
    if (!usuario) {
      return (
        <EstadoVacio
          icono="person-outline"
          titulo="Inicia sesión para ver tus pedidos"
          textoBoton="INICIAR SESIÓN"
          alPresionarBoton={() => router.push('/(auth)/login')}
        />
      );
    }
    if (pedidos.length === 0) {
      return (
        <EstadoVacio
          icono="receipt-outline"
          titulo="Aún no tienes pedidos"
          descripcion="Cuando compres algo, aparecerá aquí."
          textoBoton="IR AL CATÁLOGO"
          alPresionarBoton={() => router.replace('/(tabs)/catalogo')}
        />
      );
    }
    return (
      <FlatList
        data={pedidos}
        keyExtractor={(pedido) => pedido.numero}
        renderItem={({ item }) => <FilaPedido pedido={item} />}
        contentContainerStyle={styles.lista}
      />
    );
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Mis pedidos" conBotonVolver />
      {contenido()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  cargando: { marginTop: ESPACIO.xxl },
  lista: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.md,
    paddingVertical: ESPACIO.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borde,
  },
  izquierda: { flex: 1, gap: 2 },
  numero: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: COLORS.tinta },
  secundario: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
  derecha: { alignItems: 'flex-end', gap: 4 },
  total: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: COLORS.tinta },
  estado: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: COLORS.arcilla,
    backgroundColor: COLORS.arcilla10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIO.chip,
    overflow: 'hidden',
  },
});
