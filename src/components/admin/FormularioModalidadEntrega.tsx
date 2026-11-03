import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoEntrega } from './CampoEntrega';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import type { ModalidadEntrega } from '@/types/Entrega';
import { validarModalidadEntrega } from '@/utils/entregas';

interface Propiedades {
  inicial: ModalidadEntrega;
  guardando: boolean;
  alGuardar: (datos: ModalidadEntrega) => void;
  alCancelar: () => void;
}

export function FormularioModalidadEntrega({ inicial, guardando, alGuardar, alCancelar }: Propiedades) {
  const { colores } = useTema();
  const [nombre, setNombre] = useState(inicial.nombre);
  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [horario, setHorario] = useState(inicial.horario);
  const [activo, setActivo] = useState(inicial.activo);
  const [error, setError] = useState<string | null>(null);

  const enviar = () => {
    setError(null);
    try {
      const datos = { ...inicial, nombre, descripcion, horario, activo };
      validarModalidadEntrega(datos);
      alGuardar(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revisa los datos de la modalidad.');
    }
  };

  return (
    <View style={styles.formulario}>
      <Text style={[styles.titulo, { color: colores.tinta }]}>Editar modalidad</Text>
      <CampoEntrega etiqueta="Nombre" valor={nombre} alCambiar={setNombre} maxLength={80} deshabilitado={guardando} />
      <CampoEntrega etiqueta={inicial.tipo === 'retiro' ? 'Indicaciones para el retiro' : 'Plazo de entrega'}
        valor={descripcion} alCambiar={setDescripcion} maxLength={300} multiline deshabilitado={guardando} />
      <CampoEntrega etiqueta="Días y horario de atención o reparto" valor={horario} alCambiar={setHorario}
        maxLength={300} multiline deshabilitado={guardando} />
      <Text style={[styles.nota, { color: colores.textoSecundario }]}>
        El horario es informativo: describe los días y horas en que atiendes o repartes.
      </Text>
      <View style={styles.interruptor}>
        <Text style={[styles.texto, { color: colores.tinta }]}>Modalidad activa</Text>
        <Switch value={activo} onValueChange={setActivo} disabled={guardando} accessibilityLabel="Modalidad activa"
          trackColor={{ true: colores.tinta, false: colores.tinta14 }} />
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.nota, { color: colores.arcilla }]}>{error}</Text> : null}
      <BotonPrimario texto="Guardar modalidad" onPress={enviar} cargando={guardando} />
      <BotonPrimario texto="Cancelar" onPress={alCancelar} variante="contorno" deshabilitado={guardando} />
    </View>
  );
}

const styles = StyleSheet.create({
  formulario: { gap: ESPACIO.base }, titulo: { fontFamily: TIPOGRAFIA.titulo, fontSize: 18 },
  texto: { flex: 1, fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  nota: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 13, lineHeight: 20 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.md, minHeight: 48 },
});
