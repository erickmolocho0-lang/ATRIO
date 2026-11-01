import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { FilaInterruptor } from '@/components/profile/FilaInterruptor';
import { useAceptaPromociones } from '@/hooks/useAceptaPromociones';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { useTema } from '@/hooks/useTema';
import { useAuth } from '@/context/AuthContext';
import { servicioNotificaciones } from '@/services/servicioNotificaciones';
import { servicioBiometria } from '@/services/servicioBiometria';
import { CLAVES_ALMACENAMIENTO, servicioAlmacenamiento } from '@/services/storageService';

export default function PantallaConfiguracion() {
  const { preferencias, alternarPreferencia } = useConfiguracion();
  const { colores } = useTema();
  const { usuario } = useAuth();
  const { aceptaPromociones, cambiarAceptaPromociones } = useAceptaPromociones();

  const manejarNotificaciones = async (activar: boolean) => {
    if (activar) {
      if (isRunningInExpoGo() && Platform.OS === 'android') {
        Alert.alert(
          'No disponible en Expo Go',
          'Las notificaciones en Android requieren un development build; en Expo Go dejaron de funcionar desde el SDK 53.',
        );
        return;
      }
      const concedido = await servicioNotificaciones.solicitarPermiso();
      if (!concedido) {
        Alert.alert(
          'Permiso denegado',
          'Activa las notificaciones desde los ajustes del sistema para recibir alertas de ATRIO.',
        );
        return;
      }
      await servicioNotificaciones.programarNotificacionPrueba();
    } else {
      await servicioNotificaciones.cancelarTodas();
    }
    alternarPreferencia('notificaciones');
  };

  const manejarBiometria = async (activar: boolean) => {
    if (activar) {
      if (!usuario) {
        Alert.alert('Inicia sesión', 'Debes iniciar sesión para activar el acceso biométrico.');
        return;
      }
      const disponible = await servicioBiometria.estaDisponible();
      if (!disponible) {
        Alert.alert(
          'No disponible',
          'Este dispositivo no tiene sensor biométrico, o no tienes ninguna huella/rostro registrado en los ajustes del sistema.',
        );
        return;
      }

      const confirmado = await servicioBiometria.autenticar(
        'Confirma tu identidad para activar el desbloqueo biométrico',
      );
      if (!confirmado) {
        Alert.alert('No se pudo verificar', 'No se completó la verificación biométrica.');
        return;
      }
      await servicioAlmacenamiento.guardarDato(
        CLAVES_ALMACENAMIENTO.usuarioBiometria,
        usuario.id,
      );
      alternarPreferencia('biometria');
      // Ya quedó activada: no hace falta seguir mirando esta pantalla — la
      // próxima vez que haga falta iniciar sesión, se llama sola (ver
      // useInicioSesion.ts).
      router.back();
      return;
    }
    await servicioAlmacenamiento.eliminarDato(CLAVES_ALMACENAMIENTO.usuarioBiometria);
    alternarPreferencia('biometria');
  };

  return (
    <SafeAreaView style={[styles.contenedor, { backgroundColor: colores.papel }]} edges={['top']}>
      <ScrollView>
        <EncabezadoPantalla titulo="Configuración" conBotonVolver />

        <FilaInterruptor
          titulo="Notificaciones"
          descripcion="Alertas de pedidos y novedades"
          valor={preferencias.notificaciones}
          onCambiar={manejarNotificaciones}
        />
        <FilaInterruptor
          titulo="Modo oscuro"
          valor={preferencias.modoOscuro}
          onCambiar={() => alternarPreferencia('modoOscuro')}
        />
        <FilaInterruptor
          titulo="Correos promocionales"
          descripcion="Ofertas y descuentos por correo"
          valor={aceptaPromociones}
          onCambiar={cambiarAceptaPromociones}
        />
        <FilaInterruptor
          titulo="Biometría"
          descripcion="Desbloquear con huella o rostro"
          valor={preferencias.biometria}
          onCambiar={manejarBiometria}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
});