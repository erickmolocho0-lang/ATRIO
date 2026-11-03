import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { OPCIONES_RANGO, type PresetRango } from '@/utils/rangoFechas';

interface PropiedadesSelectorRangoFechas {
  preset: PresetRango;
  etiquetaRango: string;
  error: string | null;
  alSeleccionar: (preset: PresetRango) => void;
  alAplicarPersonalizado: (desde: string, hasta: string) => void;
}

export function SelectorRangoFechas({
  preset,
  etiquetaRango,
  error,
  alSeleccionar,
  alAplicarPersonalizado,
}: PropiedadesSelectorRangoFechas) {
  const { colores } = useTema();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const campo = [styles.campo, { borderColor: colores.borde, color: colores.tinta, backgroundColor: colores.blanco }];

  return (
    <View style={styles.contenedor}>
      <View style={styles.chips}>
        {OPCIONES_RANGO.map((opcion) => {
          const activa = opcion.id === preset;
          return (
            <Pressable
              key={opcion.id}
              onPress={() => alSeleccionar(opcion.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              style={[
                styles.chip,
                { borderColor: activa ? colores.tinta : colores.borde },
                activa && { backgroundColor: colores.tinta },
              ]}
            >
              <Text style={[styles.textoChip, { color: activa ? colores.papel : colores.tinta }]}>
                {opcion.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {preset === 'personalizado' ? (
        <View style={styles.personalizado}>
          <View style={styles.camposFila}>
            <TextInput
              value={desde}
              onChangeText={setDesde}
              placeholder="Desde DD/MM/AAAA"
              placeholderTextColor={colores.tinta40}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Fecha desde"
              style={campo}
            />
            <TextInput
              value={hasta}
              onChangeText={setHasta}
              placeholder="Hasta DD/MM/AAAA"
              placeholderTextColor={colores.tinta40}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Fecha hasta"
              style={campo}
            />
          </View>
          <Pressable
            onPress={() => alAplicarPersonalizado(desde, hasta)}
            accessibilityRole="button"
            style={[styles.botonAplicar, { backgroundColor: colores.tinta }]}
          >
            <Text style={[styles.textoAplicar, { color: colores.papel }]}>APLICAR</Text>
          </Pressable>
          {error ? <Text style={[styles.error, { color: colores.arcilla }]}>{error}</Text> : null}
        </View>
      ) : null}

      <Text style={[styles.etiquetaRango, { color: colores.textoSecundario }]}>PERÍODO · {etiquetaRango}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: ESPACIO.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  chip: {
    minHeight: MEDIDAS.areaTactilMinima - 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIO.chip,
    paddingHorizontal: ESPACIO.base,
  },
  textoChip: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12.5 },
  personalizado: { gap: ESPACIO.sm },
  camposFila: { flexDirection: 'row', gap: ESPACIO.sm },
  campo: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: RADIO.resumen,
    paddingHorizontal: ESPACIO.md,
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
  },
  botonAplicar: {
    height: 44,
    borderRadius: RADIO.resumen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAplicar: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, letterSpacing: 1 },
  error: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12, lineHeight: 17 },
  etiquetaRango: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5, letterSpacing: 0.8 },
});
