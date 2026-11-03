import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { FilaOpcionPerfil } from '@/components/profile/FilaOpcionPerfil';
import { useAuth } from '@/context/AuthContext';
import { usePerfil } from '@/hooks/usePerfil';
import { useTema } from '@/hooks/useTema';

export default function PantallaPerfil() {
  const {
    irAEditarPerfil,
    irAMisPedidos,
    irAFavoritos,
    irADirecciones,
    irAMetodosPago,
    irAConfiguracion,
    irACentroAyuda,
    cerrarSesion,
    eliminarCuenta,
  } = usePerfil();
  const { usuario } = useAuth();
  const { colores } = useTema();

  const confirmarEliminacionCuenta = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es permanente. Se eliminarán tus datos de cuenta y tus pedidos se conservarán sin vincularlos a tu usuario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            void eliminarCuenta().catch((error: unknown) => {
              console.error('perfil: no se pudo completar la eliminación de la cuenta.', error);
              Alert.alert(
                'No se pudo completar',
                error instanceof Error && error.message.startsWith('La cuenta se eliminó')
                  ? error.message
                  : 'No se pudo eliminar tu cuenta. Inténtalo de nuevo más tarde.',
              );
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.contenedor, { backgroundColor: colores.papel }]} edges={['top']}>
      <ScrollView>
        <EncabezadoPantalla titulo="Perfil" />

        <View style={styles.tarjetaUsuario}>
          <Text style={styles.nombre}>{usuario?.nombre ?? 'Usuario'}</Text>
          <Text style={styles.dato}>{usuario?.email ?? ''}</Text>
          <Text style={styles.dato}>{usuario?.celular ?? ''}</Text>
          <Text style={styles.dato}>{usuario?.rol === 'administrador' ? 'ADMINISTRADOR' : 'CLIENTE'}</Text>
        </View>

        <View style={styles.seccion}>
          <FilaOpcionPerfil icono="person-outline" texto="Editar perfil" onPress={irAEditarPerfil} />
          <FilaOpcionPerfil icono="receipt-outline" texto="Mis pedidos" onPress={irAMisPedidos} />
          <FilaOpcionPerfil icono="heart-outline" texto="Favoritos" onPress={irAFavoritos} />
          <FilaOpcionPerfil icono="location-outline" texto="Direcciones" onPress={irADirecciones} />
          <FilaOpcionPerfil icono="card-outline" texto="Métodos de pago" onPress={irAMetodosPago} />
          <FilaOpcionPerfil icono="settings-outline" texto="Configuración" onPress={irAConfiguracion} />
          <FilaOpcionPerfil icono="help-circle-outline" texto="Centro de ayuda" onPress={irACentroAyuda} />
        </View>

        <View style={styles.seccion}>
          <FilaOpcionPerfil
            icono="log-out-outline"
            texto="Cerrar sesión"
            onPress={cerrarSesion}
            destructivo
          />
          {usuario && (
            <FilaOpcionPerfil
              icono="trash-outline"
              texto="Eliminar cuenta"
              onPress={confirmarEliminacionCuenta}
              destructivo
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  tarjetaUsuario: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingBottom: ESPACIO.lg,
    gap: 2,
  },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18 },
  dato: { fontFamily: TIPOGRAFIA.mono, fontSize: 12 },
  seccion: { marginTop: ESPACIO.lg },
});
