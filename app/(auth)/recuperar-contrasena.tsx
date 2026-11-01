import { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { useRecuperarContrasena } from '@/hooks/useRecuperarContrasena';

export default function PantallaRecuperarContrasena() {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const {
    fase,
    email,
    setEmail,
    contrasena,
    setContrasena,
    confirmacion,
    setConfirmacion,
    mensaje,
    cargando,
    solicitarCorreo,
    guardarNuevaContrasena,
    irALogin,
  } = useRecuperarContrasena();

  return (
    <View style={styles.pantalla}>
      <KeyboardAvoidingView style={styles.flexible} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.marca}>ATRIO</Text>

          {fase === 'verificando' ? (
            <View style={styles.centrado}>
              <ActivityIndicator color={COLORS.tinta} />
            </View>
          ) : null}

          {fase === 'pedir-correo' ? (
            <>
              <Text style={styles.titulo}>Recupera tu contraseña</Text>
              <Text style={styles.subtitulo}>Ingresa el correo asociado a tu cuenta.</Text>
              {mensaje ? <Text style={styles.mensaje} accessibilityLiveRegion="polite">{mensaje}</Text> : null}
              <Text style={styles.etiqueta}>CORREO</Text>
              <TextInput
                style={styles.entrada}
                value={email}
                onChangeText={setEmail}
                placeholder="tu@correo.com"
                placeholderTextColor={COLORS.tinta35}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!cargando}
                returnKeyType="send"
                onSubmitEditing={solicitarCorreo}
              />
              <Pressable
                style={({ pressed }) => [styles.boton, pressed && !cargando && styles.presionado]}
                onPress={solicitarCorreo}
                disabled={cargando}
                accessibilityRole="button"
              >
                {cargando ? <ActivityIndicator color={COLORS.papel} /> : <Text style={styles.botonTexto}>CONTINUAR</Text>}
              </Pressable>
              <Pressable style={styles.enlace} onPress={irALogin} accessibilityRole="link">
                <Text style={styles.enlaceTexto}>Volver a iniciar sesión</Text>
              </Pressable>
            </>
          ) : null}

          {fase === 'nueva-contrasena' ? (
            <>
              <Text style={styles.titulo}>Elige tu nueva contraseña</Text>
              <Text style={styles.subtitulo}>Confirmamos tu identidad desde el enlace del correo.</Text>
              {mensaje ? <Text style={styles.mensaje} accessibilityLiveRegion="polite">{mensaje}</Text> : null}
              <Text style={styles.etiqueta}>NUEVA CONTRASEÑA</Text>
              <TextInput
                style={styles.entrada}
                value={contrasena}
                onChangeText={setContrasena}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={COLORS.tinta35}
                secureTextEntry
                autoCapitalize="none"
                editable={!cargando}
              />
              <Text style={[styles.etiqueta, styles.etiquetaSeparada]}>CONFIRMAR CONTRASEÑA</Text>
              <TextInput
                style={styles.entrada}
                value={confirmacion}
                onChangeText={setConfirmacion}
                placeholder="Repite tu contraseña"
                placeholderTextColor={COLORS.tinta35}
                secureTextEntry
                autoCapitalize="none"
                editable={!cargando}
                returnKeyType="done"
                onSubmitEditing={guardarNuevaContrasena}
              />
              <Pressable
                style={({ pressed }) => [styles.boton, pressed && !cargando && styles.presionado]}
                onPress={guardarNuevaContrasena}
                disabled={cargando}
                accessibilityRole="button"
              >
                {cargando ? <ActivityIndicator color={COLORS.papel} /> : <Text style={styles.botonTexto}>GUARDAR CONTRASEÑA</Text>}
              </Pressable>
            </>
          ) : null}

          {fase === 'lista' ? (
            <>
              <Text style={styles.titulo}>Contraseña actualizada</Text>
              <Text style={styles.subtitulo}>Ya puedes iniciar sesión con tu nueva contraseña.</Text>
              <Pressable
                style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
                onPress={irALogin}
                accessibilityRole="button"
              >
                <Text style={styles.botonTexto}>IR A INICIAR SESIÓN</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  flexible: { flex: 1 },
  contenido: { flexGrow: 1, paddingHorizontal: 26 },
  centrado: { marginTop: 60, alignItems: 'center' },
  marca: { fontFamily: 'Archivo_900Black', fontSize: 26, color: COLORS.tinta },
  titulo: { marginTop: 40, fontFamily: 'Archivo_600SemiBold', fontSize: 20, color: COLORS.tinta },
  subtitulo: { marginTop: 8, marginBottom: 24, fontFamily: 'Archivo_400Regular', fontSize: 13, lineHeight: 19, color: COLORS.textoSecundario },
  mensaje: { marginBottom: 14, padding: 12, borderRadius: 6, backgroundColor: COLORS.arcilla10, fontFamily: 'Archivo_500Medium', fontSize: 12, lineHeight: 17, color: COLORS.arcilla },
  etiqueta: { marginBottom: 6, fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 9.5, color: COLORS.tinta50 },
  etiquetaSeparada: { marginTop: 14 },
  entrada: { height: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.tinta14, borderRadius: 8, backgroundColor: COLORS.blanco, fontFamily: 'Archivo_400Regular', fontSize: 14, color: COLORS.tinta },
  boton: { height: 54, marginTop: 22, borderRadius: 8, backgroundColor: COLORS.tinta, alignItems: 'center', justifyContent: 'center' },
  presionado: { backgroundColor: COLORS.arcilla },
  botonTexto: { fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: COLORS.papel },
  enlace: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  enlaceTexto: { fontFamily: 'Archivo_500Medium', fontSize: 12.5, color: COLORS.tinta60, textDecorationLine: 'underline' },
});
