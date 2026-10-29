import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioCampana } from '@/components/admin/FormularioCampana';
import { AccionesAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAdminCampanas } from '@/hooks/useAdminCampanas';
import { useCategorias } from '@/hooks/useCategorias';
import { useTema } from '@/hooks/useTema';
import type { CampanaAdmin } from '@/types';
import { confirmarAccion } from '@/utils/confirmar';

// null: formulario cerrado; 'nueva': creando; CampanaAdmin: editando esa.
type EstadoFormulario = null | 'nueva' | CampanaAdmin;

export default function PantallaCampanasAdmin() {
  const { colores } = useTema();
  const categorias = useCategorias();
  const { campanas, cargando, error, guardando, guardar, alternarActiva, eliminar } = useAdminCampanas();
  const [formulario, setFormulario] = useState<EstadoFormulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const editando = formulario && formulario !== 'nueva' ? formulario : undefined;
  const nombreCategoria = (id: string) => categorias.find((c) => c.id === id)?.nombre ?? id;

  const pedirEliminar = async (campana: CampanaAdmin) => {
    setAviso(null);
    const confirmado = await confirmarAccion('Eliminar campaña', `¿Eliminar «${campana.titulo}»?`);
    if (!confirmado) return;
    try {
      await eliminar(campana.id);
      if (editando?.id === campana.id) setFormulario(null);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo eliminar la campaña.');
    }
  };

  const cambiarActiva = async (campana: CampanaAdmin) => {
    setAviso(null);
    try {
      await alternarActiva(campana);
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la campaña.');
    }
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <AccionesAdmin />
      </SafeAreaView>
      <NavegacionAdmin />

      <EncabezadoPantalla
        titulo="Campañas"
        subtitulo={cargando ? undefined : `${campanas.filter((c) => c.activa).length} ACTIVAS DE ${campanas.length}`}
        derecha={
          <Pressable
            onPress={() => {
              setAviso(null);
              setFormulario('nueva');
            }}
            style={[styles.botonNuevo, { backgroundColor: colores.tinta }]}
            accessibilityRole="button"
            accessibilityLabel="Crear campaña"
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
          <FormularioCampana
            key={editando?.id ?? 'nueva'}
            campana={editando}
            categorias={categorias}
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

        {campanas.map((campana) => (
          <View key={campana.id} style={[styles.fila, { borderBottomColor: colores.borde }]}>
            {/* Solo esta zona abre la edición: el Switch queda afuera. */}
            <Pressable
              onPress={() => {
                setAviso(null);
                setFormulario(campana);
              }}
              style={styles.zonaEditar}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${campana.titulo}`}
            >
              {campana.imagenUrl ? (
                <Image source={{ uri: campana.imagenUrl }} style={[styles.miniatura, { backgroundColor: colores.lino }]} />
              ) : (
                <View style={[styles.miniatura, styles.sinImagen, { backgroundColor: colores.lino }]}>
                  <Ionicons name="megaphone-outline" size={18} color={colores.tinta40} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.nombre, { color: colores.tinta }]} numberOfLines={1}>
                  {campana.titulo}
                </Text>
                <Text style={[styles.meta, { color: colores.textoSecundario }]} numberOfLines={1}>
                  {campana.etiqueta} · {campana.textoBoton} → {nombreCategoria(campana.categoriaDestino)}
                </Text>
              </View>
            </Pressable>
            <View style={styles.estado}>
              <Switch
                value={campana.activa}
                onValueChange={() => cambiarActiva(campana)}
                accessibilityLabel={campana.activa ? `Desactivar ${campana.titulo}` : `Activar ${campana.titulo}`}
              />
              <Text style={[styles.etiquetaEstado, { color: colores.textoSecundario }]}>
                {campana.activa ? 'ACTIVA' : 'INACTIVA'}
              </Text>
            </View>
            <Pressable
              onPress={() => pedirEliminar(campana)}
              hitSlop={8}
              style={styles.accion}
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${campana.titulo}`}
            >
              <Ionicons name="trash-outline" size={18} color={colores.arcilla} />
            </Pressable>
          </View>
        ))}

        {!cargando && campanas.length === 0 ? (
          <EstadoVacio
            titulo="Sin campañas"
            descripcion="Mientras no haya campañas activas, Inicio muestra la campaña de respaldo."
          />
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
    gap: ESPACIO.sm,
    minHeight: MEDIDAS.areaTactilMinima + ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderBottomWidth: 1,
  },
  zonaEditar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md },
  miniatura: { width: 64, height: 40, borderRadius: RADIO.talla },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14 },
  meta: { fontFamily: TIPOGRAFIA.mono, fontSize: 10.5 },
  estado: { alignItems: 'center', gap: 2 },
  etiquetaEstado: { fontFamily: TIPOGRAFIA.mono, fontSize: 8.5, letterSpacing: 0.6 },
  accion: {
    width: MEDIDAS.areaTactilMinima - 8,
    height: MEDIDAS.areaTactilMinima - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
