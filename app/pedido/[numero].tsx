import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResumenCarrito } from '@/components/cart/ResumenCarrito';
import { FilaResumenItem } from '@/components/checkout/FilaResumenItem';
import { TarjetaDireccion } from '@/components/checkout/TarjetaDireccion';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { nombreEstadoPedido } from '@/data/estadosPedido';
import { nombreMetodoPago } from '@/data/metodosPago';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { EstadoPedido, Pedido } from '@/types';

const ESTADOS = Object.keys(nombreEstadoPedido) as EstadoPedido[];

function TituloSeccion({ texto }: { texto: string }) {
  return <Text style={styles.tituloSeccion}>{texto}</Text>;
}

export default function PantallaDetallePedido() {
  const { numero } = useLocalSearchParams<{ numero: string }>();
  const { usuario } = useAuth();
  const esPropietaria = usuario?.rol === 'propietaria';

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    servicioPedidos
      .obtenerPedido(numero)
      .then(setPedido)
      .finally(() => setCargando(false));
  }, [numero]);

  if (cargando) {
    return (
      <SafeAreaView style={[styles.pantalla, styles.centrado]}>
        <ActivityIndicator color={COLORS.tinta} />
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
    setPedido(await servicioPedidos.cambiarEstado(pedido.numero, estado));
  }

  const fecha = new Date(pedido.fecha).toLocaleString('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo={`Pedido ${pedido.numero}`} subtitulo={fecha} conBotonVolver />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.filaEstado}>
          <TituloSeccion texto="ESTADO" />
          <Text style={styles.estado}>{nombreEstadoPedido[pedido.estado]}</Text>
        </View>

        {esPropietaria ? (
          <View style={styles.seccion}>
            <TituloSeccion texto="CAMBIAR ESTADO" />
            <View style={styles.opcionesEstado}>
              {ESTADOS.map((estado) => {
                const actual = estado === pedido.estado;
                return (
                  <Pressable
                    key={estado}
                    style={[styles.opcionEstado, actual && styles.opcionEstadoActual]}
                    onPress={() => cambiarEstado(estado)}
                    disabled={actual}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actual }}
                  >
                    <Text style={[styles.textoOpcionEstado, actual && styles.textoOpcionEstadoActual]}>
                      {nombreEstadoPedido[estado]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

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
  opcionEstadoActual: { borderColor: COLORS.tinta, backgroundColor: COLORS.tinta },
  textoOpcionEstado: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.tinta },
  textoOpcionEstadoActual: { color: COLORS.papel },
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
