import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { servicioProductos } from '@/services/servicioProductos';
import type { ColorProducto, DatosProductoGenerales, EtiquetaProducto, Producto, VarianteProducto } from '@/types';

export const TALLAS_DISPONIBLES = ['XS', 'S', 'M', 'L', 'XL'];
const ETIQUETAS_DISPONIBLES: EtiquetaProducto[] = ['NUEVO', '-15%', 'ÚLTIMAS'];

function claveVariante(talla: string, colorId: string): string {
  return `${talla}__${colorId}`;
}

function datosInicialesDe(producto?: Producto): DatosProductoGenerales {
  return {
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    categoriaId: producto?.categoriaId ?? '',
    precio: producto?.precio ?? 0,
    precioAnterior: producto?.precioAnterior,
    descripcion: producto?.descripcion ?? '',
    composicion: producto?.composicion ?? '',
    confeccion: producto?.confeccion ?? '',
    origen: producto?.origen ?? '',
    etiquetas: producto?.etiquetas ?? [],
    esNovedad: producto?.esNovedad ?? false,
  };
}

export function useFormularioProducto(productoExistente?: Producto) {
  const [generales, setGenerales] = useState<DatosProductoGenerales>(() =>
    datosInicialesDe(productoExistente),
  );
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>(() =>
    productoExistente ? [...new Set(productoExistente.variantes.map((v) => v.talla))] : [],
  );
  const [coloresSeleccionados, setColoresSeleccionados] = useState<string[]>(() =>
    productoExistente ? [...new Set(productoExistente.variantes.map((v) => v.colorId))] : [],
  );
  const [stockPorClave, setStockPorClave] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const variante of productoExistente?.variantes ?? []) {
      inicial[claveVariante(variante.talla, variante.colorId)] = variante.stock;
    }
    return inicial;
  });
  const [imagenes, setImagenes] = useState<string[]>(productoExistente?.imagenes ?? []);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const [coloresDisponibles, setColoresDisponibles] = useState<ColorProducto[]>([]);
  const [cargandoColores, setCargandoColores] = useState(true);

  useEffect(() => {
    let cancelado = false;
    servicioProductos
      .obtenerColores()
      .then((colores) => {
        if (!cancelado) setColoresDisponibles(colores);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorGuardado(
            err instanceof Error ? err.message : 'No se pudieron cargar los colores disponibles.',
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoColores(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const actualizarGeneral = <K extends keyof DatosProductoGenerales>(
    campo: K,
    valor: DatosProductoGenerales[K],
  ) => {
    setGenerales((previo) => ({ ...previo, [campo]: valor }));
  };

  const alternarTalla = (talla: string) => {
    setTallasSeleccionadas((previo) =>
      previo.includes(talla) ? previo.filter((t) => t !== talla) : [...previo, talla],
    );
  };

  const alternarColor = (colorId: string) => {
    setColoresSeleccionados((previo) =>
      previo.includes(colorId) ? previo.filter((c) => c !== colorId) : [...previo, colorId],
    );
  };

  const alternarEtiqueta = (etiqueta: EtiquetaProducto) => {
    setGenerales((previo) => ({
      ...previo,
      etiquetas: previo.etiquetas.includes(etiqueta)
        ? previo.etiquetas.filter((e) => e !== etiqueta)
        : [...previo.etiquetas, etiqueta],
    }));
  };

  const obtenerStock = (talla: string, colorId: string): number =>
    stockPorClave[claveVariante(talla, colorId)] ?? 0;

  const cambiarStock = (talla: string, colorId: string, stock: number) => {
    setStockPorClave((previo) => ({
      ...previo,
      [claveVariante(talla, colorId)]: Math.max(0, Math.floor(stock) || 0),
    }));
  };

  const variantesActuales = useMemo<VarianteProducto[]>(() => {
    const idBase = productoExistente?.id ?? 'nuevo';
    const resultado: VarianteProducto[] = [];
    for (const talla of tallasSeleccionadas) {
      for (const colorId of coloresSeleccionados) {
        resultado.push({
          id: `${idBase}__${talla}__${colorId}`,
          talla,
          colorId,
          stock: obtenerStock(talla, colorId),
        });
      }
    }
    return resultado;
  }, [tallasSeleccionadas, coloresSeleccionados, stockPorClave, productoExistente]);

  const agregarImagenDesdeGaleria = async () => {
    setErrorImagen(null);
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setErrorImagen('Necesitas permitir el acceso a tus fotos para elegir una imagen.');
      return;
    }
    setCargandoImagen(true);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });
      if (resultado.canceled) return;
      const activo = resultado.assets[0];
      if (!activo?.uri) return;
      const url = await servicioProductos.subirImagen(activo.uri, activo.mimeType ?? 'image/jpeg');
      setImagenes((previo) => [...previo, url]);
    } catch {
      setErrorImagen('No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setCargandoImagen(false);
    }
  };

  const eliminarImagen = (indice: number) => {
    setImagenes((previo) => previo.filter((_, i) => i !== indice));
  };

  const moverImagen = (indice: number, direccion: -1 | 1) => {
    setImagenes((previo) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= previo.length) return previo;
      const copia = [...previo];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  };

  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};
    if (!generales.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio.';
    if (!generales.sku.trim()) nuevosErrores.sku = 'El SKU es obligatorio.';
    if (!generales.categoriaId) nuevosErrores.categoriaId = 'Elige una categoría.';
    if (!(generales.precio >= 0)) nuevosErrores.precio = 'El precio debe ser mayor o igual a 0.';
    if (generales.precioAnterior != null && !(generales.precioAnterior >= 0)) {
      nuevosErrores.precioAnterior = 'Debe ser mayor o igual a 0.';
    }
    if (!generales.descripcion.trim()) nuevosErrores.descripcion = 'La descripción es obligatoria.';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  const guardar = async (): Promise<boolean> => {
    if (!validar()) return false;
    setGuardando(true);
    setErrorGuardado(null);
    try {
      const { variantesRetiradas } = await servicioProductos.guardarProducto(
        { ...generales, variantes: variantesActuales, imagenes },
        productoExistente?.id,
      );
      if (variantesRetiradas.length > 0) {
        // Variantes con movimientos o pedidos: la base no permite borrarlas,
        // así que quedaron con stock 0. Se avisa antes de salir.
        const lista = variantesRetiradas.map((v) => `${v.talla} / ${v.colorNombre}`).join(', ');
        const aviso = `Las variantes ${lista} quedaron con stock 0 porque tienen historial.`;
        if (Platform.OS === 'web') {
          // En web, Alert.alert con botones no muestra nada.
          window.alert(aviso);
          router.back();
        } else {
          Alert.alert('Producto guardado', aviso, [{ text: 'Entendido', onPress: () => router.back() }]);
        }
      } else {
        router.back();
      }
      return true;
    } catch (err) {
      setErrorGuardado(err instanceof Error ? err.message : 'No se pudo guardar el producto.');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  return {
    generales,
    actualizarGeneral,
    errores,
    etiquetasDisponibles: ETIQUETAS_DISPONIBLES,
    alternarEtiqueta,
    tallasDisponibles: TALLAS_DISPONIBLES,
    tallasSeleccionadas,
    alternarTalla,
    coloresDisponibles,
    cargandoColores,
    coloresSeleccionados,
    alternarColor,
    obtenerStock,
    cambiarStock,
    variantesActuales,
    imagenes,
    agregarImagenDesdeGaleria,
    cargandoImagen,
    errorImagen,
    eliminarImagen,
    moverImagen,
    guardando,
    errorGuardado,
    guardar,
    esEdicion: Boolean(productoExistente),
  };
}
