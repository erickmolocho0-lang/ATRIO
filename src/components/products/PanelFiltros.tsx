import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import type { FiltrosCatalogo, OrdenCatalogo } from '@/hooks/useCatalogo';
import { servicioProductos } from '@/services/servicioProductos';
import type { ColorProducto } from '@/types';
import { BotonPrimario } from '@/components/common/BotonPrimario';

interface PropiedadesPanelFiltros {
  visible: boolean;
  alCerrar: () => void;
  orden: OrdenCatalogo;
  alCambiarOrden: (orden: OrdenCatalogo) => void;
  filtros: FiltrosCatalogo;
  alCambiarFiltros: (filtros: FiltrosCatalogo) => void;
  alReiniciar: () => void;
}

const OPCIONES_ORDEN: { valor: OrdenCatalogo; texto: string }[] = [
  { valor: 'novedad', texto: 'Novedad' },
  { valor: 'precio', texto: 'Precio' },
  { valor: 'popularidad', texto: 'Popularidad (30 días)' },
];

const PRECIOS_MAX: { valor: number | null; texto: string }[] = [
  { valor: null, texto: 'Sin límite' },
  { valor: 200, texto: 'Hasta S/ 200' },
  { valor: 350, texto: 'Hasta S/ 350' },
];

export function PanelFiltros({
  visible,
  alCerrar,
  orden,
  alCambiarOrden,
  filtros,
  alCambiarFiltros,
  alReiniciar,
}: PropiedadesPanelFiltros) {
  const [colores, setColores] = useState<ColorProducto[]>([]);

  useEffect(() => {
    servicioProductos.obtenerColores().then(setColores);
  }, []);

  const alternarColor = (colorId: string) => {
    const yaActivo = filtros.colores.includes(colorId);
    alCambiarFiltros({
      ...filtros,
      colores: yaActivo ? filtros.colores.filter((id) => id !== colorId) : [...filtros.colores, colorId],
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={alCerrar}>
      <View style={styles.fondo}>
        <SafeAreaView style={styles.hoja} edges={['bottom']}>
          <View style={styles.cabecera}>
            <Text style={styles.titulo}>Orden y filtros</Text>
            <Pressable onPress={alCerrar} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={COLORS.tinta} />
            </Pressable>
          </View>

          <Text style={styles.seccion}>ORDENAR POR</Text>
          {OPCIONES_ORDEN.map((opcion) => (
            <Pressable
              key={opcion.valor}
              style={styles.opcion}
              onPress={() => alCambiarOrden(opcion.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: orden === opcion.valor }}
            >
              <Text style={styles.opcionTexto}>{opcion.texto}</Text>
              <Ionicons
                name={orden === opcion.valor ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={orden === opcion.valor ? COLORS.tinta : COLORS.tinta40}
              />
            </Pressable>
          ))}

          <Text style={styles.seccion}>PRECIO</Text>
          {PRECIOS_MAX.map((opcion) => (
            <Pressable
              key={opcion.texto}
              style={styles.opcion}
              onPress={() => alCambiarFiltros({ ...filtros, precioMax: opcion.valor })}
              accessibilityRole="radio"
              accessibilityState={{ selected: filtros.precioMax === opcion.valor }}
            >
              <Text style={styles.opcionTexto}>{opcion.texto}</Text>
              <Ionicons
                name={filtros.precioMax === opcion.valor ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={filtros.precioMax === opcion.valor ? COLORS.tinta : COLORS.tinta40}
              />
            </Pressable>
          ))}

          <Text style={styles.seccion}>COLOR</Text>
          <View style={styles.colores}>
            {colores.map((color) => {
              const activo = filtros.colores.includes(color.id);
              return (
                <Pressable
                  key={color.id}
                  style={styles.colorOpcion}
                  onPress={() => alternarColor(color.id)}
                  accessibilityRole="checkbox"
                  accessibilityLabel={color.nombre}
                  accessibilityState={{ checked: activo }}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: color.hex },
                      activo && styles.swatchActivo,
                    ]}
                  />
                  <Text style={styles.colorTexto}>{color.nombre}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.opcion, styles.opcionSwitch]}>
            <Text style={styles.opcionTexto}>Solo disponibles</Text>
            <Switch
              value={filtros.soloDisponibles}
              onValueChange={(valor) => alCambiarFiltros({ ...filtros, soloDisponibles: valor })}
            />
          </View>

          <View style={styles.acciones}>
            <BotonPrimario
              texto="LIMPIAR"
              variante="contorno"
              onPress={alReiniciar}
              altura={48}
              style={styles.accion}
            />
            <BotonPrimario
              texto="VER RESULTADOS"
              onPress={alCerrar}
              altura={48}
              style={styles.accion}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: COLORS.tinta35, justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: COLORS.papel,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ESPACIO.md,
  },
  titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18, color: COLORS.tinta },
  seccion: {
    marginTop: ESPACIO.base,
    marginBottom: ESPACIO.xs,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: COLORS.textoSecundario,
  },
  opcion: {
    minHeight: MEDIDAS.areaTactilMinima,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  opcionSwitch: { marginTop: ESPACIO.sm },
  opcionTexto: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14, color: COLORS.tinta },
  colores: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.md, paddingVertical: ESPACIO.xs },
  colorOpcion: { alignItems: 'center', gap: ESPACIO.xs, width: 48 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borde,
  },
  swatchActivo: { borderWidth: 2, borderColor: COLORS.tinta },
  colorTexto: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9,
    color: COLORS.tinta,
    textAlign: 'center',
  },
  acciones: { flexDirection: 'row', gap: ESPACIO.md, marginTop: ESPACIO.lg, marginBottom: ESPACIO.md },
  accion: { flex: 1 },
});
