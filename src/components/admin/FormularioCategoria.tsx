import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { ESPACIO, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioCatalogoAdmin, type DatosCategoria } from '@/services/servicioCatalogoAdmin';
import type { Categoria } from '@/types';

interface PropiedadesFormularioCategoria {
  categoria?: Categoria;
  guardando: boolean;
  alGuardar: (datos: DatosCategoria) => Promise<void>;
  alCancelar: () => void;
}

function textoASubcategorias(texto: string): string[] {
  return [...new Set(texto.split(',').map((s) => s.trim()).filter(Boolean))];
}

export function FormularioCategoria({ categoria, guardando, alGuardar, alCancelar }: PropiedadesFormularioCategoria) {
  const { colores: tema } = useTema();
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [subcategorias, setSubcategorias] = useState((categoria?.subcategorias ?? []).join(', '));
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(categoria?.imagenUrl);
  const [subiendo, setSubiendo] = useState(false);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const elegirImagen = async () => {
    setError(null);
    setSubiendo(true);
    try {
      const url = await servicioCatalogoAdmin.elegirYSubirImagen();
      if (url) setImagenUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      setErrorNombre('El nombre es obligatorio.');
      return;
    }
    setErrorNombre(undefined);
    setError(null);
    try {
      await alGuardar({ nombre: nombre.trim(), subcategorias: textoASubcategorias(subcategorias), imagenUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la categoría.');
    }
  };

  return (
    <View style={[styles.contenedor, { borderColor: tema.borde }]}>
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>
        {categoria ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}
      </Text>

      <CampoTexto etiqueta="Nombre" valor={nombre} alCambiar={setNombre} placeholder="Abrigos" error={errorNombre} />
      <CampoTexto
        etiqueta="Subcategorías (separadas por comas)"
        valor={subcategorias}
        alCambiar={setSubcategorias}
        placeholder="Casacas, Parkas, Chalecos"
      />

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>IMAGEN</Text>
        <View style={styles.filaImagen}>
          {imagenUrl ? (
            <Image source={{ uri: imagenUrl }} style={[styles.miniatura, { borderColor: tema.borde }]} />
          ) : (
            <View style={[styles.miniatura, styles.sinImagen, { borderColor: tema.borde, backgroundColor: tema.lino }]}>
              <Ionicons name="image-outline" size={20} color={tema.tinta40} />
            </View>
          )}
          <View style={styles.accionesImagen}>
            <Pressable onPress={elegirImagen} disabled={subiendo} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.enlace, { color: tema.tinta }]}>
                {subiendo ? 'SUBIENDO…' : imagenUrl ? 'CAMBIAR IMAGEN' : 'ELEGIR IMAGEN'}
              </Text>
            </Pressable>
            {imagenUrl ? (
              <Pressable onPress={() => setImagenUrl(undefined)} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.enlace, { color: tema.arcilla }]}>QUITAR</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {error ? <Text style={[styles.error, { color: tema.arcilla }]}>{error}</Text> : null}

      <View style={styles.botones}>
        <BotonPrimario texto="CANCELAR" variante="contorno" onPress={alCancelar} altura={44} style={styles.boton} />
        <BotonPrimario
          texto={categoria ? 'GUARDAR' : 'CREAR'}
          onPress={guardar}
          cargando={guardando}
          deshabilitado={subiendo}
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
  etiquetaCampo: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 9.5,
    letterSpacing: 1.2,
    marginBottom: ESPACIO.sm,
    textTransform: 'uppercase',
  },
  filaImagen: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.base },
  miniatura: { width: 72, height: 72, borderRadius: RADIO.imagen, borderWidth: 1 },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
  accionesImagen: { gap: ESPACIO.sm },
  enlace: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, letterSpacing: 0.6 },
  error: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11.5 },
  botones: { flexDirection: 'row', gap: ESPACIO.md },
  boton: { flex: 1 },
});
