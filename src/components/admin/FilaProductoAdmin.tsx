import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { Producto } from '@/types';
import { formatearSoles } from '@/utils/moneda';
import { esStockBajo, stockTotal } from '@/utils/variantes';

const TAMANO_MINIATURA = 52;

interface PropiedadesFilaProductoAdmin {
  producto: Producto;
  alPresionar: () => void;
  alAlternarActivo: () => void;
}

export function FilaProductoAdmin({
  producto,
  alPresionar,
  alAlternarActivo,
}: PropiedadesFilaProductoAdmin) {
  const { colores } = useTema();
  const stock = stockTotal(producto);
  const hayStockBajo = producto.variantes.some((v) => esStockBajo(v.stock));

  return (
    <View style={[styles.fila, { borderBottomColor: colores.borde }]}>
      {/* El Switch queda fuera de este Pressable: si estuviera adentro, el
          toque también abriría el detalle del producto. */}
      <Pressable
        onPress={alPresionar}
        style={styles.zonaEditar}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${producto.nombre}`}
      >
        <MarcadorImagenProducto
          uri={producto.imagenes[0]}
          sinEtiqueta
          radio={RADIO.talla}
          style={styles.miniatura}
        />
        <View style={styles.info}>
          <View style={styles.filaTitulo}>
            <Text style={[styles.nombre, { color: colores.tinta }]} numberOfLines={1}>
              {producto.nombre}
            </Text>
            {hayStockBajo ? (
              <Ionicons name="alert-circle" size={14} color={colores.arcilla} />
            ) : null}
          </View>
          <Text style={[styles.meta, { color: colores.textoSecundario }]}>
            {producto.sku} · {producto.categoriaNombre} · {producto.variantes.length}{' '}
            {producto.variantes.length === 1 ? 'variante' : 'variantes'}
          </Text>
          <Text style={[styles.meta, { color: colores.textoSecundario }]}>
            {formatearSoles(producto.precio)} · Stock total: {stock} u.
          </Text>
        </View>
      </Pressable>
      <View style={styles.acciones}>
        <Switch
          value={producto.activo}
          onValueChange={alAlternarActivo}
          accessibilityLabel={producto.activo ? `Desactivar ${producto.nombre}` : `Activar ${producto.nombre}`}
        />
        <Text style={[styles.etiquetaEstado, { color: colores.textoSecundario }]}>
          {producto.activo ? 'ACTIVO' : 'INACTIVO'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.md,
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    paddingVertical: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    borderBottomWidth: 1,
  },
  zonaEditar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md },
  miniatura: { width: TAMANO_MINIATURA, height: TAMANO_MINIATURA, flexShrink: 0 },
  info: { flex: 1, gap: 2 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs },
  nombre: { flex: 1, fontFamily: TIPOGRAFIA.titulo, fontSize: 14 },
  meta: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5 },
  acciones: { alignItems: 'center', gap: 2 },
  etiquetaEstado: { fontFamily: TIPOGRAFIA.mono, fontSize: 8.5, letterSpacing: 0.6 },
});
