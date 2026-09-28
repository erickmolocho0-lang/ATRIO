
import { StyleSheet, Text, View } from 'react-native';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { VentaDiaria } from '@/types';

const ALTO_MAXIMO = 96;

export function BarrasPorDia({ datos }: { datos: VentaDiaria[] }) {
  const { colores } = useTema();
  const recientes = datos.slice(-14);
  const maximo = Math.max(...recientes.map((d) => d.total), 1);

  return (
    <View style={styles.contenedor}>
      {recientes.map((dato) => (
        <View key={dato.fecha} style={styles.columna}>
          <View
            style={[
              styles.barra,
              { height: Math.max(3, (dato.total / maximo) * ALTO_MAXIMO), backgroundColor: colores.arcilla },
            ]}
          />
          <Text style={[styles.dia, { color: colores.textoSecundario }]}>{dato.fecha.slice(8, 10)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTO_MAXIMO + 22,
    gap: ESPACIO.xs,
  },
  columna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  barra: { width: '100%', borderRadius: 3 },
  dia: { fontFamily: TIPOGRAFIA.mono, fontSize: 9 },
});