import { Alert, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraHorizontal } from '@/components/admin/BarraHorizontal';
import { BarrasPorDia } from '@/components/admin/BarrasPorDia';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { TarjetaIndicador } from '@/components/admin/TarjetaIndicador';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useReportes } from '@/hooks/useReportes';
import { useTema } from '@/hooks/useTema';
import { formatearSoles } from '@/utils/moneda';
import { generarCsvProductos } from '@/utils/reportes';

export default function PantallaReportes() {
  const { colores, esOscuro } = useTema();
  const { cargando, error, reporte, usarEjemplo, setUsarEjemplo, recargar } = useReportes();
  const colorPerilla = usarEjemplo ? colores.papel : esOscuro ? '#A19E96' : '#FFFFFF';

  const hayVentas = !!reporte && reporte.resumen.totalPedidos > 0;
  const topProductos = reporte?.productosVendidos.slice(0, 5) ?? [];
  const maxUnidades = Math.max(...topProductos.map((p) => p.unidades), 1);

  const exportarCsv = async () => {
    if (!reporte || !hayVentas) {
      Alert.alert('Sin datos', 'No hay ventas para exportar todavía.');
      return;
    }
    await Share.share({ title: 'Reporte de ventas ATRIO', message: generarCsvProductos(reporte) });
  };

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top']}>
      <EncabezadoPantalla
        titulo="Reportes"
        subtitulo="VENTAS Y PRODUCTOS"
        derecha={<BotonCerrarSesionAdmin />}
      />
      <NavegacionAdmin />

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={[styles.filaEjemplo, { borderColor: colores.borde }]}>
          <View style={styles.textosEjemplo}>
            <Text style={[styles.tituloEjemplo, { color: colores.tinta }]}>Datos de ejemplo</Text>
            <Text style={[styles.descripcionEjemplo, { color: colores.textoSecundario }]}>
              Muestra cómo se ve el reporte con un volumen mayor de ventas.
            </Text>
          </View>
          <Switch
            value={usarEjemplo}
            onValueChange={setUsarEjemplo}
            trackColor={{ false: colores.tinta14, true: colores.tinta }}
            thumbColor={colorPerilla}
          />
        </View>

        {usarEjemplo ? (
          <Text style={[styles.aviso, { color: colores.arcilla }]}>
            DATOS DE EJEMPLO · NO SON VENTAS REALES
          </Text>
        ) : null}

        {cargando ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>Cargando reporte…</Text>
        ) : error ? (
          <View style={styles.seccion}>
            <Text style={[styles.estado, { color: colores.arcilla }]}>{error}</Text>
            <Text style={[styles.reintentar, { color: colores.tinta }]} onPress={recargar}>
              Reintentar
            </Text>
          </View>
        ) : !reporte || !hayVentas ? (
          <Text style={[styles.estado, { color: colores.textoSecundario }]}>
            Aún no hay ventas registradas. Realiza una compra desde la app (checkout y pago) para
            verla aquí, o activa "Datos de ejemplo" para ver cómo se ve el reporte.
          </Text>
        ) : (
          <>
            <View style={styles.grid}>
              <TarjetaIndicador
                titulo="Ingresos"
                valor={formatearSoles(reporte.resumen.totalIngresos)}
                icono="cash-outline"
              />
              <TarjetaIndicador
                titulo="Pedidos"
                valor={String(reporte.resumen.totalPedidos)}
                icono="receipt-outline"
              />
              <TarjetaIndicador
                titulo="Unidades vendidas"
                valor={String(reporte.resumen.unidadesVendidas)}
                icono="shirt-outline"
              />
              <TarjetaIndicador
                titulo="Ticket promedio"
                valor={formatearSoles(reporte.resumen.ticketPromedio)}
                icono="stats-chart-outline"
              />
            </View>

            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: colores.textoSecundario }]}>
                VENTAS POR DÍA (ÚLTIMOS 14)
              </Text>
              <BarrasPorDia datos={reporte.ventasPorDia} />
            </View>

            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: colores.textoSecundario }]}>
                PRODUCTOS MÁS VENDIDOS
              </Text>
              {topProductos.map((producto) => (
                <BarraHorizontal
                  key={producto.productoId}
                  etiqueta={producto.nombre}
                  valorTexto={`${producto.unidades} uds · ${formatearSoles(producto.ingresos)}`}
                  proporcion={producto.unidades / maxUnidades}
                />
              ))}
            </View>

            <View style={styles.seccion}>
              <Text style={[styles.tituloSeccion, { color: colores.textoSecundario }]}>
                CATEGORÍAS MÁS VENDIDAS
              </Text>
              {reporte.categoriasVendidas.map((categoria) => (
                <BarraHorizontal
                  key={categoria.categoriaId}
                  etiqueta={categoria.nombre}
                  valorTexto={`${categoria.porcentaje.toFixed(0)}% · ${formatearSoles(categoria.ingresos)}`}
                  proporcion={categoria.porcentaje / 100}
                />
              ))}
            </View>

            <Pressable
              onPress={exportarCsv}
              style={[styles.botonExportar, { borderColor: colores.tinta }]}
              accessibilityRole="button"
            >
              <Text style={[styles.botonExportarTexto, { color: colores.tinta }]}>EXPORTAR CSV</Text>
            </Pressable>
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
  filaEjemplo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    borderWidth: 1,
    borderRadius: RADIO.resumen,
    padding: ESPACIO.base,
  },
  textosEjemplo: { flex: 1, gap: 2 },
  tituloEjemplo: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  descripcionEjemplo: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5 },
  aviso: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  seccion: { gap: ESPACIO.md },
  tituloSeccion: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 11, letterSpacing: 1.2 },
  estado: {
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: ESPACIO.md,
  },
  reintentar: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  botonExportar: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonExportarTexto: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, letterSpacing: 1 },
});