import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormularioProducto } from '@/components/admin/FormularioProducto';
import { BotonCerrarSesionAdmin, NavegacionAdmin } from '@/components/admin/NavegacionAdmin';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { MEDIDAS, ESPACIO } from '@/constants/theme';
import { useCategorias } from '@/hooks/useCategorias';
import { useTema } from '@/hooks/useTema';

export default function PantallaNuevoProducto() {
  const { colores } = useTema();
  const categorias = useCategorias();

  return (
    <View style={[styles.pantalla, { backgroundColor: colores.papel }]}>
      <SafeAreaView edges={['top']} style={styles.barraSuperior}>
        <BotonCerrarSesionAdmin />
      </SafeAreaView>
      <NavegacionAdmin />
      <EncabezadoPantalla titulo="Nuevo producto" conBotonVolver />
      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FormularioProducto categorias={categorias} />
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
  contenido: { paddingHorizontal: MEDIDAS.margenLateral, paddingBottom: ESPACIO.xxl },
});
