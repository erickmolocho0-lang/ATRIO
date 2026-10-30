import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { FilaInterruptor } from '@/components/profile/FilaInterruptor';
import type { NombreColor } from '@/constants/colors';
import { useTema } from '@/hooks/useTema';
import { ESPACIO, MEDIDAS, TIPOGRAFIA } from '@/constants/theme';
import type { DatosDireccion } from '@/types';
import { validarDatosDireccion } from '@/utils/checkout';

interface PropiedadesFormularioDireccion {
  inicial?: DatosDireccion;
  yaEsPredeterminada: boolean;
  guardando: boolean;
  textoBoton: string;
  alGuardar: (datos: DatosDireccion) => void;
}

export function FormularioDireccion({
  inicial,
  yaEsPredeterminada,
  guardando,
  textoBoton,
  alGuardar,
}: PropiedadesFormularioDireccion) {
  const { colores } = useTema();
  const styles = crearEstilos(colores);
  const [etiqueta, setEtiqueta] = useState(inicial?.etiqueta ?? '');
  const [direccion, setDireccion] = useState(inicial?.direccion ?? '');
  const [distrito, setDistrito] = useState(inicial?.distrito ?? '');
  const [referencia, setReferencia] = useState(inicial?.referencia ?? '');
  const [predeterminada, setPredeterminada] = useState(inicial?.predeterminada ?? false);
  const [intentado, setIntentado] = useState(false);

  const referenciaDistrito = useRef<TextInputInstance>(null);
  const referenciaReferencia = useRef<TextInputInstance>(null);

  const errores = intentado
    ? validarDatosDireccion({ direccion, distrito, predeterminada })
    : {};

  const enviar = () => {
    setIntentado(true);
    if (Object.keys(validarDatosDireccion({ direccion, distrito, predeterminada })).length > 0) {
      return;
    }
    alGuardar({
      etiqueta: etiqueta.trim() || undefined,
      direccion: direccion.trim(),
      distrito: distrito.trim(),
      referencia: referencia.trim() || undefined,
      predeterminada,
    });
  };

  return (
    <View style={styles.contenedor}>
      <CampoTexto
        etiqueta="Etiqueta (opcional)"
        valor={etiqueta}
        alCambiar={setEtiqueta}
        placeholder="Casa, Trabajo…"
        maxLength={20}
        editable={!guardando}
      />
      <CampoTexto
        etiqueta="Dirección"
        valor={direccion}
        alCambiar={setDireccion}
        placeholder="Calle / avenida y número"
        error={errores.direccion}
        returnKeyType="next"
        onSubmitEditing={() => referenciaDistrito.current?.focus()}
        editable={!guardando}
      />
      <CampoTexto
        etiqueta="Distrito"
        valor={distrito}
        alCambiar={setDistrito}
        placeholder="Chirinos"
        error={errores.distrito}
        referencia={referenciaDistrito}
        returnKeyType="next"
        onSubmitEditing={() => referenciaReferencia.current?.focus()}
        editable={!guardando}
      />
      <CampoTexto
        etiqueta="Referencia (opcional)"
        valor={referencia}
        alCambiar={setReferencia}
        placeholder="Frente al parque, portón verde…"
        referencia={referenciaReferencia}
        editable={!guardando}
      />

      {yaEsPredeterminada ? (
        <Text style={styles.nota}>Esta es tu dirección predeterminada.</Text>
      ) : (
        <View style={styles.interruptor}>
          <FilaInterruptor
            titulo="Usar como predeterminada"
            valor={predeterminada}
            onCambiar={setPredeterminada}
          />
        </View>
      )}

      <BotonPrimario texto={textoBoton} onPress={enviar} cargando={guardando} />
    </View>
  );
}

const crearEstilos = (colores: Record<NombreColor, string>) => StyleSheet.create({
  contenedor: { gap: ESPACIO.base },
  interruptor: { marginHorizontal: -MEDIDAS.margenLateral },
  nota: { fontFamily: TIPOGRAFIA.mono, fontSize: 11, color: colores.textoSecundario },
});
