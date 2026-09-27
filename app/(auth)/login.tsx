import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import { COLORS } from '@/constants/colors';
import { useFuentesApp } from '@/hooks/useFuentesApp';
import { useInicioSesion } from '@/hooks/useInicioSesion';

export default function PantallaInicioSesion() {
  const insets = useSafeAreaInsets();
  const fuentesListas = useFuentesApp();
  const {
    correo,
    contrasena,
    mensaje,
    cargando,
    bloqueado,
    biometriaActiva,
    actualizarCorreo,
    actualizarContrasena,
    enviar,
    iniciarSesionBiometrica,
  } = useInicioSesion();

  const referenciaContrasena = useRef<TextInput>(null);

  if (!fuentesListas) {
    return <View style={estilos.pantalla} />;
  }

  return (
    <View style={estilos.pantalla}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={estilos.flexible}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={estilos.flexible}
          contentContainerStyle={[
            estilos.scroll,
            { paddingTop: Math.max(insets.top + 8, 64), paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={estilos.wordmark}>ATRIO</Text>
          <Text style={estilos.titulo}>Bienvenido de vuelta</Text>
          <Text style={estilos.subtitulo}>Ingresa para continuar tu compra.</Text>

          <View style={estilos.formulario}>
            {mensaje ? (
              <View style={estilos.alerta} accessibilityLiveRegion="polite">
                <Text style={estilos.alertaTexto}>{mensaje}</Text>
              </View>
            ) : null}

            <View style={mensaje ? estilos.camposEspaciados : undefined}>
              <View style={estilos.campo}>
                <Text style={estilos.etiqueta}>CORREO</Text>
                <TextInput
                  style={estilos.entrada}
                  value={correo}
                  onChangeText={actualizarCorreo}
                  placeholder="tu@correo.com"
                  placeholderTextColor={COLORS.tinta35}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => referenciaContrasena.current?.focus()}
                  editable={!cargando}
                />
              </View>

              <View style={[estilos.campo, estilos.campoSeparado]}>
                <Text style={estilos.etiqueta}>CONTRASEÑA</Text>
                <TextInput
                  ref={referenciaContrasena}
                  style={estilos.entrada}
                  value={contrasena}
                  onChangeText={actualizarContrasena}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.tinta35}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="current-password"
                  returnKeyType="go"
                  onSubmitEditing={enviar}
                  editable={!cargando}
                />
              </View>
            </View>

            <Pressable
              style={estilos.olvido}
              hitSlop={12}
              onPress={() => router.push('/(auth)/recuperar-contrasena')}
              accessibilityRole="link"
            >
              <Text style={estilos.olvidoTexto}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                estilos.botonPrimario,
                pressed && !cargando && !bloqueado ? estilos.botonPrimarioPresionado : null,
                bloqueado ? estilos.botonPrimarioInactivo : null,
              ]}
              onPress={enviar}
              disabled={cargando || bloqueado}
              accessibilityRole="button"
            >
              {cargando ? (
                <ActivityIndicator color={COLORS.papel} />
              ) : (
                <Text style={estilos.botonPrimarioTexto}>INICIAR SESIÓN</Text>
              )}
            </Pressable>

            {biometriaActiva ? (
              <Pressable
                style={estilos.botonBiometrico}
                onPress={iniciarSesionBiometrica}
                disabled={cargando || bloqueado}
                accessibilityRole="button"
              >
                {cargando ? (
                  <ActivityIndicator color={COLORS.tinta} />
                ) : (
                  <>
                    <Ionicons name="finger-print-outline" size={20} color={COLORS.tinta} />
                    <Text style={estilos.botonBiometricoTexto}>INICIAR CON HUELLA O ROSTRO</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <View style={estilos.divisor}>
              <View style={estilos.divisorLinea} />
              <Text style={estilos.divisorTexto}>O CONTINÚA CON</Text>
              <View style={estilos.divisorLinea} />
            </View>

            <View style={estilos.proveedores}>
              <Pressable
                style={estilos.proveedor}
                onPress={() => {
                }}
                accessibilityRole="button"
              >
                <Text style={estilos.proveedorTexto}>Google</Text>
              </Pressable>
              <Pressable
                style={estilos.proveedor}
                onPress={() => {
                }}
                accessibilityRole="button"
              >
                <Text style={estilos.proveedorTexto}>Apple</Text>
              </Pressable>
            </View>
          </View>

          <View style={estilos.flexible} />

          <Pressable
            style={estilos.filaRegistro}
            hitSlop={12}
            onPress={() => router.push('/(auth)/registro')}
            accessibilityRole="link"
          >
            <Text style={estilos.registroTexto}>
              ¿No tienes cuenta? <Text style={estilos.registroFuerte}>Regístrate</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  flexible: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 26,
  },

  wordmark: {
    fontFamily: 'Archivo_900Black',
    fontSize: 26,
    letterSpacing: -0.52,
    color: COLORS.tinta,
  },
  titulo: {
    marginTop: 44,
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 20,
    lineHeight: 25,
    color: COLORS.tinta,
  },
  subtitulo: {
    marginTop: 6,
    fontFamily: 'Archivo_400Regular',
    fontSize: 13,
    color: COLORS.textoSecundario,
  },

  formulario: { marginTop: 28 },

  alerta: {
    backgroundColor: COLORS.arcilla10,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  alertaTexto: {
    fontFamily: 'Archivo_500Medium',
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.arcilla,
  },
  camposEspaciados: { marginTop: 14 },

  campo: {},
  campoSeparado: { marginTop: 12 },
  etiqueta: {
    fontFamily: 'IBMPlexMono_600SemiBold',
    fontSize: 9.5,
    letterSpacing: 1.52,
    color: COLORS.tinta50,
    marginBottom: 6,
  },
  entrada: {
    height: 50,
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: COLORS.tinta14,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontFamily: 'Archivo_400Regular',
    fontSize: 14,
    color: COLORS.tinta,
  },

  olvido: {
    alignSelf: 'flex-end',
    marginTop: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  olvidoTexto: {
    fontFamily: 'Archivo_500Medium',
    fontSize: 12,
    color: COLORS.tinta60,
    textDecorationLine: 'underline',
  },

  botonPrimario: {
    marginTop: 12,
    height: 54,
    borderRadius: 8,
    backgroundColor: COLORS.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPrimarioPresionado: { backgroundColor: COLORS.arcilla },
  botonPrimarioInactivo: { opacity: 0.45 },
  botonPrimarioTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.3,
    color: COLORS.papel,
  },
  botonBiometrico: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.tinta20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  botonBiometricoTexto: {
    fontFamily: 'Archivo_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: COLORS.tinta,
  },

  divisor: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divisorLinea: { flex: 1, height: 1, backgroundColor: COLORS.borde },
  divisorTexto: {
    fontFamily: 'IBMPlexMono_500Medium',
    fontSize: 9.5,
    letterSpacing: 1,
    color: COLORS.tinta40,
  },

  proveedores: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  proveedor: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: COLORS.tinta14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proveedorTexto: {
    fontFamily: 'Archivo_500Medium',
    fontSize: 12,
    color: COLORS.tinta,
  },

  filaRegistro: {
    marginTop: 24,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registroTexto: {
    fontFamily: 'Archivo_400Regular',
    fontSize: 12.5,
    color: COLORS.tinta60,
  },
  registroFuerte: {
    fontFamily: 'Archivo_600SemiBold',
    color: COLORS.tinta,
  },
});
