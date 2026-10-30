import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';

interface PropiedadesCampoCupon {
  codigoAplicado: string | null;
  alAplicar: (codigo: string) => boolean;
  alQuitar: () => void;
}

export function CampoCupon({ codigoAplicado, alAplicar, alQuitar }: PropiedadesCampoCupon) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState(false);

  const aplicar = () => {
    const valido = alAplicar(texto);
    if (valido) {
      setTexto('');
      setError(false);
    } else {
      setError(true);
    }
  };

  if (codigoAplicado) {
    return (
      <View style={styles.aplicado}>
        <Ionicons name="pricetag" size={15} color={colores.arcilla} />
        <Text style={styles.textoAplicado}>{codigoAplicado}</Text>
        <Pressable onPress={alQuitar} hitSlop={10} accessibilityRole="button">
          <Text style={styles.quitar}>Quitar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.fila}>
        <TextInput
          style={[styles.entrada, error && styles.entradaError]}
          value={texto}
          onChangeText={(valor) => {
            setTexto(valor);
            if (error) setError(false);
          }}
          placeholder="Código de descuento"
          placeholderTextColor={colores.tinta45}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Pressable style={styles.boton} onPress={aplicar} accessibilityRole="button">
          <Text style={styles.botonTexto}>APLICAR</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>Código no válido</Text> : null}
    </View>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  fila: { flexDirection: 'row', gap: ESPACIO.sm },
  entrada: {
    flex: 1,
    height: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.md,
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: RADIO.imagen,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 13,
    color: colores.tinta,
  },
  entradaError: { borderColor: colores.arcilla },
  boton: {
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.lg,
    borderWidth: 1,
    borderColor: colores.tinta,
    borderRadius: RADIO.imagen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontFamily: TIPOGRAFIA.titulo, fontSize: 12, letterSpacing: 1, color: colores.tinta },
  error: {
    marginTop: ESPACIO.sm,
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11.5,
    color: colores.arcilla,
  },
  aplicado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.sm,
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.md,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: RADIO.imagen,
  },
  textoAplicado: {
    flex: 1,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 13,
    color: colores.tinta,
  },
  quitar: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 12,
    color: colores.textoSecundario,
    textDecorationLine: 'underline',
  },
});
