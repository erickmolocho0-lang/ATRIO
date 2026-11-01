import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { validarDatosPerfil, type ErroresPerfil } from '@/utils/perfil';

export function useEditarPerfil() {
  const { usuario, actualizarPerfil } = useAuth();
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [celular, setCelular] = useState(usuario?.celular ?? '');
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [guardando, setGuardando] = useState(false);

  const hayCambios =
    nombre.trim().replace(/\s+/g, ' ') !== (usuario?.nombre ?? '') ||
    celular.replace(/\D/g, '') !== (usuario?.celular ?? '');

  const cambiarNombre = (texto: string) => {
    setNombre(texto);
    if (errores.nombre) setErrores((previos) => ({ ...previos, nombre: undefined }));
  };

  const cambiarCelular = (texto: string) => {
    setCelular(texto);
    if (errores.celular) setErrores((previos) => ({ ...previos, celular: undefined }));
  };

  const guardar = async () => {
    if (guardando) return;
    const resultado = validarDatosPerfil({ nombre, celular });
    if ('errores' in resultado) {
      setErrores(resultado.errores);
      return;
    }

    setGuardando(true);
    try {
      await actualizarPerfil(resultado.datos);
      router.back();
    } catch (error) {
      console.error('editar perfil: no se pudo guardar.', error);
      Alert.alert('No se pudo guardar', 'No pudimos actualizar tu perfil. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  return {
    usuario,
    nombre,
    celular,
    errores,
    guardando,
    hayCambios,
    cambiarNombre,
    cambiarCelular,
    guardar,
  };
}
