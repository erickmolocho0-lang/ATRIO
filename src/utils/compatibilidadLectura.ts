interface ErrorConsulta {
  code?: string;
  message: string;
}

// Solo para lecturas durante el despliegue: un permiso o fallo de red nunca
// debe confundirse con una columna que todavia no existe.
export async function consultarLecturaCompatible<T extends { error: ErrorConsulta | null }>(
  consultar: (anterior: boolean) => PromiseLike<T>,
  columnasNuevas: readonly string[],
): Promise<T> {
  const resultado = await consultar(false);
  const error = resultado.error;
  if (error && (error.code === '42703' || error.code === 'PGRST204') && columnasNuevas.some(
    (columna) => new RegExp(`(^|[^a-z0-9_])${columna}($|[^a-z0-9_])`, 'i').test(error.message),
  )) {
    return await consultar(true);
  }
  return resultado;
}
