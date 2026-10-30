import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { servicioAutenticacion } from '@/services/servicioAutenticacion';
import { supabase } from '@/lib/supabase';
import type { Usuario } from '@/types/Usuario';

const MS_LIMITE_RESTAURAR_SESION = 8000;

interface AuthContexto {
  usuario: Usuario | null;
  listo: boolean;
  iniciarSesion: (email: string, contrasena: string) => Promise<Usuario>;
  iniciarSesionBiometrica: () => Promise<Usuario>;
  registrar: (datos: {
    nombre: string;
    email: string;
    celular: string;
    contrasena: string;
  }) => Promise<Usuario>;
  cerrarSesion: () => Promise<void>;
  eliminarCuenta: () => Promise<void>;
}

const ContextoAuth = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!supabase) {
      const timerSinSupabase = setTimeout(() => setListo(true), 0);
      return () => clearTimeout(timerSinSupabase);
    }

    let cancelado = false;
    let revisionSesion = 0;
    const timerLimite = setTimeout(() => {
      if (!cancelado) setListo(true);
    }, MS_LIMITE_RESTAURAR_SESION);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sesion) => {
      const revisionActual = ++revisionSesion;
      if (!sesion) {
        setUsuario(null);
        setListo(true);
        return;
      }

      setTimeout(() => {
        void servicioAutenticacion.obtenerUsuarioDeSesion(sesion)
          .then((usuarioActual) => {
            if (!cancelado && revisionActual === revisionSesion) {
              setUsuario(usuarioActual);
              setListo(true);
              console.log('AUTH listo');
            }
          })
          .catch((err) => {
            console.error('AuthContext: no se pudo actualizar la sesión.', err);
            if (!cancelado && revisionActual === revisionSesion) {
              setUsuario(null);
              setListo(true);
            }
          });
      });
    });

    return () => {
      cancelado = true;
      clearTimeout(timerLimite);
      subscription.unsubscribe();
    };
  }, []);

  const iniciarSesion = useCallback(async (email: string, contrasena: string) => {
    const usuarioAutenticado = await servicioAutenticacion.iniciarSesion(email, contrasena);
    setUsuario(usuarioAutenticado);
    return usuarioAutenticado;
  }, []);

  const iniciarSesionBiometrica = useCallback(async () => {
    const usuarioAutenticado = await servicioAutenticacion.iniciarSesionBiometrica();
    setUsuario(usuarioAutenticado);
    return usuarioAutenticado;
  }, []);

  const registrar = useCallback(async (datos: {
    nombre: string;
    email: string;
    celular: string;
    contrasena: string;
  }) => {
    const usuarioRegistrado = await servicioAutenticacion.registrar(datos);
    setUsuario(usuarioRegistrado);
    return usuarioRegistrado;
  }, []);

  const cerrarSesion = useCallback(async () => {
    await servicioAutenticacion.cerrarSesion();
    setUsuario(null);
  }, []);

  const eliminarCuenta = useCallback(async () => {
    if (!usuario) throw new Error('Debes iniciar sesión para eliminar tu cuenta.');
    await servicioAutenticacion.eliminarCuenta(usuario.id);
    setUsuario(null);
  }, [usuario]);

  return (
    <ContextoAuth.Provider value={{ usuario, listo, iniciarSesion, iniciarSesionBiometrica, registrar, cerrarSesion, eliminarCuenta }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): AuthContexto {
  const contexto = useContext(ContextoAuth);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return contexto;
}