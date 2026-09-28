import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { BotonPrimario } from '@/components/common/BotonPrimario';
import { CampoTexto } from '@/components/common/CampoTexto';
import { TablaStockVariantes } from '@/components/admin/TablaStockVariantes';
import { ESPACIO, MEDIDAS, RADIO, TIPOGRAFIA } from '@/constants/theme';
import { useFormularioProducto } from '@/hooks/useFormularioProducto';
import { useTema } from '@/hooks/useTema';
import type { Categoria, EtiquetaProducto, Producto } from '@/types';

interface PropiedadesFormularioProducto {
  producto?: Producto;
  categorias: Categoria[];
}

function numeroATexto(valor: number | undefined): string {
  return valor == null ? '' : String(valor);
}

function textoANumero(texto: string): number {
  const limpio = texto.replace(/[^0-9.]/g, '');
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : 0;
}

export function FormularioProducto({ producto, categorias }: PropiedadesFormularioProducto) {
  const { colores: tema } = useTema();
  const [urlImagenNueva, setUrlImagenNueva] = useState('');
  const {
    generales,
    actualizarGeneral,
    errores,
    etiquetasDisponibles,
    alternarEtiqueta,
    tallasDisponibles,
    tallasSeleccionadas,
    alternarTalla,
    coloresDisponibles,
    coloresSeleccionados,
    alternarColor,
    obtenerStock,
    cambiarStock,
    imagenes,
    agregarImagen,
    eliminarImagen,
    moverImagen,
    guardando,
    guardar,
    esEdicion,
  } = useFormularioProducto(producto);

  return (
    <View style={styles.contenedor}>
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>DATOS GENERALES</Text>

      <CampoTexto
        etiqueta="SKU"
        valor={generales.sku}
        alCambiar={(v) => actualizarGeneral('sku', v)}
        placeholder="AT-CO-000"
        autoCapitalize="characters"
        error={errores.sku}
        editable={!esEdicion}
      />
      <CampoTexto
        etiqueta="Nombre"
        valor={generales.nombre}
        alCambiar={(v) => actualizarGeneral('nombre', v)}
        placeholder="Nombre de la prenda"
        error={errores.nombre}
      />

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>CATEGORÍA</Text>
        <View style={styles.chips}>
          {categorias.map((categoria) => {
            const activa = generales.categoriaId === categoria.id;
            return (
              <Pressable
                key={categoria.id}
                onPress={() => actualizarGeneral('categoriaId', categoria.id)}
                style={[
                  styles.chip,
                  { borderColor: tema.borde, backgroundColor: tema.lino },
                  activa && { backgroundColor: tema.tinta, borderColor: tema.tinta },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: activa }}
              >
                <Text style={[styles.textoChip, { color: activa ? tema.papel : tema.tinta }]}>
                  {categoria.nombre}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errores.categoriaId ? (
          <Text style={[styles.error, { color: tema.arcilla }]}>{errores.categoriaId}</Text>
        ) : null}
      </View>

      <View style={styles.filaDoble}>
        <View style={styles.mitad}>
          <CampoTexto
            etiqueta="Precio (S/)"
            valor={numeroATexto(generales.precio)}
            alCambiar={(v) => actualizarGeneral('precio', textoANumero(v))}
            placeholder="0.00"
            error={errores.precio}
          />
        </View>
        <View style={styles.mitad}>
          <CampoTexto
            etiqueta="Precio anterior (opcional)"
            valor={numeroATexto(generales.precioAnterior)}
            alCambiar={(v) =>
              actualizarGeneral('precioAnterior', v.trim() === '' ? undefined : textoANumero(v))
            }
            placeholder="0.00"
            error={errores.precioAnterior}
          />
        </View>
      </View>

      <CampoTexto
        etiqueta="Descripción"
        valor={generales.descripcion}
        alCambiar={(v) => actualizarGeneral('descripcion', v)}
        placeholder="Descripción de la prenda"
        error={errores.descripcion}
      />
      <CampoTexto
        etiqueta="Composición"
        valor={generales.composicion}
        alCambiar={(v) => actualizarGeneral('composicion', v)}
        placeholder="Composición: ..."
      />
      <CampoTexto
        etiqueta="Confección"
        valor={generales.confeccion}
        alCambiar={(v) => actualizarGeneral('confeccion', v)}
        placeholder="Confección: ..."
      />
      <CampoTexto
        etiqueta="Origen"
        valor={generales.origen}
        alCambiar={(v) => actualizarGeneral('origen', v)}
        placeholder="Origen: ..."
      />

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>ETIQUETAS</Text>
        <View style={styles.chips}>
          {etiquetasDisponibles.map((etiqueta: EtiquetaProducto) => {
            const activa = generales.etiquetas.includes(etiqueta);
            return (
              <Pressable
                key={etiqueta}
                onPress={() => alternarEtiqueta(etiqueta)}
                style={[
                  styles.chip,
                  { borderColor: tema.borde, backgroundColor: tema.lino },
                  activa && { backgroundColor: tema.arcilla, borderColor: tema.arcilla },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activa }}
              >
                <Text style={[styles.textoChip, { color: activa ? tema.papel : tema.tinta }]}>
                  {etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.filaInterruptor}>
        <Text style={[styles.textoInterruptor, { color: tema.tinta }]}>Es novedad</Text>
        <Switch
          value={generales.esNovedad}
          onValueChange={(v) => actualizarGeneral('esNovedad', v)}
        />
      </View>

      <View style={[styles.separador, { backgroundColor: tema.borde }]} />
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>TALLAS Y COLORES</Text>

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>TALLAS</Text>
        <View style={styles.chips}>
          {tallasDisponibles.map((talla) => {
            const activa = tallasSeleccionadas.includes(talla);
            return (
              <Pressable
                key={talla}
                onPress={() => alternarTalla(talla)}
                style={[
                  styles.chipTalla,
                  { borderColor: tema.borde },
                  activa && { backgroundColor: tema.tinta, borderColor: tema.tinta },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activa }}
              >
                <Text style={[styles.textoChip, { color: activa ? tema.papel : tema.tinta }]}>
                  {talla}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text style={[styles.etiquetaCampo, { color: tema.tinta50 }]}>COLORES</Text>
        <View style={styles.chips}>
          {coloresDisponibles.map((color) => {
            const activo = coloresSeleccionados.includes(color.id);
            return (
              <Pressable
                key={color.id}
                onPress={() => alternarColor(color.id)}
                style={styles.opcionColor}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: activo }}
                accessibilityLabel={color.nombre}
              >
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: color.hex, borderColor: tema.borde },
                    activo && { borderWidth: 2, borderColor: tema.tinta },
                  ]}
                />
                <Text style={[styles.textoSwatch, { color: tema.tinta }]}>{color.nombre}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.separador, { backgroundColor: tema.borde }]} />
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>STOCK POR VARIANTE</Text>
      <TablaStockVariantes
        tallas={tallasSeleccionadas}
        colores={coloresDisponibles.filter((c) => coloresSeleccionados.includes(c.id))}
        obtenerStock={obtenerStock}
        alCambiarStock={cambiarStock}
      />

      <View style={[styles.separador, { backgroundColor: tema.borde }]} />
      <Text style={[styles.tituloSeccion, { color: tema.textoSecundario }]}>FOTOGRAFÍAS</Text>
      <Text style={[styles.notaFotos, { color: tema.textoSecundario }]}>
        Pega la URL de la imagen — la subida de archivos llega cuando se conecte Supabase Storage.
      </Text>

      {imagenes.map((url, indice) => (
        <View key={`${url}-${indice}`} style={[styles.filaImagen, { borderColor: tema.borde }]}>
          <Text style={[styles.textoUrl, { color: tema.tinta }]} numberOfLines={1}>
            {url}
          </Text>
          <View style={styles.accionesImagen}>
            <Pressable
              onPress={() => moverImagen(indice, -1)}
              disabled={indice === 0}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Subir imagen"
            >
              <Ionicons name="chevron-up" size={18} color={indice === 0 ? tema.tinta20 : tema.tinta} />
            </Pressable>
            <Pressable
              onPress={() => moverImagen(indice, 1)}
              disabled={indice === imagenes.length - 1}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Bajar imagen"
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={indice === imagenes.length - 1 ? tema.tinta20 : tema.tinta}
              />
            </Pressable>
            <Pressable
              onPress={() => eliminarImagen(indice)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Eliminar imagen"
            >
              <Ionicons name="trash-outline" size={18} color={tema.arcilla} />
            </Pressable>
          </View>
        </View>
      ))}

      <View style={styles.filaAgregarImagen}>
        <TextInput
          style={[styles.entradaUrl, { borderColor: tema.borde, color: tema.tinta, backgroundColor: tema.blanco }]}
          value={urlImagenNueva}
          onChangeText={setUrlImagenNueva}
          placeholder="https://…"
          placeholderTextColor={tema.tinta35}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable
          style={[styles.botonAgregar, { borderColor: tema.tinta }]}
          onPress={() => {
            agregarImagen(urlImagenNueva);
            setUrlImagenNueva('');
          }}
          accessibilityRole="button"
        >
          <Text style={[styles.textoBotonAgregar, { color: tema.tinta }]}>AGREGAR</Text>
        </Pressable>
      </View>

      <BotonPrimario
        texto={esEdicion ? 'GUARDAR CAMBIOS' : 'CREAR PRODUCTO'}
        onPress={guardar}
        cargando={guardando}
        style={styles.botonGuardar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: ESPACIO.base, paddingBottom: ESPACIO.xxl },
  tituloSeccion: {
    fontFamily: TIPOGRAFIA.monoFuerte,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: ESPACIO.sm,
  },
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
  chipTalla: {
    width: 48,
    height: 40,
    borderRadius: RADIO.talla,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoChip: { fontFamily: TIPOGRAFIA.etiqueta, fontSize: 12 },
  error: { marginTop: ESPACIO.xs, fontFamily: TIPOGRAFIA.etiqueta, fontSize: 11.5 },
  filaDoble: { flexDirection: 'row', gap: ESPACIO.base },
  mitad: { flex: 1 },
  filaInterruptor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MEDIDAS.areaTactilMinima,
  },
  textoInterruptor: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 14 },
  separador: { height: 1, marginVertical: ESPACIO.sm },
  opcionColor: { alignItems: 'center', gap: 4, width: 56 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1 },
  textoSwatch: { fontFamily: TIPOGRAFIA.mono, fontSize: 9.5, textAlign: 'center' },
  notaFotos: { fontFamily: TIPOGRAFIA.cuerpo, fontSize: 11.5, lineHeight: 16 },
  filaImagen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ESPACIO.sm,
    paddingVertical: ESPACIO.sm,
    paddingHorizontal: ESPACIO.md,
    borderWidth: 1,
    borderRadius: RADIO.imagen,
  },
  textoUrl: { flex: 1, fontFamily: TIPOGRAFIA.mono, fontSize: 11 },
  accionesImagen: { flexDirection: 'row', gap: ESPACIO.sm },
  filaAgregarImagen: { flexDirection: 'row', gap: ESPACIO.sm },
  entradaUrl: {
    flex: 1,
    height: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.md,
    borderWidth: 1,
    borderRadius: RADIO.imagen,
    fontFamily: TIPOGRAFIA.mono,
    fontSize: 13,
  },
  botonAgregar: {
    minHeight: MEDIDAS.areaTactilMinima,
    paddingHorizontal: ESPACIO.base,
    borderWidth: 1,
    borderRadius: RADIO.imagen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonAgregar: { fontFamily: TIPOGRAFIA.titulo, fontSize: 12 },
  botonGuardar: { marginTop: ESPACIO.base },
});
