import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';
import { servicioBiometria } from '@/services/servicioBiometria';

const INTENTOS_MAXIMOS = 5;
const DURACION_BLOQUEO_MS = 15 * 60 * 1000;

interface EstadoInicioSesion {
  correo: string;
  contrasena: string;
  mensaje: string | null;
  cargando: boolean;
  bloqueado: boolean;
  biometriaActiva: boolean;
  actualizarCorreo: (valor: string) => void;
  actualizarContrasena: (valor: string) => void;
  enviar: () => Promise<void>;
  iniciarSesionBiometrica: () => Promise<void>;
}

export function useInicioSesion(): EstadoInicioSesion {
  const { iniciarSesion, iniciarSesionBiometrica } = useAuth();
  const { preferencias, hidratado } = useConfiguracion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [biometriaActiva, setBiometriaActiva] = useState(false);

  useEffect(() => {
    let vigente = true;

    async function revisarBiometria() {
      if (!hidratado || !preferencias.biometria) {
        setBiometriaActiva(false);
        return;
      }
      const usuarioGuardado = await servicioAlmacenamiento.obtenerDato<string>(
        CLAVES_ALMACENAMIENTO.usuarioBiometria,
      );
      const disponible = usuarioGuardado
        ? await servicioBiometria.estaDisponible().catch(() => false)
        : false;
      if (vigente) setBiometriaActiva(disponible);
    }

    void revisarBiometria();
    return () => {
      vigente = false;
    };
  }, [hidratado, preferencias.biometria]);

  useEffect(() => {
    (async () => {
      const intentosGuardados = await servicioAlmacenamiento.obtenerDato<number>(
        CLAVES_ALMACENAMIENTO.intentosInicioSesion,
      );
      if (typeof intentosGuardados === 'number') setIntentos(intentosGuardados);

      const bloqueoGuardado = await servicioAlmacenamiento.obtenerDato<number>(
        CLAVES_ALMACENAMIENTO.bloqueoInicioSesion,
      );
      if (typeof bloqueoGuardado === 'number' && bloqueoGuardado > Date.now()) {
        setBloqueadoHasta(bloqueoGuardado);
      } else {
        await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.bloqueoInicioSesion);
      }
    })();
  }, []);

  useEffect(() => {
    if (!bloqueadoHasta) return;
    const identificador = setInterval(() => {
      const instante = Date.now();
      setAhora(instante);
      if (instante >= bloqueadoHasta) {
        setBloqueadoHasta(null);
        void servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.bloqueoInicioSesion);
      }
    }, 1000);
    return () => clearInterval(identificador);
  }, [bloqueadoHasta]);

  const bloqueado = bloqueadoHasta != null && ahora < bloqueadoHasta;
  const minutosRestantes = bloqueado
    ? Math.max(1, Math.ceil((bloqueadoHasta! - ahora) / 60000))
    : 0;

  const mensaje = bloqueado
    ? `Demasiados intentos. Vuelve a intentarlo en ${minutosRestantes} min.`
    : mensajeError;

  const limpiarError = useCallback(() => {
    setMensajeError((actual) => (actual ? null : actual));
  }, []);

  const actualizarCorreo = useCallback(
    (valor: string) => {
      setCorreo(valor);
      limpiarError();
    },
    [limpiarError],
  );

  const actualizarContrasena = useCallback(
    (valor: string) => {
      setContrasena(valor);
      limpiarError();
    },
    [limpiarError],
  );

  const enviar = useCallback(async () => {
    if (cargando || bloqueado) return;

    const correoLimpio = correo.trim();
    if (!correoLimpio || !contrasena) {
      setMensajeError('Correo y contraseña son obligatorios.');
      return;
    }

    setCargando(true);
    try {
      const usuario = await iniciarSesion(correoLimpio, contrasena);
      await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.intentosInicioSesion);
      await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.bloqueoInicioSesion);
      setIntentos(0);
      router.replace(usuario.rol === 'propietaria' ? '/admin' : '/(tabs)');
    } catch {
      const siguiente = intentos + 1;
      if (siguiente >= INTENTOS_MAXIMOS) {
        const hasta = Date.now() + DURACION_BLOQUEO_MS;
        setIntentos(0);
        setBloqueadoHasta(hasta);
        setAhora(Date.now());
        await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.intentosInicioSesion, 0);
        await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.bloqueoInicioSesion, hasta);
      } else {
        setIntentos(siguiente);
        setMensajeError('Correo o contraseña incorrectos.');
        await servicioAlmacenamiento.guardarDato(
          CLAVES_ALMACENAMIENTO.intentosInicioSesion,
          siguiente,
        );
      }
    } finally {
      setCargando(false);
    }
  }, [cargando, bloqueado, correo, contrasena, intentos, iniciarSesion]);

  const iniciarSesionConBiometria = useCallback(async () => {
    if (cargando || bloqueado || !biometriaActiva) return;
    setCargando(true);
    limpiarError();
    try {
      const usuario = await iniciarSesionBiometrica();
      await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.intentosInicioSesion);
      await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.bloqueoInicioSesion);
      setIntentos(0);
      router.replace(usuario.rol === 'propietaria' ? '/admin' : '/(tabs)');
    } catch {
      setMensajeError('No se pudo verificar tu identidad. Inicia sesión con correo y contraseña.');
    } finally {
      setCargando(false);
    }
  }, [bloqueado, biometriaActiva, cargando, iniciarSesionBiometrica, limpiarError]);

  return {
    correo,
    contrasena,
    mensaje,
    cargando,
    bloqueado,
    biometriaActiva,
    actualizarCorreo,
    actualizarContrasena,
    enviar,
    iniciarSesionBiometrica: iniciarSesionConBiometria,
  };
}
