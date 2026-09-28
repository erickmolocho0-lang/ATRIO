import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { FilaPedidoReciente } from '@/components/admin/FilaPedidoReciente';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioAdmin } from '@/services/servicioAdmin';
import type { PedidoReciente } from '@/types';

export default function PantallaPedidosAdmin() {
  const { colores } = useTema();
  const [pedidos, setPedidos] = useState<PedidoReciente[]>([]);
  const [cargando, setCargando] = useState(true);

  // Recarga al volver del detalle, por si se cambió el estado de un pedido.
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      servicioAdmin.obtenerPedidosRecientes(50).then((datos) => {
        if (cancelado) return;
        setPedidos(datos);
        setCargando(false);
      });
      return () => {
        cancelado = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <EncabezadoPantalla titulo="Pedidos" subtitulo="VENTAS Y ESTADOS" derecha={<BotonCerrarSesionAdmin />} />
      <NavegacionAdmin />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {cargando ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>Cargando pedidos…</Text>
        ) : pedidos.length === 0 ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>
            Aún no hay pedidos registrados.
          </Text>
        ) : (
          <View style={[styles.tarjetaLista, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
            {pedidos.map((pedido) => (
              <Pressable
                key={pedido.id}
                onPress={() => router.push({ pathname: '/pedido/[numero]', params: { numero: pedido.numero } })}
                accessibilityRole="button"
              >
                <FilaPedidoReciente pedido={pedido} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.base,
    paddingBottom: ESPACIO.xxl,
  },
  tarjetaLista: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  estado: {
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: ESPACIO.xl,
  },
});
