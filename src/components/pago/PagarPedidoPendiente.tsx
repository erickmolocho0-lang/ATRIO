import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import type { NombreColor } from '@/constants/colors';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioMercadoPago } from '@/services/servicioMercadoPago';
import type { MetodoPago } from '@/types';

interface PropiedadesPagarPedidoPendiente {
  numero: string;
  metodoPago: MetodoPago;
  alTerminar: () => void;
}

// Reintenta el pago de un pedido que sigue "pendiente de pago" (por ejemplo,
// si Yape lo rechazó). Usa el mismo método con el que se hizo el pedido.
export function PagarPedidoPendiente({ numero, metodoPago, alTerminar }: PropiedadesPagarPedidoPendiente) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const [celular, setCelular] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pagando, setPagando] = useState(false);

  const esYape = metodoPago === 'yape';
  const celularValido = /^\d{9}$/.test(celular);
  const codigoValido = /^\d{6}$/.test(codigo);
  const puedePagar = !esYape || (celularValido && codigoValido);

  async function pagar() {
    setPagando(true);
    try {
      if (esYape) {
        await servicioMercadoPago.pagarConYape(numero, celular, codigo);
      } else {
        await servicioMercadoPago.pagarConTarjeta(numero);
      }
      alTerminar();
    } catch (error) {
      Alert.alert('No se pudo pagar', (error as Error).message);
    } finally {
      setPagando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={styles.aviso}>Este pedido todavía no está pagado. Si no se paga en 30 minutos, se cancela.</Text>
      {esYape ? (
        <>
          <CampoTexto
            etiqueta="CELULAR"
            valor={celular}
            alCambiar={setCelular}
            placeholder="987654321"
            maxLength={9}
            keyboardType="number-pad"
            error={celular && !celularValido ? 'El celular tiene 9 dígitos.' : undefined}
          />
          <CampoTexto
            etiqueta="CÓDIGO DE APROBACIÓN"
            valor={codigo}
            alCambiar={setCodigo}
            placeholder="123456"
            maxLength={6}
            keyboardType="number-pad"
            error={codigo && !codigoValido ? 'El código tiene 6 dígitos.' : undefined}
          />
        </>
      ) : null}
      <BotonPrimario texto="PAGAR AHORA" onPress={pagar} deshabilitado={!puedePagar} cargando={pagando} />
    </View>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) =>
  StyleSheet.create({
    contenedor: { gap: ESPACIO.md },
    aviso: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.textoSecundario },
  });
