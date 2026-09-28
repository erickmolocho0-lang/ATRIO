import { Switch, StyleSheet, Text, View } from 'react-native';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';

interface PropiedadesFilaInterruptor {
  titulo: string;
  descripcion?: string;
  valor: boolean;
  onCambiar: (valor: boolean) => void;
}

export function FilaInterruptor({ titulo, descripcion, valor, onCambiar }: PropiedadesFilaInterruptor) {
  const { colores, esOscuro } = useTema();
  const colorPerilla = valor ? colores.papel : esOscuro ? '#A19E96' : '#FFFFFF';

  return (
    <View style={[styles.fila, { borderBottomColor: colores.borde }]}>
      <View style={styles.textos}>
        <Text style={[styles.titulo, { color: colores.tinta }]}>{titulo}</Text>
        {descripcion ? <Text style={[styles.descripcion, { color: colores.textoSecundario }]}>{descripcion}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onCambiar}
        trackColor={{ false: colores.tinta14, true: colores.tinta }}
        thumbColor={colorPerilla}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingVertical: ESPACIO.sm,
    borderBottomWidth: 1,
    gap: ESPACIO.md,
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  descripcion: { fontFamily: TIPOGRAFIA.mono, fontSize: 11 },
});