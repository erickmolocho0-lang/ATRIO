import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { FilaPedidoReciente } from '@/components/admin/FilaPedidoReciente';
import { FilaStockBajo } from '@/components/admin/FilaStockBajo';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { TarjetaIndicador } from '@/components/admin/TarjetaIndicador';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useTema } from '@/hooks/useTema';
import { formatearSoles } from '@/utils/moneda';

export default function PantallaDashboardAdmin() {
  const { colores } = useTema();
  const { cargando, error, resumen, stockBajo, pedidosRecientes, recargar } = useAdminDashboard();

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <EncabezadoPantalla titulo="Administración" subtitulo="DASHBOARD" derecha={<BotonCerrarSesionAdmin />} />
      <NavegacionAdmin />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {cargando ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>Cargando indicadores…</Text>
        ) : error ? (
          <View style={styles.seccion}>
            <Text style={[styles.estado, { color: colores.arcilla }]}>{error}</Text>
            <Text style={[styles.reintentar, { color: colores.tinta }]} onPress={recargar}>
              Reintentar
            </Text>
          </View>
        ) : !resumen ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>Sin datos disponibles.</Text>
        ) : (
          <>
            <View style={styles.grid}>
              <TarjetaIndicador
                titulo="Ventas totales"
                valor={formatearSoles(resumen.totalVentas)}
                icono="cash-outline"
              />
              <TarjetaIndicador titulo="Pedidos" valor={String(resumen.totalPedidos)} icono="receipt-outline" />
              <TarjetaIndicador
                titulo="Ticket promedio"
                valor={formatearSoles(resumen.ticketPromedio)}
                icono="stats-chart-outline"
              />
              <TarjetaIndicador
                titulo="Stock bajo"
                valor={`${stockBajo.length} ${stockBajo.length === 1 ? 'variante' : 'variantes'}`}
                icono="alert-circle-outline"
              />
              <TarjetaIndicador
                titulo="Productos activos"
                valor={String(resumen.productosActivos)}
                icono="shirt-outline"
              />
              <TarjetaIndicador
                titulo="Pedidos pendientes"
                valor={String(resumen.pedidosPendientes)}
                icono="time-outline"
              />
              <TarjetaIndicador
                titulo="Pedidos entregados"
                valor={String(resumen.pedidosEntregados)}
                icono="checkmark-circle-outline"
              />
            </View>

            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: colores.textoSecundario }]}>STOCK BAJO</Text>
              {stockBajo.length === 0 ? (
                <Text style={[styles.vacio, { color: colores.textoSecundario }]}>
                  Ningún producto está por debajo del umbral de stock.
                </Text>
              ) : (
                <View style={[styles.tarjetaLista, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
                  {stockBajo.map((item) => (
                    <FilaStockBajo key={item.varianteId} item={item} />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: colores.textoSecundario }]}>PEDIDOS RECIENTES</Text>
              {pedidosRecientes.length === 0 ? (
                <Text style={[styles.vacio, { color: colores.textoSecundario }]}>
                  Aún no hay pedidos registrados. Esta sección ya está conectada al servicio de datos;
                  se completará cuando el módulo de pedidos esté disponible.
                </Text>
              ) : (
                <View style={[styles.tarjetaLista, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
                  {pedidosRecientes.map((pedido) => (
                    <FilaPedidoReciente key={pedido.id} pedido={pedido} />
                  ))}
                </View>
              )}
            </View>
          </>
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
    gap: MEDIDAS.separacionSecciones,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  seccion: { gap: ESPACIO.md },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  tarjetaLista: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  vacio: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12.5, lineHeight: 18 },
  estado: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, textAlign: 'center', marginTop: ESPACIO.xl },
  reintentar: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: ESPACIO.sm,
  },
});
