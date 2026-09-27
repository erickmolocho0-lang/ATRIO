import { servicioAlmacenamiento } from './storageService';
import { CLAVES_ALMACENAMIENTO } from './storageService';
import { servicioBiometria } from './servicioBiometria';
import type { Usuario } from '@/types/Usuario';

const CORREO_DEMO = 'hola@atrio.pe';
const CONTRASENA_DEMO = 'atrio1234';

interface UsuarioLocal extends Usuario {
  contrasena: string;
}

const USUARIA_DEMO: UsuarioLocal = {
  id: 'demo-propietaria',
  nombre: 'Propietaria ATRIO',
  email: CORREO_DEMO,
  celular: '',
  rol: 'propietaria',
  contrasena: CONTRASENA_DEMO,
};

export class ErrorCredencialesInvalidas extends Error {}
export class ErrorCorreoRegistrado extends Error {}
export class ErrorBiometriaNoConfigurada extends Error {}

async function obtenerUsuarios(): Promise<UsuarioLocal[]> {
  const guardados = await servicioAlmacenamiento.obtenerDato<UsuarioLocal[]>(
    CLAVES_ALMACENAMIENTO.usuarios,
  );
  return guardados ?? [USUARIA_DEMO];
}

async function guardarSesion(usuario: UsuarioLocal): Promise<Usuario> {
  const { contrasena: _contrasena, ...usuarioPublico } = usuario;
  await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.usuarioSesion, usuarioPublico);
  await servicioAlmacenamiento.guardarTokenSesion('demo-access-token');
  return usuarioPublico;
}

export const servicioAutenticacion = {
  async iniciarSesion(correo: string, contrasena: string): Promise<Usuario> {
    await new Promise((resolver) => setTimeout(resolver, 650));
    const usuario = (await obtenerUsuarios()).find(
      (candidato) => candidato.email.toLowerCase() === correo.trim().toLowerCase()
        && candidato.contrasena === contrasena,
    );
    if (!usuario) throw new ErrorCredencialesInvalidas();
    return guardarSesion(usuario);
  },

  async iniciarSesionBiometrica(): Promise<Usuario> {
    const preferencias = await servicioAlmacenamiento.obtenerDato<{ biometria?: boolean }>(
      CLAVES_ALMACENAMIENTO.preferenciasConfiguracion,
    );
    const usuarioId = await servicioAlmacenamiento.obtenerDato<string>(
      CLAVES_ALMACENAMIENTO.usuarioBiometria,
    );
    if (!preferencias?.biometria || !usuarioId) throw new ErrorBiometriaNoConfigurada();

    const verificada = await servicioBiometria.autenticar('Inicia sesión con huella o rostro');
    if (!verificada) throw new ErrorBiometriaNoConfigurada();

    const usuario = (await obtenerUsuarios()).find((candidato) => candidato.id === usuarioId)
      ?? (usuarioId === USUARIA_DEMO.id ? USUARIA_DEMO : null);
    if (!usuario) throw new ErrorBiometriaNoConfigurada();
    return guardarSesion(usuario);
  },

  async registrar(datos: {
    nombre: string;
    email: string;
    celular: string;
    contrasena: string;
  }): Promise<Usuario> {
    await new Promise((resolver) => setTimeout(resolver, 350));
    const usuarios = await obtenerUsuarios();
    if (usuarios.some((usuario) => usuario.email.toLowerCase() === datos.email.trim().toLowerCase())) {
      throw new ErrorCorreoRegistrado();
    }

    const nuevo: UsuarioLocal = {
      ...datos,
      id: `usuario-${Date.now()}`,
      email: datos.email.trim().toLowerCase(),
      rol: 'cliente',
    };
    usuarios.push(nuevo);
    await servicioAlmacenamiento.guardarDato(CLAVES_ALMACENAMIENTO.usuarios, usuarios);
    return guardarSesion(nuevo);
  },

  async obtenerUsuarioActual(): Promise<Usuario | null> {
    const usuario = await servicioAlmacenamiento.obtenerDato<Usuario>(
      CLAVES_ALMACENAMIENTO.usuarioSesion,
    );
    if (usuario) return usuario;

    const token = await servicioAlmacenamiento.obtenerTokenSesion();
    return token === 'demo-access-token' ? USUARIA_DEMO : null;
  },

  async cerrarSesion(): Promise<void> {
    await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.usuarioSesion);
    await servicioAlmacenamiento.eliminarTokenSesion();
  },

  async solicitarRecuperacion(_email: string): Promise<void> {
    await new Promise((resolver) => setTimeout(resolver, 500));
  },
};
