import { Ionicons } from '@expo/vector-icons';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { useCarrito } from '@/hooks/useCarrito';
import { useTema } from '@/hooks/useTema';

const ICONOS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  catalogo: 'grid-outline',
  favoritos: 'heart-outline',
  carrito: 'bag-outline',
  perfil: 'person-outline',
};

const ETIQUETAS: Record<string, string> = {
  index: 'Inicio',
  catalogo: 'Catálogo',
  favoritos: 'Favoritos',
  carrito: 'Carrito',
  perfil: 'Perfil',
};

// Props que expo-router (SDK 58) le pasa a `tabBar`: ya no incluyen
// `navigation`, sino `emitter` y `navigateToTab`.
export type PropiedadesBarraPestanas = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export function BarraPestanas({ state, emitter, navigateToTab }: PropiedadesBarraPestanas) {
  const insets = useSafeAreaInsets();
  const { contador } = useCarrito();
  const { colores } = useTema();

  return (
    <View
      style={[
        styles.contenedor,
        {
          backgroundColor: colores.papel,
          borderTopColor: colores.borde,
          paddingBottom: insets.bottom,
          height: MEDIDAS.alturaBarraPestanas + insets.bottom,
        },
      ]}
    >
      {state.routes.map((ruta, indice) => {
        const activo = state.index === indice;
        const nombreIcono = ICONOS[ruta.name] ?? 'ellipse-outline';
        const color = activo ? colores.tinta : colores.tinta42;

        const alPresionar = () => {
          const evento = emitter.emit({
            type: 'tabPress',
            target: ruta.key,
            canPreventDefault: true,
          });
          if (!activo && !evento.defaultPrevented) {
            navigateToTab(ruta.key);
          }
        };

        return (
          <Pressable
            key={ruta.key}
            style={styles.destino}
            onPress={alPresionar}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={ETIQUETAS[ruta.name]}
          >
            <View>
              <Ionicons name={nombreIcono} size={22} color={color} />
              {ruta.name === 'carrito' && contador > 0 ? (
                <View style={[styles.contador, { backgroundColor: colores.arcilla }]}>
                  <Text style={[styles.contadorTexto, { color: colores.papel }]}>{contador}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.etiqueta, { color }]}>{ETIQUETAS[ruta.name]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: ESPACIO.md,
  },
  destino: {
    flex: 1,
    alignItems: 'center',
    gap: ESPACIO.xs,
  },
  etiqueta: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 9.5,
  },
  contador: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 9,
  },
});