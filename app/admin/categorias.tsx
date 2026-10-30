import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioCategoria } from '@/components/admin/FormularioCategoria';
import { AccionesAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAdminCategorias } from '@/hooks/useAdminCategorias';
import { useTema } from '@/hooks/useTema';
import type { Categoria } from '@/types';
import { confirmarAccion } from '@/utils/confirmar';

// null: formulario cerrado; 'nueva': creando; Categoria: editando esa.
type EstadoFormulario = null | 'nueva' | Categoria;

export default function PantallaCategoriasAdmin() {
  const { colores } = useTema();
  const { categorias, cargando, error, guardando, guardar, eliminar } = useAdminCategorias();
  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const editando = formulario && formulario !== 'nueva' ? formulario : undefined;

  const pedirEliminar = async (categoria: Categoria) => {
    setAviso(null);
    const confirmado = await confirmarAccion('Eliminar categoría', `¿Eliminar «${categoria.nombre}»?`);
    if (!confirmado) return;
    try {
      await eliminar(categoria.id);
      if (editando?.id === categoria.id) setFormulario(null);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo eliminar la categoría.');
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <AccionesAdmin />
      </SafeAreaView>
      <NavegacionAdmin />

      <EncabezadoPantalla
        titulo="Categorías"
        subtitulo={cargando ? undefined : `${categorias.length} EN TOTAL`}
        derecha={
          <Pressable
            onPress={() => {
              setAviso(null);
              setFormulario('nueva');
            }}
            style={[styles.botonNuevo, { backgroundColor: colores.tinta }]}
            accessibilityRole="button"
            accessibilityLabel="Crear categoría"
            hitSlop={8}
          >
            <Ionicons name="add" size={20} color={colores.papel} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {formulario ? (
          <FormularioCategoria
            key={editando?.id ?? 'nueva'}
            categoria={editando}
            guardando={guardando}
            alGuardar={async (datos) => {
              await guardar(datos, editando?.id);
              setFormulario(null);
            }}
            alCancelar={() => setFormulario(null)}
          />
        ) : null}

        {aviso || error ? (
          <Text style={[styles.aviso, { color: colores.arcilla }]}>{aviso ?? error}</Text>
        ) : null}

        {categorias.map((categoria) => (
          <View key={categoria.id} style={[styles.fila, { borderBottomColor: colores.borde }]}>
            {categoria.imagenUrl ? (
              <Image source={{ uri: categoria.imagenUrl }} style={[styles.miniatura, { backgroundColor: colores.lino }]} />
            ) : (
              <View style={[styles.miniatura, styles.sinImagen, { backgroundColor: colores.lino }]}>
                <Ionicons name="pricetags-outline" size={18} color={colores.tinta40} />
              </View>
            )}
            <View style={styles.info}>
              <Text style={[styles.nombre, { color: colores.tinta }]} numberOfLines={1}>
                {categoria.nombre}
              </Text>
              <Text style={[styles.meta, { color: colores.textoSecundario }]} numberOfLines={1}>
                {categoria.id} · {categoria.conteoArticulos} activos
              </Text>
              {categoria.subcategorias.length > 0 ? (
                <Text style={[styles.meta, { color: colores.textoSecundario }]} numberOfLines={1}>
                  {categoria.subcategorias.join(', ')}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => {
                setAviso(null);
                setFormulario(categoria);
              }}
              hitSlop={8}
              style={styles.accion}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${categoria.nombre}`}
            >
              <Ionicons name="create-outline" size={18} color={colores.tinta} />
            </Pressable>
            <Pressable
              onPress={() => pedirEliminar(categoria)}
              hitSlop={8}
              style={styles.accion}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${categoria.nombre}`}
            >
              <Ionicons name="trash-outline" size={18} color={colores.arcilla} />
            </Pressable>
          </View>
        ))}

        {!cargando && categorias.length === 0 ? (
          <EstadoVacio titulo="Sin categorías" descripcion="Crea la primera con el botón +." />
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
  miniatura: { width: 44, height: 44, borderRadius: RADIO.talla },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
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
