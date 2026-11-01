import type { Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';

interface PropiedadesCampoTexto
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'autoCapitalize'
    | 'maxLength'
    | 'returnKeyType'
    | 'onSubmitEditing'
    | 'editable'
    | 'keyboardType'
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
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  return (
    <View>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        ref={referencia}
        style={[styles.entrada, error ? styles.entradaError : null]}
        value={valor}
        onChangeText={alCambiar}
        placeholderTextColor={colores.tinta35}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={etiqueta}
        {...resto}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  etiqueta: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 9.5,
    letterSpacing: 1.52,
    color: colores.tinta50,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  entrada: {
    height: 50,
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.tinta14,
    borderRadius: RADIO.imagen,
    paddingHorizontal: 14,
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 14,
    color: colores.tinta,
  },
  entradaError: { borderColor: colores.arcilla },
  error: {
    marginTop: ESPACIO.xs,
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11.5,
    color: colores.arcilla,
  },
});