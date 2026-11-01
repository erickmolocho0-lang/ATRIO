import { router } from 'expo-router';
import { useState, useMemo } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { ErrorConfirmacionPendiente, ErrorCorreoRegistrado } from '@/services/servicioAutenticacion';

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PantallaRegistro() {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const { registrar } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    if (cargando) return;
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();
    const celularLimpio = celular.replace(/\D/g, '');
    if (nombreLimpio.length < 2) return setMensaje('Escribe tu nombre completo.');
    if (!CORREO_VALIDO.test(emailLimpio)) return setMensaje('Ingresa un correo válido.');
    if (celularLimpio.length < 7 || celularLimpio.length > 15) {
      return setMensaje('Ingresa un número de celular válido.');
    }
    if (contrasena.length < 8) return setMensaje('La contraseña debe tener al menos 8 caracteres.');
    if (contrasena !== confirmacion) return setMensaje('Las contraseñas no coinciden.');

    setCargando(true);
    setMensaje('');
    try {
      await registrar({ nombre: nombreLimpio, email: emailLimpio, celular: celularLimpio, contrasena });
      router.replace('/(tabs)');
    } catch (error) {
      if (error instanceof ErrorConfirmacionPendiente) {
        setMensaje('Cuenta creada. Revisa tu correo y confirma tu cuenta antes de iniciar sesión.');
      } else if (error instanceof ErrorCorreoRegistrado) {
        setMensaje('Ya existe una cuenta con ese correo.');
      } else {
        setMensaje('No se pudo crear la cuenta. Inténtalo de nuevo.');
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.pantalla}>
      <KeyboardAvoidingView style={styles.flexible} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.marca}>ATRIO</Text>
          <Text style={styles.titulo}>Crea tu cuenta</Text>
          <Text style={styles.subtitulo}>Tus datos se guardarán en este dispositivo.</Text>
          {mensaje ? <Text style={styles.mensaje} accessibilityLiveRegion="polite">{mensaje}</Text> : null}
          <Text style={styles.etiqueta}>NOMBRE</Text>
          <TextInput style={styles.entrada} value={nombre} onChangeText={setNombre} placeholder="Tu nombre" placeholderTextColor={COLORS.tinta35} autoCapitalize="words" autoComplete="name" editable={!cargando} />
          <Text style={styles.etiqueta}>CORREO</Text>
          <TextInput style={styles.entrada} value={email} onChangeText={setEmail} placeholder="tu@correo.com" placeholderTextColor={COLORS.tinta35} keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!cargando} />
          <Text style={styles.etiqueta}>CELULAR</Text>
          <TextInput style={styles.entrada} value={celular} onChangeText={setCelular} placeholder="999 999 999" placeholderTextColor={COLORS.tinta35} keyboardType="phone-pad" autoComplete="tel" editable={!cargando} />
          <Text style={styles.etiqueta}>CONTRASEÑA</Text>
          <TextInput style={styles.entrada} value={contrasena} onChangeText={setContrasena} placeholder="Mínimo 8 caracteres" placeholderTextColor={COLORS.tinta35} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!cargando} />
          <Text style={styles.etiqueta}>CONFIRMAR CONTRASEÑA</Text>
          <TextInput style={styles.entrada} value={confirmacion} onChangeText={setConfirmacion} placeholder="Repite tu contraseña" placeholderTextColor={COLORS.tinta35} secureTextEntry autoCapitalize="none" autoComplete="new-password" editable={!cargando} onSubmitEditing={enviar} />
          <Pressable style={({ pressed }) => [styles.boton, pressed && !cargando && styles.presionado]} onPress={enviar} disabled={cargando} accessibilityRole="button">
            {cargando ? <ActivityIndicator color={COLORS.papel} /> : <Text style={styles.botonTexto}>CREAR CUENTA</Text>}
          </Pressable>
          <Pressable style={styles.enlace} onPress={() => router.replace('/(auth)/login')} accessibilityRole="link">
            <Text style={styles.enlaceTexto}>¿Ya tienes cuenta? <Text style={styles.enlaceFuerte}>Inicia sesión</Text></Text>
          </Pressable>
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
  marca: { fontFamily: 'Archivo_900Black', fontSize: 26, color: COLORS.tinta },
  titulo: { marginTop: 34, fontFamily: 'Archivo_600SemiBold', fontSize: 20, color: COLORS.tinta },
  subtitulo: { marginTop: 6, marginBottom: 22, fontFamily: 'Archivo_400Regular', fontSize: 13, color: COLORS.textoSecundario },
  mensaje: { marginBottom: 14, padding: 12, borderRadius: 6, backgroundColor: COLORS.arcilla10, fontFamily: 'Archivo_500Medium', fontSize: 12, lineHeight: 17, color: COLORS.arcilla },
  etiqueta: { marginTop: 12, marginBottom: 6, fontFamily: 'IBMPlexMono_600SemiBold', fontSize: 9.5, color: COLORS.tinta50 },
  entrada: { height: 50, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.tinta14, borderRadius: 8, backgroundColor: COLORS.blanco, fontFamily: 'Archivo_400Regular', fontSize: 14, color: COLORS.tinta },
  boton: { height: 54, marginTop: 24, borderRadius: 8, backgroundColor: COLORS.tinta, alignItems: 'center', justifyContent: 'center' },
  presionado: { backgroundColor: COLORS.arcilla },
  botonTexto: { fontFamily: 'Archivo_600SemiBold', fontSize: 13, color: COLORS.papel },
  enlace: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  enlaceTexto: { fontFamily: 'Archivo_400Regular', fontSize: 12.5, color: COLORS.tinta60 },
  enlaceFuerte: { fontFamily: 'Archivo_600SemiBold', color: COLORS.tinta },
});
