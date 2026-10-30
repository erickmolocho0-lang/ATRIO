import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useTema } from '@/hooks/useTema';
import { servicioCatalogoAdmin } from '@/services/servicioCatalogoAdmin';
import type { CampanaAdmin, Categoria, DatosCampana } from '@/types';

interface PropiedadesFormularioCampana {
  campana?: CampanaAdmin;
  categorias: Categoria[];
  guardando: boolean;
  alGuardar: (datos: DatosCampana) => Promise<void>;
  alCancelar: () => void;
}

type Errores = Partial<Record<'etiqueta' | 'titulo' | 'textoBoton' | 'categoriaDestino', string>>;

export function FormularioCampana({
  campana,
  categorias,
  guardando,
  alGuardar,
  alCancelar,
}: PropiedadesFormularioCampana) {
  const { colores: tema } = useTema();
  const [etiqueta, setEtiqueta] = useState(campana?.etiqueta ?? '');
  const [titulo, setTitulo] = useState(campana?.titulo ?? '');
  const [textoBoton, setTextoBoton] = useState(campana?.textoBoton ?? '');
  const [categoriaDestino, setCategoriaDestino] = useState(campana?.categoriaDestino ?? '');
  const [imagenUrl, setImagenUrl] = useState<string | undefined>(campana?.imagenUrl);
  const [activa, setActiva] = useState(campana?.activa ?? true);
  const [subiendo, setSubiendo] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
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
    const nuevos: Errores = {};
    if (!etiqueta.trim()) nuevos.etiqueta = 'La etiqueta es obligatoria.';
    if (!titulo.trim()) nuevos.titulo = 'El título es obligatorio.';
    if (!textoBoton.trim()) nuevos.textoBoton = 'El texto del botón es obligatorio.';
    if (!categoriaDestino) nuevos.categoriaDestino = 'Elige a qué categoría lleva el botón.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    setError(null);
    try {
      await alGuardar({ etiqueta, titulo, textoBoton, categoriaDestino, imagenUrl, activa });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la campaña.');
    }
  };

  return (
    <View style={[styles.contenedor, { borderColor: tema.borde }]}>
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>
        {campana ? 'EDITAR CAMPAÑA' : 'NUEVA CAMPAÑA'}
      </Text>

      <CampoTexto
        etiqueta="Etiqueta"
        valor={etiqueta}
        alCambiar={setEtiqueta}
        placeholder="NUEVA TEMPORADA"
        autoCapitalize="characters"
        error={errores.etiqueta}
      />
      <CampoTexto etiqueta="Título" valor={titulo} alCambiar={setTitulo} placeholder="Capas esenciales" error={errores.titulo} />
      <CampoTexto
        etiqueta="Texto del botón"
        valor={textoBoton}
        alCambiar={setTextoBoton}
        placeholder="VER COLECCIÓN"
        autoCapitalize="characters"
        error={errores.textoBoton}
      />

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>CATEGORÍA DE DESTINO</Text>
        <View style={styles.chips}>
          {categorias.map((categoria) => {
            const elegida = categoriaDestino === categoria.id;
            return (
              <Pressable
                key={categoria.id}
                onPress={() => setCategoriaDestino(categoria.id)}
                style={[
                  styles.chip,
                  { borderColor: tema.borde, backgroundColor: tema.lino },
                  elegida && { backgroundColor: tema.tinta, borderColor: tema.tinta },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegida }}
              >
                <Text style={[styles.textoChip, { color: elegida ? tema.papel : tema.tinta }]}>{categoria.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
        {errores.categoriaDestino ? (
          <Text style={[styles.error, { color: tema.arcilla }]}>{errores.categoriaDestino}</Text>
        ) : null}
      </View>

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

      <View style={styles.filaInterruptor}>
        <Text style={[styles.textoInterruptor, { color: tema.tinta }]}>Activa (se muestra en Inicio)</Text>
        <Switch value={activa} onValueChange={setActiva} />
      </View>

      {error ? <Text style={[styles.error, { color: tema.arcilla }]}>{error}</Text> : null}

      <View style={styles.botones}>
        <BotonPrimario texto="CANCELAR" variante="contorno" onPress={alCancelar} altura={44} style={styles.boton} />
        <BotonPrimario
          texto={campana ? 'GUARDAR' : 'CREAR'}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIO.sm },
  chip: {
    minHeight: MEDIDAS.areaTactilMinima - 8,
    paddingHorizontal: ESPACIO.md,
    borderRadius: RADIO.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoChip: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12 },
  filaImagen: { flexDirection: 'row', alignItems: 'center', gap: ESPACIO.base },
  miniatura: { width: 120, height: 72, borderRadius: RADIO.imagen, borderWidth: 1 },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
  accionesImagen: { gap: ESPACIO.sm },
  enlace: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12, letterSpacing: 0.6 },
  filaInterruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MEDIDAS.areaTactilMinima,
  },
  textoInterruptor: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  error: { marginTop: ESPACIO.xs, fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11.5 },
  botones: { flexDirection: 'row', gap: ESPACIO.md },
  boton: { flex: 1 },
});
