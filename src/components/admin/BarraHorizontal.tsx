import { StyleSheet, Text, View } from 'react-native';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';

interface PropiedadesBarraHorizontal {
  etiqueta: string;
  valorTexto: string;
  proporcion: number; // 0 a 1
}

export function BarraHorizontal({ etiqueta, valorTexto, proporcion }: PropiedadesBarraHorizontal) {
  const { colores } = useTema();
  const ancho = `${Math.max(0, Math.min(1, proporcion)) * 100}%` as `${number}%`;

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Text numberOfLines={1} style={[styles.etiqueta, { color: colores.tinta }]}>
          {etiqueta}
        </Text>
        <Text style={[styles.valor, { color: colores.textoSecundario }]}>{valorTexto}</Text>
      </View>
      <View style={[styles.pista, { backgroundColor: colores.tinta08 }]}>
        <View style={[styles.relleno, { width: ancho, backgroundColor: colores.arcilla }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 6 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: ESPACIO.md },
  etiqueta: { flex: 1, fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13 },
  valor: { fontFamily: TIPOGRAFIA.mono, fontSize: 11 },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
});