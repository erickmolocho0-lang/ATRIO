import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import type { MensajeChat } from '@/types';

interface BurbujaMensajeProps {
  mensaje: MensajeChat;
}

// El modelo a veces responde con markdown, que Text muestra tal cual. Se
// quitan las imágenes ![alt](url) (los productos ya salen como tarjetas),
// los enlaces [texto](url) quedan solo como texto y se borran los **.
export function limpiarTextoLuna(texto: string): string {
  return texto
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function BurbujaMensaje({ mensaje }: BurbujaMensajeProps) {
  const { colores } = useTema();
  const esUsuario = mensaje.rol === 'usuario';
  const texto = esUsuario ? mensaje.texto : limpiarTextoLuna(mensaje.texto);

  return (
    <View style={[styles.fila, esUsuario && styles.filaUsuario]}>
      <View
        style={[
          styles.burbuja,
          {
            backgroundColor: esUsuario ? colores.tinta : colores.lino,
            borderBottomRightRadius: esUsuario ? 4 : RADIO.resumen,
            borderBottomLeftRadius: esUsuario ? RADIO.resumen : 4,
          },
        ]}
      >
        <Text style={[styles.texto, { color: esUsuario ? colores.papel : colores.tinta }]}>
          {texto}
        </Text>
      </View>

      {mensaje.productos && mensaje.productos.length > 0 ? (
        <View style={styles.listaProductos}>
          {mensaje.productos.map((producto) => (
            <View key={producto.id} style={[styles.tarjetaProducto, { backgroundColor: colores.blanco, borderColor: colores.borde }]}>
              {producto.imagen ? (
                <Image source={{ uri: producto.imagen }} style={styles.imagenProducto} />
              ) : (
                <View style={[styles.imagenProducto, { backgroundColor: colores.lino }]} />
              )}
              <View style={styles.infoProducto}>
                <Text style={[styles.nombreProducto, { color: colores.tinta }]} numberOfLines={2}>
                  {producto.nombre}
                </Text>
                <Text style={[styles.precioProducto, { color: colores.textoSecundario }]}>
                  S/{producto.precio.toFixed(2)}
                </Text>
                {producto.tallasDisponibles.length > 0 ? (
                  <Text style={[styles.detalleProducto, { color: colores.textoSecundario }]} numberOfLines={1}>
                    Tallas: {producto.tallasDisponibles.join(', ')}
                  </Text>
                ) : null}
                <BotonPrimario
                  texto="VER PRODUCTO"
                  variante="contorno"
                  altura={34}
                  style={styles.botonVer}
                  onPress={() => router.push(`/producto/${producto.id}`)}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { marginBottom: ESPACIO.base, alignItems: 'flex-start' },
  filaUsuario: { alignItems: 'flex-end' },
  burbuja: {
    maxWidth: '85%',
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.sm,
    borderRadius: RADIO.resumen,
  },
  texto: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14, lineHeight: 20 },
  listaProductos: { marginTop: ESPACIO.sm, gap: ESPACIO.sm, width: '100%' },
  tarjetaProducto: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADIO.imagen,
    padding: ESPACIO.sm,
    gap: ESPACIO.sm,
  },
  imagenProducto: { width: 56, height: 72, borderRadius: RADIO.talla },
  infoProducto: { flex: 1, gap: 2 },
  nombreProducto: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 13 },
  precioProducto: { fontFamily: TIPOGRAFIA.mono, fontSize: 12 },
  detalleProducto: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 11 },
  botonVer: { marginTop: ESPACIO.xs, alignSelf: 'flex-start', paddingHorizontal: 12 },
});
