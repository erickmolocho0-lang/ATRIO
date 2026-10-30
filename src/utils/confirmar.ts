import { Alert, Platform } from 'react-native';

// Alert.alert con botones no muestra nada en web: ahí se usa window.confirm.
export function confirmarAccion(titulo: string, mensaje: string, textoConfirmar = 'Eliminar'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((resolver) => {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: textoConfirmar, style: 'destructive', onPress: () => resolver(true) },
    ]);
  });
}
