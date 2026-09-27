import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { servicioAutenticacion } from '@/services/servicioAutenticacion';
import type { Usuario } from '@/types/Usuario';

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
}

const ContextoAuth = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    servicioAutenticacion.obtenerUsuarioActual().then((usuarioActual) => {
      setUsuario(usuarioActual);
      setListo(true);
    });
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

  return (
    <ContextoAuth.Provider value={{ usuario, listo, iniciarSesion, iniciarSesionBiometrica, registrar, cerrarSesion }}>
      {children}
    </ContextoAuth.Provider>
  );
}

export function useAuth(): AuthContexto {
  const contexto = useContext(ContextoAuth);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return contexto;
}