import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { ESPACIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { PATRON_HEX, type DatosColor } from '@/services/servicioCatalogoAdmin';
import type { ColorProducto } from '@/types';

interface PropiedadesFormularioColor {
  color?: ColorProducto;
  guardando: boolean;
  alGuardar: (datos: DatosColor) => Promise<void>;
  alCancelar: () => void;
}

export function FormularioColor({ color, guardando, alGuardar, alCancelar }: PropiedadesFormularioColor) {
  const { colores: tema } = useTema();
  const [nombre, setNombre] = useState(color?.nombre ?? '');
  const [hex, setHex] = useState(color?.hex ?? '#');
  const [errores, setErrores] = useState<{ nombre?: string; hex?: string }>({});
  const [error, setError] = useState<string | null>(null);

  const hexValido = PATRON_HEX.test(hex);

  const guardar = async () => {
    const nuevos: { nombre?: string; hex?: string } = {};
    if (!nombre.trim()) nuevos.nombre = 'El nombre es obligatorio.';
    if (!hexValido) nuevos.hex = 'Usa el formato #RRGGBB, por ejemplo #1F2A44.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setError(null);
    try {
      await alGuardar({ nombre: nombre.trim(), hex: hex.toUpperCase() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el color.');
    }
  };

  return (
    <View style={[styles.contenedor, { borderColor: tema.borde }]}>
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>
        {color ? 'EDITAR COLOR' : 'NUEVO COLOR'}
      </Text>

      <CampoTexto etiqueta="Nombre" valor={nombre} alCambiar={setNombre} placeholder="Oliva" error={errores.nombre} />

      <View style={styles.filaHex}>
        <View style={styles.campoHex}>
          <CampoTexto
            etiqueta="Hex"
            valor={hex}
            alCambiar={(texto) => setHex(`#${texto.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)}`)}
            placeholder="#1F2A44"
            autoCapitalize="characters"
            maxLength={7}
            error={errores.hex}
          />
        </View>
        <View
          style={[
            styles.muestra,
            { borderColor: tema.borde, backgroundColor: hexValido ? hex : tema.lino },
          ]}
          accessibilityLabel={hexValido ? `Muestra del color ${hex}` : 'Muestra vacía'}
        />
      </View>

      {error ? <Text style={[styles.error, { color: tema.arcilla }]}>{error}</Text> : null}

      <View style={styles.botones}>
        <BotonPrimario texto="CANCELAR" variante="contorno" onPress={alCancelar} altura={44} style={styles.boton} />
        <BotonPrimario
          texto={color ? 'GUARDAR' : 'CREAR'}
          onPress={guardar}
          cargando={guardando}
          altura={44}
          style={styles.boton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: ESPACIO.base, paddingBottom: ESPACIO.base, marginBottom: ESPACIO.base, borderBottomWidth: 1 },
  tituloSeccion: { fontFamily: TIPOGRAFIA.monoFuerte, fontSize: 11, letterSpacing: 1.2, marginTop: ESPACIO.sm },
  filaHex: { flexDirection: 'row', alignItems: 'flex-end', gap: ESPACIO.base },
  campoHex: { flex: 1 },
  muestra: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, marginBottom: 2 },
  error: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11.5 },
  botones: { flexDirection: 'row', gap: ESPACIO.md },
  boton: { flex: 1 },
});
