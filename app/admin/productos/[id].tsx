import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioProducto } from '@/components/admin/FormularioProducto';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCategorias } from '@/hooks/useCategorias';
import { useTema } from '@/hooks/useTema';
import { servicioProductos } from '@/services/servicioProductos';
import type { Producto } from '@/types';

export default function PantallaEditarProducto() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colores } = useTema();
  const categorias = useCategorias();
  const [producto, setProducto] = useState<Producto | null | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    servicioProductos.obtenerProductoPorId(id ?? '').then((encontrado) => {
      if (!cancelado) setProducto(encontrado ?? null);
    });
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <BotonCerrarSesionAdmin />
      </SafeAreaView>
      <NavegacionAdmin />
      <EncabezadoPantalla titulo="Editar producto" conBotonVolver />

      {producto === undefined ? (
        <Text style={[styles.estado, { color: colores.textoSecundario }]}>Cargando…</Text>
      ) : producto === null ? (
        <Text style={[styles.estado, { color: colores.textoSecundario }]}>
          No se encontró el producto.
        </Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormularioProducto producto={producto} categorias={categorias} />
        </ScrollView>
      )}
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
  contenido: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
  estado: {
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 13,
    textAlign: 'center',
    marginTop: ESPACIO.xl,
  },
});
