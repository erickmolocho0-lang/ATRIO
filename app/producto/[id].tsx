import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { GaleriaProducto } from '@/components/products/GaleriaProducto';
import { SelectorColor } from '@/components/products/SelectorColor';
import { SelectorTalla } from '@/components/products/SelectorTalla';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useDetalleProducto } from '@/hooks/useDetalleProducto';
import { useFavoritos } from '@/hooks/useFavoritos';
import { formatearSoles } from '@/utils/moneda';

export default function PantallaDetalleProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const {
    producto,
    tallaSeleccionada,
    seleccionarTalla,
    tallasDisponibles,
    tallasHabilitadas,
    colorSeleccionado,
    seleccionarColor,
    coloresHabilitados,
    varianteActual,
    errorSeleccion,
    agregarAlCarrito,
    contadorCarrito,
  } = useDetalleProducto(id ?? '');
  const { esFavorito, alternarFavorito } = useFavoritos();

  if (!producto) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <EstadoVacio
          titulo="Producto no encontrado"
          textoBoton="VOLVER"
          alPresionarBoton={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const agotado = Boolean(tallaSeleccionada && colorSeleccionado && (!varianteActual || varianteActual.stock <= 0));

  const alPresionarAnadir = () => {
    if (agregarAlCarrito()) router.push('/(tabs)/carrito');
  };

  return (
    <View style={styles.pantalla}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 54 + insets.bottom + ESPACIO.xl }}
        showsVerticalScrollIndicator={false}
      >
        <GaleriaProducto
          imagenes={producto.imagenes}
          esFavorito={esFavorito(producto.id)}
          alAlternarFavorito={() => alternarFavorito(producto.id)}
          alVolver={() => router.back()}
          offsetSuperior={insets.top}
        />

        <View style={styles.contenido}>
          <Text style={styles.meta}>
            {producto.categoriaNombre} · SKU {producto.sku}
          </Text>
          <Text style={styles.nombre}>{producto.nombre}</Text>

          <View style={styles.filaPrecio}>
            <Text style={styles.precio}>{formatearSoles(producto.precio)}</Text>
            {producto.precioAnterior ? (
              <Text style={styles.precioAnterior}>
                {formatearSoles(producto.precioAnterior)}
              </Text>
            ) : null}
          </View>

          <Text style={styles.descripcion}>{producto.descripcion}</Text>
          <View style={styles.fichaTecnica}>
            <Text style={styles.lineaFicha}>{producto.composicion}</Text>
            <Text style={styles.lineaFicha}>{producto.confeccion}</Text>
            <Text style={styles.lineaFicha}>{producto.origen}</Text>
          </View>

          <View style={styles.bloqueTalla}>
            <SelectorColor
              colores={producto.colores}
              coloresHabilitados={coloresHabilitados}
              colorSeleccionado={colorSeleccionado}
              alSeleccionar={seleccionarColor}
            />
          </View>

          <View style={styles.bloqueTalla}>
            <SelectorTalla
              tallas={tallasDisponibles}
              tallasHabilitadas={tallasHabilitadas}
              tallaSeleccionada={tallaSeleccionada}
              alSeleccionar={seleccionarTalla}
            />
            {errorSeleccion ? (
              <Text style={styles.errorTalla}>Selecciona talla y color para continuar.</Text>
            ) : null}
          </View>

          <View style={styles.informacion}>
            <FilaInfo
              etiqueta="STOCK"
              valor={
                tallaSeleccionada && colorSeleccionado
                  ? `${varianteActual?.stock ?? 0} unidades`
                  : 'Elige talla y color'
              }
            />
            <FilaInfo etiqueta="ENVÍO" valor="24–48 h Lima" />
            <FilaInfo etiqueta="DEVOLUCIÓN" valor="30 días" />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.barraInferior}>
        <View style={styles.filaBarra}>
          <BotonPrimario
            texto={agotado ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
            onPress={alPresionarAnadir}
            deshabilitado={agotado}
            style={styles.botonAnadir}
          />
          <View style={styles.botonCarrito}>
            <Ionicons name="bag-outline" size={22} color={COLORS.tinta} />
            {contadorCarrito > 0 ? (
              <View style={styles.contador}>
                <Text style={styles.contadorTexto}>{contadorCarrito}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function FilaInfo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.filaInfo}>
      <Text style={styles.infoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  contenido: { paddingHorizontal: MEDIDAS.margenLateral, paddingTop: ESPACIO.lg },
  meta: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: COLORS.textoSecundario,
  },
  nombre: {
    marginTop: ESPACIO.sm,
    fontFamily: TIPOGRAFIA.titulo,
    fontSize: 21,
    color: COLORS.tinta,
  },
  filaPrecio: {
    marginTop: ESPACIO.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: ESPACIO.md,
  },
  precio: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 19, color: COLORS.tinta },
  precioAnterior: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 13,
    color: COLORS.tinta45,
    textDecorationLine: 'line-through',
  },
  descripcion: {
    marginTop: MEDIDAS.separacionSecciones,
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
    lineHeight: 13 * 1.7,
    color: COLORS.tinta,
  },
  fichaTecnica: { marginTop: ESPACIO.base, gap: ESPACIO.xs },
  lineaFicha: {
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.6,
    color: COLORS.textoSecundario,
  },
  bloqueTalla: { marginTop: MEDIDAS.separacionSecciones },
  errorTalla: {
    marginTop: ESPACIO.md,
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11.5,
    color: COLORS.arcilla,
  },
  informacion: {
    marginTop: MEDIDAS.separacionSecciones,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
  },
  filaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: ESPACIO.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borde,
  },
  infoEtiqueta: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: COLORS.textoSecundario,
  },
  infoValor: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.tinta },
  barraInferior: {
    backgroundColor: COLORS.papel,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
  },
  filaBarra: {
    flexDirection: 'row',
    gap: ESPACIO.md,
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
  },
  botonAnadir: { flex: 1 },
  botonCarrito: {
    width: 54,
    height: 54,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contador: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: COLORS.arcilla,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 9, color: COLORS.papel },
});
