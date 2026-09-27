import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { ColorProducto } from '@/types';
import { esStockBajo } from '@/utils/variantes';

interface PropiedadesTablaStockVariantes {
  tallas: string[];
  colores: ColorProducto[];
  obtenerStock: (talla: string, colorId: string) => number;
  alCambiarStock: (talla: string, colorId: string, stock: number) => void;
}

const ANCHO_CELDA = 64;
const ANCHO_ETIQUETA = 44;

export function TablaStockVariantes({
  tallas,
  colores,
  obtenerStock,
  alCambiarStock,
}: PropiedadesTablaStockVariantes) {
  const { colores: tema } = useTema();

  if (tallas.length === 0 || colores.length === 0) {
    return (
      <Text style={[styles.aviso, { color: tema.textoSecundario }]}>
        Selecciona al menos una talla y un color para definir el stock.
      </Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.fila}>
          <View style={[styles.celdaEtiqueta, { width: ANCHO_ETIQUETA }]} />
          {colores.map((color) => (
            <View key={color.id} style={[styles.celdaEncabezado, { width: ANCHO_CELDA }]}>
              <View style={[styles.swatch, { backgroundColor: color.hex, borderColor: tema.borde }]} />
              <Text style={[styles.textoEncabezado, { color: tema.textoSecundario }]} numberOfLines={1}>
                {color.nombre}
              </Text>
            </View>
          ))}
        </View>

        {tallas.map((talla) => (
          <View key={talla} style={styles.fila}>
            <View style={[styles.celdaEtiqueta, { width: ANCHO_ETIQUETA }]}>
              <Text style={[styles.textoTalla, { color: tema.tinta }]}>{talla}</Text>
            </View>
            {colores.map((color) => {
              const stock = obtenerStock(talla, color.id);
              const bajo = esStockBajo(stock);
              return (
                <View key={color.id} style={[styles.celdaValor, { width: ANCHO_CELDA }]}>
                  <TextInput
                    style={[
                      styles.entrada,
                      { borderColor: tema.borde, color: tema.tinta, backgroundColor: tema.blanco },
                      bajo && { borderColor: tema.arcilla },
                    ]}
                    value={String(stock)}
                    onChangeText={(texto) => {
                      const limpio = texto.replace(/[^0-9]/g, '');
                      alCambiarStock(talla, color.id, limpio === '' ? 0 : parseInt(limpio, 10));
                    }}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                    accessibilityLabel={`Stock talla ${talla} color ${color.nombre}`}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aviso: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12.5, lineHeight: 18 },
  fila: { flexDirection: 'row' },
  celdaEtiqueta: { alignItems: 'center', justifyContent: 'center', paddingVertical: ESPACIO.sm },
  textoTalla: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 12 },
  celdaEncabezado: { alignItems: 'center', gap: 4, paddingVertical: ESPACIO.sm, paddingHorizontal: 4 },
  swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  textoEncabezado: { fontFamily: TIPOGRAFIA.mono, fontSize: 9 },
  celdaValor: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  entrada: {
    width: ANCHO_CELDA - 12,
    height: 36,
    borderWidth: 1,
    borderRadius: RADIO.talla,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 13,
  },
});
