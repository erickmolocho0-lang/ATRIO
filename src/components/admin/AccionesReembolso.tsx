import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import type { NombreColor } from '@/constants/colors';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioMercadoPago } from '@/services/servicioMercadoPago';
import { servicioPedidos } from '@/services/servicioPedidos';
import type { MetodoPago } from '@/types';
import { formatearSoles } from '@/utils/moneda';

interface PropiedadesAccionesReembolso {
  numero: string;
  metodoPago: MetodoPago;
  total: number;
  alTerminar: () => void;
}

// Botones del admin para un pago "por reembolsar". Cada uno pide confirmación.
// · Tarjeta y Yape: "Reembolsar" devuelve el dinero por Mercado Pago.
// · Tarjeta: "Devuelto en Mercado Pago", porque en modo prueba la tarjeta
//   solo se puede devolver desde el panel de Mercado Pago.
// · Contra entrega: el efectivo se devuelve en persona y luego se marca aquí.
export function AccionesReembolso({ numero, metodoPago, total, alTerminar }: PropiedadesAccionesReembolso) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const [procesando, setProcesando] = useState(false);
  const monto = formatearSoles(total);

  async function ejecutar(accion: () => Promise<void>) {
    setProcesando(true);
    try {
      await accion();
      alTerminar();
    } catch (error) {
      Alert.alert('No se pudo completar', (error as Error).message);
    } finally {
      setProcesando(false);
    }
  }

  function confirmar(titulo: string, mensaje: string, accion: () => Promise<void>) {
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aceptar', style: 'destructive', onPress: () => ejecutar(accion) },
    ]);
  }

  const reembolsar = () =>
    confirmar(
      'Reembolsar',
      `¿Seguro? Se devolverán ${monto} al cliente por Mercado Pago. No se puede deshacer.`,
      () => servicioMercadoPago.reembolsar(numero),
    );

  const marcarDevueltoEnPanel = () =>
    confirmar(
      'Devuelto en Mercado Pago',
      'Acepta solo si ya devolviste el dinero desde el panel de Mercado Pago. ATRIO no lo comprobará.',
      () => servicioPedidos.marcarReembolsado(numero),
    );

  const marcarEfectivoDevuelto = () =>
    confirmar(
      'Marcar como reembolsado',
      `Acepta solo si ya devolviste ${monto} en efectivo al cliente.`,
      () => servicioPedidos.marcarReembolsado(numero),
    );

  return (
    <View style={styles.contenedor}>
      <Text style={styles.aviso}>Este pago está por reembolsar: el pedido se canceló o se devolvió después de pagarse.</Text>
      {metodoPago === 'contra_entrega' ? (
        <BotonPrimario texto="MARCAR COMO REEMBOLSADO" onPress={marcarEfectivoDevuelto} cargando={procesando} />
      ) : (
        <BotonPrimario texto="REEMBOLSAR" onPress={reembolsar} cargando={procesando} />
      )}
      {metodoPago === 'tarjeta' ? (
        <BotonPrimario
          texto="DEVUELTO EN MERCADO PAGO"
          variante="contorno"
          onPress={marcarDevueltoEnPanel}
          deshabilitado={procesando}
        />
      ) : null}
    </View>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) =>
  StyleSheet.create({
    contenedor: { gap: ESPACIO.md },
    aviso: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.textoSecundario },
  });
