import type { Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { COLORS } from '@/constants/colors';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';

interface PropiedadesCampoTexto
  extends Pick<
    TextInputProps,
    'placeholder' | 'autoCapitalize' | 'maxLength' | 'returnKeyType' | 'onSubmitEditing' | 'editable'
  > {
  etiqueta: string;
  valor: string;
  alCambiar: (texto: string) => void;
  error?: string;
  referencia?: Ref<TextInputInstance>;
}

export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  error,
  referencia,
  autoCapitalize = 'sentences',
  ...resto
}: PropiedadesCampoTexto) {
  return (
    <View>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        ref={referencia}
        style={[styles.entrada, error ? styles.entradaError : null]}
        value={valor}
        onChangeText={alCambiar}
        placeholderTextColor={COLORS.tinta35}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={etiqueta}
        {...resto}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 9.5,
    letterSpacing: 1.52,
    color: COLORS.tinta50,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  entrada: {
    height: 50,
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: COLORS.tinta14,
    borderRadius: RADIO.imagen,
    paddingHorizontal: 14,
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 14,
    color: COLORS.tinta,
  },
  entradaError: { borderColor: COLORS.arcilla },
  error: {
    marginTop: ESPACIO.xs,
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11.5,
    color: COLORS.arcilla,
  },
});
