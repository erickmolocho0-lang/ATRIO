import { useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoEntrega } from './CampoEntrega';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { DatosZonaEntrega, ZonaEntrega, ModalidadEntrega, TarifaEntrega } from '@/types/Entrega';
import { esEnlaceMaps, interpretarTarifa, validarZonaEntrega } from '@/utils/entregas';

interface Propiedades {
  inicial?: ZonaEntrega;
  modalidades: ModalidadEntrega[];
  guardando: boolean;
  alGuardar: (datos: DatosZonaEntrega) => void;
  alCancelar: () => void;
}

export function FormularioZonaEntrega({ inicial, modalidades, guardando, alGuardar, alCancelar }: Propiedades) {
  const { colores } = useTema();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [mapsUrl, setMapsUrl] = useState(inicial?.mapsUrl ?? '');
  const [distrito, setDistrito] = useState(inicial?.distrito ?? '');
  const [provincia, setProvincia] = useState(inicial?.provincia ?? '');
  const [departamento, setDepartamento] = useState(inicial?.departamento ?? '');
  const [activo, setActivo] = useState(inicial?.activo ?? false);
  const [precios, setPrecios] = useState<Record<string, string>>(() => Object.fromEntries(
    (inicial?.tarifas ?? []).map((tarifa) => [tarifa.metodoId, tarifa.costo.toFixed(2)]),
  ));
  const [error, setError] = useState<string | null>(null);

  const enviar = () => {
    setError(null);
    try {
      const tarifas: TarifaEntrega[] = [];
      for (const modalidad of modalidades.filter((m) => m.tipo === 'envio')) {
        const costo = interpretarTarifa(precios[modalidad.id] ?? '');
        if (costo !== null) tarifas.push({ metodoId: modalidad.id, costo });
      }
      const datos = { id: inicial?.id, nombre, distrito, provincia, departamento, mapsUrl, activo, tarifas };
      validarZonaEntrega(datos);
      alGuardar(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revisa los datos de la zona.');
    }
  };

  return (
    <View style={styles.formulario}>
      <Text style={[styles.titulo, { color: colores.tinta }]}>{inicial ? 'Editar zona' : 'Agregar zona'}</Text>
      <CampoEntrega etiqueta="Zona o localidad" valor={nombre} alCambiar={setNombre} maxLength={100} deshabilitado={guardando} />
      <CampoEntrega etiqueta="Departamento" valor={departamento} alCambiar={setDepartamento} maxLength={100} deshabilitado={guardando} />
      <CampoEntrega etiqueta="Provincia" valor={provincia} alCambiar={setProvincia} maxLength={100} deshabilitado={guardando} />
      <CampoEntrega etiqueta="Distrito" valor={distrito} alCambiar={setDistrito} maxLength={100} deshabilitado={guardando} />
      <CampoEntrega etiqueta="Enlace de Google Maps (opcional)" valor={mapsUrl} alCambiar={setMapsUrl}
        autoCapitalize="none" maxLength={2000} deshabilitado={guardando} />
      {esEnlaceMaps(mapsUrl.trim()) ? <BotonPrimario texto="Ver ubicación en Maps" variante="contorno" deshabilitado={guardando}
        onPress={() => { void Linking.openURL(mapsUrl.trim()).catch(() => setError('No se pudo abrir Google Maps.')); }} /> : null}
      <Text style={[styles.nota, { color: colores.textoSecundario }]}>
        Los precios están en soles. Un campo vacío significa que esa modalidad no está disponible en esta zona. Usa 0 para envío gratuito.
      </Text>
      {modalidades.filter((m) => m.tipo === 'envio').map((modalidad) => (
        <CampoEntrega key={modalidad.id}
          etiqueta={`${modalidad.nombre}${modalidad.activo ? '' : ' (modalidad inactiva)'} · S/`}
          valor={precios[modalidad.id] ?? ''}
          alCambiar={(valor) => setPrecios((actual) => ({ ...actual, [modalidad.id]: valor }))}
          keyboardType="decimal-pad" placeholder="No disponible" maxLength={11} deshabilitado={guardando}
        />
      ))}
      <View style={styles.interruptor}>
        <Text style={[styles.texto, { color: colores.tinta }]}>Cobertura activa en esta zona</Text>
        <Switch value={activo} onValueChange={setActivo} disabled={guardando}
          accessibilityLabel="Cobertura activa en esta zona" trackColor={{ true: colores.tinta, false: colores.tinta14 }} />
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.nota, { color: colores.arcilla }]}>{error}</Text> : null}
      <BotonPrimario texto="Guardar zona" onPress={enviar} cargando={guardando} />
      <BotonPrimario texto="Cancelar" onPress={alCancelar} variante="contorno" deshabilitado={guardando} />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: { gap: ESPACIO.base },
  titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18 },
  texto: { flex: 1, fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  nota: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, lineHeight: 20 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, minHeight: 48 },
});
