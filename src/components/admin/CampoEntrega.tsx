import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';

interface Propiedades extends Pick<TextInputProps, 'keyboardType' | 'placeholder' | 'maxLength' | 'multiline' | 'autoCapitalize'> {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  deshabilitado?: boolean;
}

export function CampoEntrega({ etiqueta, valor, alCambiar, deshabilitado, multiline, ...resto }: Propiedades) {
  const { colores } = useTema();
  return (
    <View style={styles.campo}>
      <Text style={[styles.etiqueta, { color: colores.textoSecundario }]}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={alCambiar}
        editable={!deshabilitado}
        autoCorrect={false}
        accessibilityLabel={etiqueta}
        placeholderTextColor={colores.tinta35}
        multiline={multiline}
        style={[styles.entrada, {
          color: colores.tinta, backgroundColor: colores.blanco, borderColor: colores.borde,
        }, multiline && styles.multilinea]}
        {...resto}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  campo: { gap: ESPACIO.sm },
  etiqueta: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12 },
  entrada: { minHeight: 48, borderWidth: 1, borderRadius: RADIO.imagen, paddingHorizontal: 12,
    paddingVertical: 12, fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  multilinea: { minHeight: 88, textAlignVertical: 'top' },
});
