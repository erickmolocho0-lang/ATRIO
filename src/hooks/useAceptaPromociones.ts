import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { servicioPerfil } from '@/services/servicioPerfil';

// La preferencia de correos promocionales vive en perfiles.acepta_promociones,
// no en el teléfono: así la tienda sabe de verdad a quién puede escribirle.
export function useAceptaPromociones() {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const [aceptaPromociones, setAceptaPromociones] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      setAceptaPromociones(false);
      return;
    }
    let cancelado = false;
    servicioPerfil
      .obtenerAceptaPromociones(usuarioId)
      .then((valor) => {
        if (!cancelado) setAceptaPromociones(valor);
      })
      .catch((error: unknown) => {
        console.error('configuración: no se pudo leer la preferencia de promociones.', error);
      });
    return () => {
      cancelado = true;
    };
  }, [usuarioId]);

  const cambiarAceptaPromociones = useCallback(
    async (activar: boolean) => {
      if (!usuarioId) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para gestionar correos promocionales.');
        return;
      }
      setAceptaPromociones(activar); // se refleja al instante y se revierte si falla
      try {
        await servicioPerfil.actualizarAceptaPromociones(usuarioId, activar);
      } catch (error) {
        console.error('configuración: no se pudo guardar la preferencia de promociones.', error);
        setAceptaPromociones(!activar);
        Alert.alert('No se pudo guardar', 'No pudimos guardar tu preferencia. Inténtalo de nuevo.');
      }
    },
    [usuarioId],
  );

  return { aceptaPromociones, cambiarAceptaPromociones };
}
