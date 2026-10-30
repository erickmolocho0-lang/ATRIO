import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CampoBusqueda } from '@/components/common/CampoBusqueda';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { FilaPedidoReciente } from '@/components/admin/FilaPedidoReciente';
import { AccionesAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { ChipCategoria } from '@/components/products/ChipCategoria';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { nombreEstadoPago } from '@/data/estadosPago';
import { nombreEstadoPedido } from '@/data/estadosPedido';
import { useTema } from '@/hooks/useTema';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { EstadoPago, EstadoPedido, Pedido } from '@/types';

type Periodo = 'todo' | 'hoy' | '7dias' | '30dias';

const PERIODOS: { valor: Periodo; nombre: string }[] = [
  { valor: 'todo', nombre: 'Todo' },
  { valor: 'hoy', nombre: 'Hoy' },
  { valor: '7dias', nombre: '7 días' },
  { valor: '30dias', nombre: '30 días' },
];

const ESTADOS = Object.keys(nombreEstadoPedido) as EstadoPedido[];
const ESTADOS_PAGO = Object.keys(nombreEstadoPago) as EstadoPago[];

function dentroDelPeriodo(fechaIso: string, periodo: Periodo): boolean {
  if (periodo === 'todo') return true;
  const fecha = new Date(fechaIso);
  const ahora = new Date();
  if (periodo === 'hoy') return fecha.toDateString() === ahora.toDateString();
  const dias = periodo === '7dias' ? 7 : 30;
  return ahora.getTime() - fecha.getTime() <= dias * 24 * 60 * 60 * 1000;
}

export default function PantallaPedidosAdmin() {
  const { colores } = useTema();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<EstadoPedido | null>(null);
  const [estadoPago, setEstadoPago] = useState<EstadoPago | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>('todo');

  // Recarga al volver del detalle, por si se cambió el estado de un pedido.
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      servicioPedidos
        .obtenerPedidos()
        .then((datos) => {
          if (!cancelado) setPedidos(datos);
        })
        .catch((err) => {
          if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos.');
        })
        .finally(() => {
          if (!cancelado) setCargando(false);
        });
      return () => {
        cancelado = true;
      };
    }, []),
  );

  const texto = busqueda.trim().toLowerCase();
  const filtrados = useMemo(
    () =>
      pedidos.filter(
        (pedido) =>
          (estado === null || pedido.estado === estado) &&
          (estadoPago === null || pedido.estadoPago === estadoPago) &&
          dentroDelPeriodo(pedido.fecha, periodo) &&
          (texto === '' ||
            pedido.numero.toLowerCase().includes(texto) ||
            pedido.cliente.toLowerCase().includes(texto)),
      ),
    [pedidos, estado, estadoPago, periodo, texto],
  );

  const hayFiltros = texto !== '' || estado !== null || estadoPago !== null || periodo !== 'todo';

  function limpiarFiltros() {
    setBusqueda('');
    setEstado(null);
    setEstadoPago(null);
    setPeriodo('todo');
  }

  function filaDeChips<T>(
    titulo: string,
    opciones: { valor: T; nombre: string }[],
    actual: T,
    alElegir: (valor: T) => void,
  ) {
    return (
      <View style={styles.grupo}>
        <Text style={[styles.tituloGrupo, { color: colores.textoSecundario }]}>{titulo}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {opciones.map((opcion) => (
            <ChipCategoria
              key={String(opcion.valor)}
              texto={opcion.nombre}
              activo={opcion.valor === actual}
              alPresionar={() => alElegir(opcion.valor)}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  function contenido() {
    if (cargando) {
      return <Text style={[styles.mensaje, { color: colores.textoSecundario }]}>Cargando pedidos…</Text>;
    }
    if (error) {
      return <Text style={[styles.mensaje, { color: colores.textoSecundario }]}>{error}</Text>;
    }
    if (pedidos.length === 0) {
      return (
        <Text style={[styles.mensaje, { color: colores.textoSecundario }]}>Aún no hay pedidos registrados.</Text>
      );
    }
    if (filtrados.length === 0) {
      return (
        <View style={styles.sinResultados}>
          <Text style={[styles.mensaje, { color: colores.textoSecundario }]}>
            Ningún pedido coincide con los filtros.
          </Text>
          <Pressable onPress={limpiarFiltros} accessibilityRole="button">
            <Text style={[styles.enlace, { color: colores.tinta }]}>LIMPIAR FILTROS</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={[styles.tarjetaLista, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
        {filtrados.map((pedido) => (
          <Pressable
            key={pedido.numero}
            onPress={() => router.push({ pathname: '/pedido/[numero]', params: { numero: pedido.numero } })}
            accessibilityRole="button"
          >
            <FilaPedidoReciente
              pedido={{
                id: pedido.numero,
                numero: pedido.numero,
                cliente: pedido.cliente,
                total: pedido.resumen.total,
                estado: pedido.estado,
                fecha: pedido.fecha,
              }}
            />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <EncabezadoPantalla titulo="Pedidos" subtitulo="VENTAS Y ESTADOS" derecha={<AccionesAdmin />} />
      <NavegacionAdmin />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.busqueda}>
          <CampoBusqueda valor={busqueda} alCambiar={setBusqueda} placeholder="Número de pedido o cliente" />
        </View>

        {filaDeChips(
          'ESTADO',
          [{ valor: null, nombre: 'Todos' }, ...ESTADOS.map((e) => ({ valor: e, nombre: nombreEstadoPedido[e] }))],
          estado,
          setEstado,
        )}
        {filaDeChips(
          'PAGO',
          [{ valor: null, nombre: 'Todos' }, ...ESTADOS_PAGO.map((e) => ({ valor: e, nombre: nombreEstadoPago[e] }))],
          estadoPago,
          setEstadoPago,
        )}
        {filaDeChips('FECHA', PERIODOS, periodo, setPeriodo)}

        {!cargando && pedidos.length > 0 ? (
          <View style={styles.resumen}>
            <Text style={[styles.conteo, { color: colores.textoSecundario }]}>
              {filtrados.length} {filtrados.length === 1 ? 'PEDIDO' : 'PEDIDOS'}
            </Text>
            {hayFiltros ? (
              <Pressable onPress={limpiarFiltros} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.enlace, { color: colores.tinta }]}>LIMPIAR</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {contenido()}
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
    gap: ESPACIO.md,
  },
  busqueda: { flexDirection: 'row' },
  grupo: { gap: ESPACIO.xs },
  tituloGrupo: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 10, letterSpacing: 1.2 },
  chips: { gap: ESPACIO.sm },
  resumen: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conteo: { fontFamily: TIPOGRAFIA.mono, fontSize: 10, letterSpacing: 1 },
  enlace: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11, letterSpacing: 0.6, textDecorationLine: 'underline' },
  tarjetaLista: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  sinResultados: { alignItems: 'center', gap: ESPACIO.sm },
  mensaje: {
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: ESPACIO.xl,
  },
});
