import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import type { Direccion } from '@/types';

interface PropiedadesTarjetaDireccion {
  direccion: Direccion;
  seleccionada?: boolean;
  mostrarSeleccion?: boolean;
  alPresionar?: () => void;
  alEditar?: () => void;
  alEliminar?: () => void;
}

export function TarjetaDireccion({
  direccion,
  seleccionada = false,
  mostrarSeleccion = false,
  alPresionar,
  alEditar,
  alEliminar,
}: PropiedadesTarjetaDireccion) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  return (
    <View style={[styles.contenedor, seleccionada && styles.seleccionada]}>
      <Pressable
        style={styles.principal}
        onPress={alPresionar}
        disabled={!alPresionar}
        accessibilityRole="button"
        accessibilityLabel={`Dirección ${direccion.etiqueta ?? direccion.direccion}`}
      >
        {mostrarSeleccion ? (
          <Ionicons
            name={seleccionada ? 'radio-button-on' : 'radio-button-off'}
            size={20}
            color={seleccionada ? COLORS.tinta : COLORS.tinta40}
          />
        ) : null}
        <View style={styles.textos}>
          <View style={styles.filaTitulo}>
            <Text style={styles.titulo}>{direccion.etiqueta ?? 'Dirección'}</Text>
            {direccion.predeterminada ? <Text style={styles.chip}>PREDETERMINADA</Text> : null}
          </View>
          <Text style={styles.linea}>{direccion.direccion}</Text>
          <Text style={styles.linea}>{direccion.distrito}</Text>
          {direccion.referencia ? (
            <Text style={styles.referencia}>Ref.: {direccion.referencia}</Text>
          ) : null}
        </View>
      </Pressable>
      {alEditar ? (
        <Pressable
          onPress={alEditar}
          hitSlop={8}
          style={styles.editar}
          accessibilityRole="button"
          accessibilityLabel="Editar dirección"
        >
          <Text style={styles.editarTexto}>Editar</Text>
        </Pressable>
      ) : null}
      {alEliminar ? (
        <Pressable
          onPress={alEliminar}
          hitSlop={8}
          style={styles.editar}
          accessibilityRole="button"
          accessibilityLabel="Eliminar dirección"
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.arcilla} />
        </Pressable>
      ) : null}
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: COLORS.blanco,
  },
  seleccionada: { borderColor: COLORS.tinta },
  principal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    padding: ESPACIO.base,
  },
  textos: { flex: 1, gap: 2 },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.sm },
  titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  chip: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 8.5,
    letterSpacing: 0.8,
    color: COLORS.arcilla,
    backgroundColor: COLORS.arcilla10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  linea: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, color: COLORS.tinta },
  referencia: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
  editar: {
    minHeight: MEDIDAS.areaTactilMinima,
    justifyContent: 'center',
    paddingHorizontal: ESPACIO.base,
  },
  editarTexto: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 12,
    color: COLORS.textoSecundario,
    textDecorationLine: 'underline',
  },
});
