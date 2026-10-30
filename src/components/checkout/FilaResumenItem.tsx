import { StyleSheet, Text, View } from 'react-native';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import type { ItemCarrito } from '@/types';
import { formatearSoles } from '@/utils/moneda';

// Único lugar que arma la etiqueta de variante.
function etiquetaVariante(item: ItemCarrito): string {
  const color = item.producto.colores.find((c) => c.id === item.colorId);
  return `TALLA ${item.talla}${color ? ` · ${color.nombre}` : ''}`;
}

export function FilaResumenItem({ item }: { item: ItemCarrito }) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const { producto, cantidad } = item;

  return (
    <View style={styles.contenedor}>
      <View style={styles.miniatura}>
        <MarcadorImagenProducto uri={producto.imagenes[0]} llenar sinEtiqueta />
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

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  contenedor: { flexDirection: 'row', gap: ESPACIO.md },
  miniatura: {
    width: 56,
    height: 72,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colores.lino,
  },
  info: { flex: 1, justifyContent: 'space-between' },
  nombre: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, color: colores.tinta },
  variante: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.tinta50 },
  filaPrecio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cantidad: { fontFamily: TIPOGRAFIA.mono, fontSize: 12, color: colores.textoSecundario },
  importe: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: colores.tinta },
});
