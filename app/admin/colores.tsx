import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioColor } from '@/components/admin/FormularioColor';
import { AccionesAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useAdminColores } from '@/hooks/useAdminColores';
import { useTema } from '@/hooks/useTema';
import type { ColorProducto } from '@/types';
import { confirmarAccion } from '@/utils/confirmar';

// null: formulario cerrado; 'nuevo': creando; ColorProducto: editando ese.
type EstadoFormulario = null | 'nuevo' | ColorProducto;

export default function PantallaColoresAdmin() {
  const { colores: tema } = useTema();
  const { colores, cargando, error, guardando, guardar, eliminar } = useAdminColores();
  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const editando = formulario && formulario !== 'nuevo' ? formulario : undefined;

  const pedirEliminar = async (color: ColorProducto) => {
    setAviso(null);
    const confirmado = await confirmarAccion('Eliminar color', `¿Eliminar «${color.nombre}»?`);
    if (!confirmado) return;
    try {
      await eliminar(color.id);
      if (editando?.id === color.id) setFormulario(null);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo eliminar el color.');
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: tema.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <AccionesAdmin />
      </SafeAreaView>
      <NavegacionAdmin />

      <EncabezadoPantalla
        titulo="Colores"
        subtitulo={cargando ? undefined : `${colores.length} EN TOTAL`}
        derecha={
          <Pressable
            onPress={() => {
              setAviso(null);
              setFormulario('nuevo');
            }}
            style={[styles.botonNuevo, { backgroundColor: tema.tinta }]}
            accessibilityRole="button"
            accessibilityLabel="Crear color"
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={tema.papel} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formulario ? (
          <FormularioColor
            key={editando?.id ?? 'nuevo'}
            color={editando}
            guardando={guardando}
            alGuardar={async (datos) => {
              await guardar(datos, editando?.id);
              setFormulario(null);
            }}
            alCancelar={() => setFormulario(null)}
          />
        ) : null}

        {aviso || error ? <Text style={[styles.aviso, { color: tema.arcilla }]}>{aviso ?? error}</Text> : null}

        {colores.map((color) => (
          <View key={color.id} style={[styles.fila, { borderBottomColor: tema.borde }]}>
            <View style={[styles.muestra, { backgroundColor: color.hex, borderColor: tema.borde }]} />
            <View style={styles.info}>
              <Text style={[styles.nombre, { color: tema.tinta }]} numberOfLines={1}>
                {color.nombre}
              </Text>
              <Text style={[styles.meta, { color: tema.textoSecundario }]}>
                {color.id} · {color.hex.toUpperCase()}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setAviso(null);
                setFormulario(color);
              }}
              hitSlop={8}
              style={styles.accion}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${color.nombre}`}
            >
              <Ionicons name="create-outline" size={18} color={tema.tinta} />
            </Pressable>
            <Pressable
              onPress={() => pedirEliminar(color)}
              hitSlop={8}
              style={styles.accion}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${color.nombre}`}
            >
              <Ionicons name="trash-outline" size={18} color={tema.arcilla} />
            </Pressable>
          </View>
        ))}

        {!cargando && colores.length === 0 ? (
          <EstadoVacio titulo="Sin colores" descripcion="Crea el primero con el botón +." />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barraSuperior: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.sm,
  },
  botonNuevo: {
    width: MEDIDAS.areaTactilMinima - 8,
    height: MEDIDAS.areaTactilMinima - 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
  aviso: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, marginBottom: ESPACIO.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderBottomWidth: 1,
  },
  muestra: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },
  info: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14 },
  meta: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5 },
  accion: {
    width: MEDIDAS.areaTactilMinima - 8,
    height: MEDIDAS.areaTactilMinima - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
