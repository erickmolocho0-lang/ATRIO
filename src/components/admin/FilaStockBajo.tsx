import { StyleSheet, Text, View } from 'react-native';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { ProductoStockBajo } from '@/types';

export function FilaStockBajo({ item }: { item: ProductoStockBajo }) {
  const { colores } = useTema();

  return (
    <View style={[styles.fila, { borderBottomColor: colores.borde }]}>
      <View style={styles.info}>
        <Text style={[styles.nombre, { color: colores.tinta }]} numberOfLines={1}>
          {item.nombre}
        </Text>
        <Text style={[styles.detalle, { color: colores.textoSecundario }]}>
          Talla {item.talla} · {item.colorNombre}
        </Text>
      </View>
      <Text style={[styles.stock, { color: colores.arcilla }]}>{item.stock} u.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.md,
    paddingVertical: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    borderBottomWidth: 1,
  },
  info: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13 },
  detalle: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5 },
  stock: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13 },
});
