import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { CANTIDAD_MAXIMA, CANTIDAD_MINIMA } from '@/context/CarritoContext';
import type { ItemCarrito } from '@/types';
import { formatearSoles } from '@/utils/moneda';
import { buscarVariantePorId } from '@/utils/variantes';
import { MarcadorImagenProducto } from '@/components/products/MarcadorImagenProducto';

interface PropiedadesFilaItemCarrito {
  item: ItemCarrito;
  alCambiarCantidad: (cantidad: number) => void;
  alEliminar: () => void;
}

export function FilaItemCarrito({
  item,
  alCambiarCantidad,
  alEliminar,
}: PropiedadesFilaItemCarrito) {
  const { producto, talla, colorId, cantidad } = item;
  const importeLinea = producto.precio * cantidad;
  const nombreColor = producto.colores.find((color) => color.id === colorId)?.nombre ?? colorId;
  const colorHex = producto.colores.find((color) => color.id === colorId)?.hex;
  const tope = Math.min(CANTIDAD_MAXIMA, buscarVariantePorId(producto, item.varianteId)?.stock ?? CANTIDAD_MAXIMA);

  return (
    <View style={styles.contenedor}>
      <View style={styles.miniatura}>
        <MarcadorImagenProducto llenar sinEtiqueta />
      </View>

      <View style={styles.info}>
        <View style={styles.filaSuperior}>
          <Text style={styles.nombre} numberOfLines={2}>
            {producto.nombre}
          </Text>
          <Pressable
            onPress={alEliminar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Eliminar del carrito"
          >
            <Ionicons name="close" size={18} color={COLORS.tinta40} />
          </Pressable>
        </View>

        <View style={styles.filaVariante}>
          {colorHex ? <View style={[styles.swatch, { backgroundColor: colorHex }]} /> : null}
          <Text style={styles.talla}>
            TALLA {talla} · {nombreColor}
          </Text>
        </View>

        <View style={styles.filaInferior}>
          <View style={styles.control}>
            <Pressable
              style={styles.botonControl}
              onPress={() => alCambiarCantidad(cantidad - 1)}
              disabled={cantidad <= CANTIDAD_MINIMA}
              accessibilityRole="button"
              accessibilityLabel="Disminuir cantidad"
            >
              <Ionicons
                name="remove"
                size={16}
                color={cantidad <= CANTIDAD_MINIMA ? COLORS.tinta40 : COLORS.tinta}
              />
            </Pressable>
            <Text style={styles.valorControl}>{cantidad}</Text>
            <Pressable
              style={styles.botonControl}
              onPress={() => alCambiarCantidad(cantidad + 1)}
              disabled={cantidad >= tope}
              accessibilityRole="button"
              accessibilityLabel="Aumentar cantidad"
            >
              <Ionicons name="add" size={16} color={cantidad >= tope ? COLORS.tinta40 : COLORS.tinta} />
            </Pressable>
          </View>

          <Text style={styles.importe}>{formatearSoles(importeLinea)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexDirection: 'row', gap: ESPACIO.md },
  miniatura: {
    width: 78,
    height: 104,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.lino,
  },
  info: { flex: 1, justifyContent: 'space-between' },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ESPACIO.sm,
  },
  nombre: { flex: 1, fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, color: COLORS.tinta },
  filaVariante: {
    marginTop: ESPACIO.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.xs,
  },
  swatch: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: COLORS.borde },
  talla: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 11,
    color: COLORS.tinta50,
  },
  filaInferior: {
    marginTop: ESPACIO.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  control: {
    width: 104,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: 6,
  },
  botonControl: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorControl: { fontFamily: TIPOGRAFIA.mono, fontSize: 13, color: COLORS.tinta },
  importe: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13, color: COLORS.tinta },
});
