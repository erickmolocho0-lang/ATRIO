import { StyleSheet, Text, View } from 'react-native';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';
import { COLORS } from '@/constants/colors';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import type { ItemCarrito } from '@/types';
import { formatearSoles } from '@/utils/moneda';

// Único lugar que arma la etiqueta de variante.
function etiquetaVariante(item: ItemCarrito): string {
  const color = item.producto.colores.find((c) => c.id === item.colorId);
  return `TALLA ${item.talla}${color ? ` · ${color.nombre}` : ''}`;
}

export function FilaResumenItem({ item }: { item: ItemCarrito }) {
  const { producto, cantidad } = item;

  return (
    <View style={styles.contenedor}>
      <View style={styles.miniatura}>
        <MarcadorImagenProducto llenar sinEtiqueta />
      </View>
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={2}>
          {producto.nombre}
        </Text>
        <Text style={styles.variante}>{etiquetaVariante(item)}</Text>
        <View style={styles.filaPrecio}>
          <Text style={styles.cantidad}>
            {cantidad} × {formatearSoles(producto.precio)}
          </Text>
          <Text style={styles.importe}>{formatearSoles(producto.precio * cantidad)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexDirection: 'row', gap: ESPACIO.md },
  miniatura: {
    width: 56,
    height: 72,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.lino,
  },
  info: { flex: 1, justifyContent: 'space-between' },
  nombre: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, color: COLORS.tinta },
  variante: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.tinta50 },
  filaPrecio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cantidad: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: COLORS.textoSecundario },
  importe: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: COLORS.tinta },
});
