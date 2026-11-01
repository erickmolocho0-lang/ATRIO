import { StyleSheet, Text, View } from 'react-native';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { nombreEstadoPedido } from '@/data/estadosPedido';
import type { PedidoReciente } from '@/types';
import { formatearSoles } from '@/utils/moneda';

function formatearFecha(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return fechaIso;
  return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FilaPedidoReciente({ pedido }: { pedido: PedidoReciente }) {
  const { colores } = useTema();

  return (
    <View style={[styles.fila, { borderBottomColor: colores.borde }]}>
      <View style={styles.info}>
        <Text style={[styles.numero, { color: colores.tinta }]}>{pedido.numero}</Text>
        <Text style={[styles.cliente, { color: colores.textoSecundario }]} numberOfLines={1}>
          {pedido.cliente} · {formatearFecha(pedido.fecha)}
        </Text>
      </View>
      <View style={styles.derecha}>
        <Text style={[styles.total, { color: colores.tinta }]}>{formatearSoles(pedido.total)}</Text>
        <View style={[styles.chip, { backgroundColor: colores.arcilla10 }]}>
          <Text style={[styles.chipTexto, { color: colores.arcilla }]}>
            {nombreEstadoPedido[pedido.estado]}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.md,
    paddingVertical: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    borderBottomWidth: 1,
  },
  info: { flex: 1, gap: 2 },
  numero: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 12.5 },
  cliente: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 12 },
  derecha: { alignItems: 'flex-end', gap: 4 },
  total: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 13 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIO.chip,
  },
  chipTexto: {
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
});
