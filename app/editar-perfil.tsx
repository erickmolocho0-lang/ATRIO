import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useEditarPerfil } from '@/hooks/useEditarPerfil';
import { useTema } from '@/hooks/useTema';

export default function PantallaEditarPerfil() {
  const { colores } = useTema();
  const { usuario, nombre, celular, errores, guardando, hayCambios, cambiarNombre, cambiarCelular, guardar } =
    useEditarPerfil();

  return (
    <SafeAreaView style={[styles.contenedor, { backgroundColor: colores.papel }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <EncabezadoPantalla titulo="Editar perfil" conBotonVolver />

        {usuario ? (
          <View style={styles.formulario}>
            <CampoTexto
              etiqueta="NOMBRE"
              valor={nombre}
              alCambiar={cambiarNombre}
              error={errores.nombre}
              autoCapitalize="words"
              maxLength={80}
              editable={!guardando}
            />
            <CampoTexto
              etiqueta="CELULAR"
              valor={celular}
              alCambiar={cambiarCelular}
              error={errores.celular}
              keyboardType="phone-pad"
              maxLength={20}
              editable={!guardando}
            />
            <View style={styles.bloqueCorreo}>
              <Text style={[styles.etiquetaCorreo, { color: colores.textoSecundario }]}>CORREO</Text>
              <Text style={[styles.correo, { color: colores.tinta }]}>{usuario.email}</Text>
              <Text style={[styles.nota, { color: colores.textoSecundario }]}>
                El correo es el de tu cuenta y no se puede cambiar desde aquí.
              </Text>
            </View>

            <BotonPrimario
              texto="GUARDAR CAMBIOS"
              onPress={guardar}
              cargando={guardando}
              deshabilitado={!hayCambios || guardando}
            />
          </View>
        ) : (
          <EstadoVacio
            icono="person-outline"
            titulo="Inicia sesión"
            descripcion="Necesitas una cuenta para editar tu perfil."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  contenido: { paddingBottom: ESPACIO.xxxl },
  formulario: { paddingHorizontal: MEDIDAS.margenLateral, gap: ESPACIO.lg },
  bloqueCorreo: { gap: 4 },
  etiquetaCorreo: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 9.5, letterSpacing: 1.52 },
  correo: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 15 },
  nota: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12, lineHeight: 17 },
});
