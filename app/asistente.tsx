import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BurbujaMensaje } from '@/components/ai/BurbujaMensaje';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAgente } from '@/hooks/useAgente';
import { useTema } from '@/hooks/useTema';
import type { MensajeChat, OrigenAsistente } from '@/types';

export default function PantallaAsistente() {
  const { colores } = useTema();
  const parametros = useLocalSearchParams<{ origen?: string }>();
  const origen: OrigenAsistente = parametros.origen === 'catalogo' ? 'catalogo' : 'inicio';
  const { mensajes, texto, setTexto, enviando, error, enviarMensaje, nuevaConversacion } = useAgente(origen);
  const soloSaludo = mensajes.length <= 1;
  const listaRef = useRef<FlatList<MensajeChat>>(null);

  // Si /asistente termina siendo la única pantalla en el historial (por
  // ejemplo, Expo Go reabriendo directo en esta ruta), router.back() no
  // tiene a dónde volver y React Navigation lanza "GO_BACK was not handled
  // by any navigator" — de ahí el fallback seguro a Inicio.
  const cerrarAsistente = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    if (mensajes.length > 0) {
      requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
    }
  }, [mensajes, enviando]);

  return (
    <SafeAreaView style={[styles.pantalla, { backgroundColor: colores.papel }]} edges={['top', 'bottom']}>
      <View style={[styles.encabezado, { borderBottomColor: colores.borde }]}>
        <Text style={[styles.titulo, { color: colores.tinta }]}>Luna</Text>
        <View style={styles.accionesEncabezado}>
          <Pressable
            onPress={nuevaConversacion}
            disabled={enviando || soloSaludo}
            accessibilityRole="button"
            accessibilityLabel="Nueva conversación"
            hitSlop={8}
            style={[styles.botonNueva, (enviando || soloSaludo) && styles.botonEnviarInactivo]}
          >
            <Ionicons name="create-outline" size={16} color={colores.textoSecundario} />
            <Text style={[styles.textoNueva, { color: colores.textoSecundario }]}>Nueva conversación</Text>
          </Pressable>
          <Pressable
            onPress={cerrarAsistente}
            accessibilityRole="button"
            accessibilityLabel="Cerrar asistente"
            hitSlop={12}
            style={styles.botonCerrar}
          >
            <Ionicons name="close" size={24} color={colores.tinta} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <FlatList
          ref={listaRef}
          data={mensajes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => <BurbujaMensaje mensaje={item} />}
          onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: true })}
        />

        {enviando ? (
          <View style={styles.filaCargando}>
            <ActivityIndicator color={colores.textoSecundario} size="small" />
            <Text style={[styles.textoCargando, { color: colores.textoSecundario }]}>Pensando…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.bannerError, { backgroundColor: colores.arcilla10 }]}>
            <Text style={[styles.textoError, { color: colores.arcilla }]}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.filaEntrada, { borderTopColor: colores.borde }]}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Escribe tu pregunta…"
            placeholderTextColor={colores.tinta35}
            style={[styles.entrada, { color: colores.tinta, backgroundColor: colores.blanco, borderColor: colores.borde }]}
            multiline
            maxLength={500}
            editable={!enviando}
            onSubmitEditing={enviarMensaje}
            accessibilityLabel="Mensaje para el asistente"
          />
          <Pressable
            onPress={enviarMensaje}
            disabled={enviando || texto.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            style={[
              styles.botonEnviar,
              { backgroundColor: colores.tinta },
              (enviando || texto.trim().length === 0) && styles.botonEnviarInactivo,
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colores.papel} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  flex: { flex: 1 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingVertical: ESPACIO.md,
    borderBottomWidth: 1,
    minHeight: MEDIDAS.areaTactilMinima,
  },
  titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 17 },
  accionesEncabezado: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.xs },
  botonNueva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.xs,
  },
  textoNueva: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11.5 },
  botonCerrar: {
    width: MEDIDAS.areaTactilMinima,
    height: MEDIDAS.areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -ESPACIO.md,
  },
  lista: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.base,
    paddingBottom: ESPACIO.base,
    flexGrow: 1,
  },
  filaCargando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.xs,
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingBottom: ESPACIO.sm,
  },
  textoCargando: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12 },
  bannerError: {
    marginHorizontal: MEDIDAS.margenLateral,
    marginBottom: ESPACIO.sm,
    padding: ESPACIO.sm,
    borderRadius: RADIO.talla,
  },
  textoError: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12 },
  filaEntrada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: ESPACIO.sm,
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.sm,
    borderTopWidth: 1,
  },
  entrada: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: RADIO.resumen,
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.sm,
    fontFamily: TIPOGRAFIA.cuerpo,
    fontSize: 14,
  },
  botonEnviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEnviarInactivo: { opacity: 0.4 },
});
