import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTema } from '@/hooks/useTema';

const ITEMS = [
  { ruta: '/admin', etiqueta: 'Dashboard', icono: 'grid-outline' },
  { ruta: '/admin/productos', etiqueta: 'Productos', icono: 'shirt-outline' },
  { ruta: '/admin/categorias', etiqueta: 'Categorías', icono: 'pricetags-outline' },
  { ruta: '/admin/colores', etiqueta: 'Colores', icono: 'color-palette-outline' },
  { ruta: '/admin/campanas', etiqueta: 'Campañas', icono: 'megaphone-outline' },
  { ruta: '/admin/pedidos', etiqueta: 'Pedidos', icono: 'receipt-outline' },
  { ruta: '/admin/reportes', etiqueta: 'Reportes', icono: 'bar-chart-outline' },
  { ruta: '/admin/cupones', etiqueta: 'Cupones', icono: 'pricetag-outline' },
  { ruta: '/admin/entregas', etiqueta: 'Delivery', icono: 'bicycle-outline' },
] as const;

// Navegación principal del panel admin. Se monta en cada pantalla de
// app/admin/ (en vez de vivir en el _layout, para no forzar un Stack propio
// sobre las pantallas de Yeiner/Erick).
export function NavegacionAdmin() {
  const { colores } = useTema();
  const rutaActual = usePathname();

  return (
    <View style={[styles.contenedor, { borderBottomColor: colores.borde, backgroundColor: colores.papel }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.items}
      >
        {ITEMS.map((item) => {
          const activo = item.ruta === '/admin' ? rutaActual === item.ruta : rutaActual.startsWith(item.ruta);
          return (
            <Pressable
              key={item.ruta}
              onPress={() => router.push(item.ruta)}
              style={[styles.item, { borderColor: colores.borde }, activo && { backgroundColor: colores.tinta, borderColor: colores.tinta }]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
            >
              <Ionicons name={item.icono} size={13} color={activo ? colores.papel : colores.tinta60} />
              <Text style={[styles.itemTexto, { color: activo ? colores.papel : colores.tinta60 }]}>
                {item.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Botón de logout, pensado para ir en `derecha` de EncabezadoPantalla: así
// queda siempre visible (no depende de hacer scroll en la barra de arriba).
// Pasa por useAuth (AuthContext de Alexander) para que `usuario` quede en
// null de inmediato, en vez de llamar al servicio directo.
export function BotonCerrarSesionAdmin() {
  const { colores } = useTema();
  const { cerrarSesion: cerrarSesionAuth } = useAuth();

  const cerrarSesion = async () => {
    await cerrarSesionAuth();
    router.replace('/(auth)/login');
  };

  return (
    <Pressable
      onPress={cerrarSesion}
      style={styles.logout}
      accessibilityRole="button"
      accessibilityLabel="Cerrar sesión"
      hitSlop={8}
    >
      <Ionicons name="log-out-outline" size={16} color={colores.arcilla} />
      <Text style={[styles.itemTexto, { color: colores.arcilla }]}>Cerrar sesión</Text>
    </Pressable>
  );
}

// Acceso a Ajustes (incluye el interruptor de modo oscuro) desde el panel
// admin — reusa la MISMA pantalla /configuracion del lado público, sin
// duplicar el interruptor ni su lógica.
function BotonAjustesAdmin() {
  const { colores } = useTema();

  return (
    <Pressable
      onPress={() => router.push('/configuracion')}
      style={styles.ajustes}
      accessibilityRole="button"
      accessibilityLabel="Ajustes"
      hitSlop={8}
    >
      <Ionicons name="settings-outline" size={16} color={colores.tinta60} />
    </Pressable>
  );
}

// Combina Ajustes + Cerrar sesión — reemplaza a <BotonCerrarSesionAdmin />
// en las pantallas del panel admin para que todas tengan acceso a Ajustes.
export function AccionesAdmin() {
  return (
    <View style={styles.acciones}>
      <BotonAjustesAdmin />
      <BotonCerrarSesionAdmin />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { borderBottomWidth: 1 },
  items: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingVertical: ESPACIO.sm,
    gap: ESPACIO.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: ESPACIO.md,
    borderRadius: RADIO.chip,
    borderWidth: 1,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.xs,
  },
  ajustes: {
    minWidth: MEDIDAS.areaTactilMinima,
    minHeight: MEDIDAS.areaTactilMinima,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acciones: { flexDirection: 'row', alignItems: 'center' },
  itemTexto: {
    fontFamily: TIPOGRAFIA.etiqueta,
    fontSize: 11.5,
  },
});
