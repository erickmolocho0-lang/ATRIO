import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { servicioBiometria } from './servicioBiometria';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from './storageService';
import type { RolUsuario, Usuario } from '@/types/Usuario';

export class ErrorCredencialesInvalidas extends Error {}
export class ErrorCorreoRegistrado extends Error {}
export class ErrorBiometriaNoConfigurada extends Error {}
// El proyecto tiene "Confirm email" activado (mailer_autoconfirm: false,
// verificado en vivo contra /auth/v1/settings): signUp() crea la cuenta pero
// no entrega sesión hasta que el usuario confirma el correo.
export class ErrorConfirmacionPendiente extends Error {}

function requerirSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado en este entorno (faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).',
    );
  }
  return supabase;
}

interface FilaPerfil {
  nombre: string | null;
  telefono: string | null;
  rol: RolUsuario | null;
}

async function obtenerPerfil(cliente: SupabaseClient, id: string): Promise<FilaPerfil | null> {
  const { data, error } = await cliente
    .from('perfiles')
    .select('nombre, telefono, rol')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    // No se rompe el login por esto (la cuenta de Auth sí es válida): se
    // avisa y se sigue con datos por defecto. Se ve en consola, no se esconde.
    console.error('servicioAutenticacion: no se pudo leer perfiles.', error);
    return null;
  }
  return data as FilaPerfil | null;
}

function construirUsuario(id: string, email: string, perfil: FilaPerfil | null): Usuario {
  return {
    id,
    nombre: perfil?.nombre ?? email,
    email,
    celular: perfil?.telefono ?? '',
    rol: perfil?.rol ?? 'cliente',
  };
}

