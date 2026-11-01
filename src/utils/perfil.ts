export interface DatosPerfil {
  nombre: string;
  celular: string;
}

export interface ErroresPerfil {
  nombre?: string;
  celular?: string;
}

// Mismas reglas que el registro (app/(auth)/registro.tsx): nombre de al menos
// 2 caracteres y celular de 7 a 15 dígitos. El celular se guarda solo con dígitos.
export function validarDatosPerfil(
  entrada: DatosPerfil,
): { datos: DatosPerfil } | { errores: ErroresPerfil } {
  const nombre = entrada.nombre.trim().replace(/\s+/g, ' ');
  const celular = entrada.celular.replace(/\D/g, '');
  const errores: ErroresPerfil = {};

  if (nombre.length < 2) errores.nombre = 'Escribe tu nombre completo.';
  else if (nombre.length > 80) errores.nombre = 'El nombre es demasiado largo (máximo 80 caracteres).';

  if (celular.length < 7 || celular.length > 15) errores.celular = 'Ingresa un número de celular válido.';

  if (errores.nombre || errores.celular) return { errores };
  return { datos: { nombre, celular } };
}
