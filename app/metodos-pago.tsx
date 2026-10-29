import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { EncabezadoPantalla } from '@/components/common/EncabezadoPantalla';
import { EstadoVacio } from '@/components/common/EstadoVacio';
import { FormularioTarjeta } from '@/components/pago/FormularioTarjeta';
import { useTema } from '@/hooks/useTema';
import type { Paleta } from '@/constants/coloresOscuro';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { servicioTarjetas } from '@/services/servicioTarjetas';
import type { DatosTarjeta, Tarjeta } from '@/types';

function FilaTarjeta({
  tarjeta,
  alElegir,
  alEliminar,
}: {
  tarjeta: Tarjeta;
  alElegir: () => void;
  alEliminar: () => void;
}) {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  return (
    <View style={[styles.fila, tarjeta.predeterminada && styles.filaPredeterminada]}>
      <Pressable
        style={styles.filaPrincipal}
        onPress={alElegir}
        accessibilityRole="radio"
        accessibilityState={{ selected: tarjeta.predeterminada }}
      >
        <Ionicons
          name={tarjeta.predeterminada ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={tarjeta.predeterminada ? COLORS.tinta : COLORS.tinta40}
        />
        <View style={styles.textos}>
          <Text style={styles.nombre}>
            {tarjeta.marca} •••• {tarjeta.ultimos4}
          </Text>
          <Text style={styles.detalle}>
            {tarjeta.titular} · {tarjeta.vencimiento}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={alEliminar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Eliminar tarjeta">
        <Ionicons name="trash-outline" size={20} color={COLORS.tinta40} />
      </Pressable>
    </View>
  );
}

export default function PantallaMetodosPago() {
  const { colores: COLORS } = useTema();
  const styles = useMemo(() => crearEstilos(COLORS), [COLORS]);
  const { desdePago } = useLocalSearchParams<{ desdePago?: string }>();
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [agregando, setAgregando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    setTarjetas(await servicioTarjetas.obtenerTarjetas());
    setCargando(false);
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function guardar(datos: DatosTarjeta) {
    setGuardando(true);
    await servicioTarjetas.agregarTarjeta(datos);
    setGuardando(false);
    setAgregando(false);
    // Igual que al elegir una tarjeta existente: si se llegó desde el pago,
    // agregar la primera tarjeta también debe volver a Pago solo.
    if (desdePago) {
      router.back();
      return;
    }
    await recargar();
  }

  async function elegir(id: string) {
    await servicioTarjetas.marcarPredeterminada(id);
    // Si se llegó desde el pago, elegir una tarjeta devuelve al pago.
    if (desdePago) {
      router.back();
      return;
    }
    await recargar();
  }

  function eliminar(tarjeta: Tarjeta) {
    Alert.alert('Eliminar tarjeta', `¿Eliminar ${tarjeta.marca} •••• ${tarjeta.ultimos4}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await servicioTarjetas.eliminarTarjeta(tarjeta.id);
          await recargar();
        },
      },
    ]);
  }

  if (agregando) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <EncabezadoPantalla titulo="Nueva tarjeta" conBotonVolver />
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <FormularioTarjeta guardando={guardando} alGuardar={guardar} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const sinTarjetas = !cargando && tarjetas.length === 0;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <EncabezadoPantalla titulo="Métodos de pago" conBotonVolver />

      {sinTarjetas ? (
        <EstadoVacio
          icono="card-outline"
          titulo="Aún no tienes tarjetas"
          descripcion="Guarda una tarjeta para pagar más rápido."
          textoBoton="AGREGAR TARJETA"
          alPresionarBoton={() => setAgregando(true)}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
            {tarjetas.map((tarjeta) => (
              <FilaTarjeta
                key={tarjeta.id}
                tarjeta={tarjeta}
                alElegir={() => elegir(tarjeta.id)}
                alEliminar={() => eliminar(tarjeta)}
              />
            ))}
          </ScrollView>
          <View style={styles.barraInferior}>
            <BotonPrimario texto="AGREGAR TARJETA" variante="contorno" onPress={() => setAgregando(true)} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const crearEstilos = (COLORS: Paleta) =>
  StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: COLORS.papel },
  contenido: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.sm,
    paddingBottom: ESPACIO.xxl,
    gap: ESPACIO.base,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIO.md,
    paddingHorizontal: ESPACIO.base,
    paddingVertical: ESPACIO.md,
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderRadius: RADIO.imagen,
    backgroundColor: COLORS.blanco,
  },
  filaPredeterminada: { borderColor: COLORS.tinta },
  filaPrincipal: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md },
  textos: { flex: 1, gap: 2 },
  nombre: { fontFamily: TIPOGRAFIA.titulo, fontSize: 14, color: COLORS.tinta },
  detalle: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: COLORS.textoSecundario },
  barraInferior: {
    paddingHorizontal: MEDIDAS.margenLateral,
    paddingTop: ESPACIO.md,
    paddingBottom: ESPACIO.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borde,
    backgroundColor: COLORS.papel,
  },
});
