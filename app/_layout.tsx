import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { AuthProvider } from '@/context/AuthContext';
import { CarritoProvider } from '@/context/CarritoContext';
import { CheckoutProvider } from '@/context/CheckoutContext';
import { FavoritosProvider } from '@/context/FavoritosContext';
import { ConfiguracionProvider } from '@/context/ConfiguracionContext';
import { useFuentesApp } from '@/hooks/useFuentesApp';
import { useTema } from '@/hooks/useTema';

// Ruta inicial del Stack raíz (en SDK 58, Stack ya no acepta la prop
// initialRouteName; unstable_settings.initialRouteName quedó obsoleto en
// favor de anchor).
export const unstable_settings = {
  anchor: 'index',
};

function ContenidoApp() {
  const { colores, esOscuro } = useTema();

  return (
    <>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colores.papel },
        }}
      >
        <Stack.Screen name="asistente" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function LayoutRaiz() {
  const fuentesListas = useFuentesApp();

  if (!fuentesListas) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ConfiguracionProvider>
          <AuthProvider>
            <FavoritosProvider>
              <CarritoProvider>
                <CheckoutProvider>
                  <ContenidoApp />
                </CheckoutProvider>
              </CarritoProvider>
            </FavoritosProvider>
          </AuthProvider>
        </ConfiguracionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}