export const servicioAutenticacion = {
  async iniciarSesion(correo: string, contrasena: string): Promise<Usuario> {
    const cliente = requerirSupabase();
    const { data, error } = await cliente.auth.signInWithPassword({
      email: correo.trim(),
      password: contrasena,
    });
    if (error?.code === 'invalid_credentials' || error?.code === 'user_not_found') {
      throw new ErrorCredencialesInvalidas();
    }
    if (error?.code === 'email_not_confirmed') throw new ErrorConfirmacionPendiente();
    if (error) throw error;
    if (!data.user) throw new Error('Supabase no devolvió un usuario tras iniciar sesión.');

    // Un login manual con correo/contraseña siempre es una sesión nueva de
    // verdad: si había un bloqueo local de una cuenta anterior, ya no aplica.
    await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.sesionBloqueada);

    const perfil = await obtenerPerfil(cliente, data.user.id);
    return construirUsuario(data.user.id, data.user.email ?? correo, perfil);
  },

  async iniciarSesionBiometrica(): Promise<Usuario> {
    const preferencias = await servicioAlmacenamiento.obtenerDato<{ biometria?: boolean }>(
      CLAVES_ALMACENAMIENTO.preferenciasConfiguracion,
    );
    const usuarioIdEsperado = await servicioAlmacenamiento.obtenerDato<string>(
      CLAVES_ALMACENAMIENTO.usuarioBiometria,
    );
    if (!preferencias?.biometria || !usuarioIdEsperado) throw new ErrorBiometriaNoConfigurada();

    const verificada = await servicioBiometria.autenticar('Inicia sesión con huella o rostro');
    if (!verificada) throw new ErrorBiometriaNoConfigurada();

    // La biometría NO crea una sesión nueva de Supabase: solo desbloquea la
    // que ya estaba persistida (el JWT vive en SecureStore vía el adaptador
    // de src/lib/supabase.ts). Si no hay sesión viva, no hay nada que
    // desbloquear y hay que volver a pedir correo/contraseña.
    const cliente = requerirSupabase();
    const { data, error } = await cliente.auth.getSession();
    if (error || !data.session || data.session.user.id !== usuarioIdEsperado) {
      throw new ErrorBiometriaNoConfigurada();
    }

    // Huella confirmada y sesión válida encontrada: ya se desbloqueó.
    await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.sesionBloqueada);

    const perfil = await obtenerPerfil(cliente, data.session.user.id);
    return construirUsuario(data.session.user.id, data.session.user.email ?? '', perfil);
  },

  async registrar(datos: {
    nombre: string;
    email: string;
    celular: string;
    contrasena: string;
  }): Promise<Usuario> {
    const cliente = requerirSupabase();
    const correo = datos.email.trim().toLowerCase();
    const { data, error } = await cliente.auth.signUp({
      email: correo,
      password: datos.contrasena,
      options: { data: { nombre: datos.nombre, celular: datos.celular } },
    });
    if (error) throw error;
    if (!data.user) throw new Error('No se pudo crear la cuenta.');

    // Con "Confirm email" activado, volver a registrar un correo YA
    // confirmado devuelve un usuario "ofuscado" con identities: [] en vez de
    // un error (así lo documenta Supabase: evita que alguien adivine qué
    // correos ya están registrados).
    if (data.user.identities && data.user.identities.length === 0) {
      throw new ErrorCorreoRegistrado();
    }

    // No se inserta/actualiza `perfiles` desde aquí: el trigger
    // `trg_crear_perfil_al_registrarse` (AFTER INSERT ON auth.users) ya crea
    // la fila (id, nombre desde la metadata o "Cliente ATRIO", rol
    // 'cliente') apenas se crea el usuario en auth.users — con o sin
    // confirmación de correo. El frontend solo LEE `perfiles`, nunca escribe.
    if (!data.session) {
      throw new ErrorConfirmacionPendiente();
    }

    const perfil = await obtenerPerfil(cliente, data.user.id);
    return construirUsuario(data.user.id, data.user.email ?? correo, perfil);
  },

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    // Con la sesión "bloqueada" (cerraste sesión pero la biometría sigue
    // activa), el token de Supabase se deja vivo a propósito — pero esta
    // función debe seguir devolviendo null, para que se muestre el login
    // (con la huella lista para desbloquear) en vez de entrar directo sin
    // pedir nada.
    const bloqueada = await servicioAlmacenamiento.obtenerDato<boolean>(
      CLAVES_ALMACENAMIENTO.sesionBloqueada,
    );
    if (bloqueada) return null;

    const cliente = requerirSupabase();
    const { data, error } = await cliente.auth.getSession();
    if (error) {
      console.error('servicioAutenticacion: no se pudo restaurar la sesión.', error);
      return null;
    }
    if (!data.session) return null;

    const perfil = await obtenerPerfil(cliente, data.session.user.id);
    return construirUsuario(data.session.user.id, data.session.user.email ?? '', perfil);
  },

  // Con biometría activa, "cerrar sesión" es un bloqueo local (como en una
  // app bancaria): vuelve a pedir acceso, pero no destruye el token de
  // Supabase — así la huella puede volver a entrar sin pedir correo y
  // contraseña de nuevo. Sin biometría activa, es un cierre de sesión real.
  async cerrarSesion(): Promise<void> {
    const usuarioIdBiometria = await servicioAlmacenamiento.obtenerDato<string>(
      CLAVES_ALMACENAMIENTO.usuarioBiometria,
    );
    if (usuarioIdBiometria) {
      await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.sesionBloqueada, true);
      return;
    }
    const cliente = requerirSupabase();
    await cliente.auth.signOut();
  },

  async solicitarRecuperacion(email: string): Promise<void> {
    const cliente = requerirSupabase();
    const { error } = await cliente.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'atrio://recuperar-contrasena',
    });
    if (error) throw error;
  },

  // Establece la sesión temporal de recuperación a partir de lo que venga en
  // el link del correo (query ?code=... con PKCE, o fragmento
  // #access_token=...&refresh_token=... con el flujo implícito) — Supabase
  // puede mandar cualquiera de los dos según la configuración del proyecto.
  async iniciarSesionDeRecuperacion(parametros: {
    code?: string;
    accessToken?: string;
    refreshToken?: string;
  }): Promise<void> {
    const cliente = requerirSupabase();
    if (parametros.code) {
      const { error } = await cliente.auth.exchangeCodeForSession(parametros.code);
      if (error) throw error;
      return;
    }
    if (parametros.accessToken && parametros.refreshToken) {
      const { error } = await cliente.auth.setSession({
        access_token: parametros.accessToken,
        refresh_token: parametros.refreshToken,
      });
      if (error) throw error;
      return;
    }
    throw new Error('El enlace de recuperación no es válido o ya expiró.');
  },

  async establecerNuevaContrasena(contrasena: string): Promise<void> {
    const cliente = requerirSupabase();
    const { error } = await cliente.auth.updateUser({ password: contrasena });
    if (error) throw error;
  },
};
