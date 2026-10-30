import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export function usePerfil() {
  const {
    usuario,
    cerrarSesion: cerrarSesionAuth,
    eliminarCuenta: eliminarCuentaAuth,
  } = useAuth();

  const irAMisPedidos = () => router.push('/pedidos');
  const irAFavoritos = () => router.push('/(tabs)/favoritos');
  const irADirecciones = () => router.push('/direcciones');
  const irAMetodosPago = () => router.push('/metodos-pago');
  const irAConfiguracion = () => router.push('/configuracion');
  const irACentroAyuda = () => router.push('/centro-ayuda');

  const cerrarSesion = async () => {
    await cerrarSesionAuth();
    router.replace('/(auth)/login');
  };

  const eliminarCuenta = async () => {
    if (!usuario) throw new Error('Debes iniciar sesión para eliminar tu cuenta.');
    try {
      await eliminarCuentaAuth();
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('La cuenta se eliminó')) {
        router.replace('/(auth)/login');
      }
      throw error;
    }
    router.replace('/(auth)/login');
  };

  return {
    usuario,
    irAMisPedidos,
    irAFavoritos,
    irADirecciones,
    irAMetodosPago,
    irAConfiguracion,
    irACentroAyuda,
    cerrarSesion,
    eliminarCuenta,
  };
}