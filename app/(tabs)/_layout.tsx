import { Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import { BarraPestanas } from '@/components/navigation/BarraPestanas';
import { BotonAsistenteIA } from '@/components/ai/BotonAsistenteIA';
import type { OrigenAsistente } from '@/types';

// El botón flotante del asistente se monta una única vez aquí (no se
// duplica en index.tsx ni catalogo.tsx): qué pantalla lo muestra se decide
// solo con la ruta activa, así que agregar/quitar pantallas donde aparece
// es cambiar este mapa, no tocar cada pantalla.
const ORIGEN_POR_RUTA: Record<string, OrigenAsistente> = {
  '/': 'inicio',
  '/catalogo': 'catalogo',
};

export default function LayoutPestanas() {
  const pathname = usePathname();
  const origenAsistente = ORIGEN_POR_RUTA[pathname];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BarraPestanas {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="catalogo" options={{ title: 'Catálogo' }} />
        <Tabs.Screen name="favoritos" options={{ title: 'Favoritos' }} />
        <Tabs.Screen name="carrito" options={{ title: 'Carrito' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Tabs>
      {origenAsistente ? <BotonAsistenteIA origen={origenAsistente} /> : null}
    </View>
  );
}
