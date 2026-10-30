import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const CLAVES_ALMACENAMIENTO = {
  carrito: 'atrio.carrito',
  favoritos: 'atrio.favoritos',
  usuarioBiometria: 'atrio.auth.biometricUser',
  sesionBloqueada: 'atrio.auth.sesionBloqueada',
  intentosInicioSesion: 'atrio.login.attempts',
  bloqueoInicioSesion: 'atrio.login.lockedUntil',
  preferenciasConfiguracion: 'atrio.configuracion.preferencias',
  direcciones: 'atrio.direcciones',
  pedidos: 'atrio.pedidos',
  tarjetas: 'atrio.tarjetas',
  // Prefijo: la clave real es `${chatLuna}.${usuarioId | 'invitado'}.${origen}`.
  chatLuna: 'atrio.chat.luna',
} as const;

// SecureStore limita cada valor a ~2 KB y la sesión de Supabase suele pesar más: se guarda en fragmentos.
const TAMANO_FRAGMENTO_SECRETO = 1800;

async function leerSecretoNativo(clave: string): Promise<string | null> {
  const cantidad = await SecureStore.getItemAsync(`${clave}.n`);
  if (cantidad === null) return null;
  const partes: string[] = [];
  for (let indice = 0; indice < Number(cantidad); indice += 1) {
    const parte = await SecureStore.getItemAsync(`${clave}.${indice}`);
    if (parte === null) return null;
    partes.push(parte);
  }
  return partes.join('');
}

async function eliminarSecretoNativo(clave: string): Promise<void> {
  const cantidad = Number((await SecureStore.getItemAsync(`${clave}.n`)) ?? 0);
  for (let indice = 0; indice < cantidad; indice += 1) {
    await SecureStore.deleteItemAsync(`${clave}.${indice}`);
  }
  await SecureStore.deleteItemAsync(`${clave}.n`);
}

export const servicioAlmacenamiento = {
  async obtenerSecreto(clave: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return await AsyncStorage.getItem(clave);
      return await leerSecretoNativo(clave);
    } catch {
      return null;
    }
  },

  async guardarSecreto(clave: string, valor: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(clave, valor);
        return;
      }
      await eliminarSecretoNativo(clave);
      const cantidad = Math.ceil(valor.length / TAMANO_FRAGMENTO_SECRETO);
      for (let indice = 0; indice < cantidad; indice += 1) {
        const fragmento = valor.slice(
          indice * TAMANO_FRAGMENTO_SECRETO,
          (indice + 1) * TAMANO_FRAGMENTO_SECRETO,
        );
        await SecureStore.setItemAsync(`${clave}.${indice}`, fragmento);
      }
      await SecureStore.setItemAsync(`${clave}.n`, String(cantidad));
    } catch {
    }
  },

  async eliminarSecreto(clave: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(clave);
        return;
      }
      await eliminarSecretoNativo(clave);
    } catch {
    }
  },

  async obtenerDato<T>(clave: string): Promise<T | null> {
    try {
      const bruto = await AsyncStorage.getItem(clave);
      return bruto ? (JSON.parse(bruto) as T) : null;
    } catch {
      return null;
    }
  },

  async guardarDato<T>(clave: string, valor: T): Promise<void> {
    try {
      await AsyncStorage.setItem(clave, JSON.stringify(valor));
    } catch {
    }
  },

  async eliminarDato(clave: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(clave);
    } catch {
    }
  },

  async eliminarDatosConPrefijo(prefijo: string): Promise<void> {
    try {
      const claves = await AsyncStorage.getAllKeys();
      const aBorrar = claves.filter((clave) => clave.startsWith(prefijo));
      if (aBorrar.length > 0) await AsyncStorage.multiRemove(aBorrar);
    } catch {
    }
  },
};
