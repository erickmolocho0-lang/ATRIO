import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CLAVE_TOKEN_SESION = 'atrio.auth.token';

export const CLAVES_ALMACENAMIENTO = {
  carrito: 'atrio.carrito',
  favoritos: 'atrio.favoritos',
  usuarios: 'atrio.auth.users',
  usuarioSesion: 'atrio.auth.user',
  intentosInicioSesion: 'atrio.login.attempts',
  bloqueoInicioSesion: 'atrio.login.lockedUntil',
  preferenciasConfiguracion: 'atrio.configuracion.preferencias',
  direcciones: 'atrio.direcciones',
  pedidos: 'atrio.pedidos',
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

  async obtenerTokenSesion(): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return await AsyncStorage.getItem(CLAVE_TOKEN_SESION);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(CLAVE_TOKEN_SESION);
    } catch {
      return null;
    }
  },

  async guardarTokenSesion(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(CLAVE_TOKEN_SESION, token);
      return;
    }
    try {
      await SecureStore.setItemAsync(CLAVE_TOKEN_SESION, token);
    } catch {
      await AsyncStorage.setItem(CLAVE_TOKEN_SESION, token);
    }
  },

  async eliminarTokenSesion(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(CLAVE_TOKEN_SESION);
      } else {
        await SecureStore.deleteItemAsync(CLAVE_TOKEN_SESION);
      }
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
};
