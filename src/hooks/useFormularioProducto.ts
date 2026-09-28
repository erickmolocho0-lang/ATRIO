import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { colores as paletaColores } from '@/data/colores';
import { servicioProductos } from '@/services/servicioProductos';
import type { DatosProductoGenerales, EtiquetaProducto, Producto, VarianteProducto } from '@/types';

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

  // El stock de una combinación que ya existía se conserva aunque se
  // deseleccione y se vuelva a seleccionar la talla/color.
  const obtenerStock = (talla: string, colorId: string): number =>
    stockPorClave[claveVariante(talla, colorId)] ?? 0;

  const cambiarStock = (talla: string, colorId: string, stock: number) => {
    setStockPorClave((previo) => ({
      ...previo,
      [claveVariante(talla, colorId)]: Math.max(0, Math.floor(stock) || 0),
    }));
  };

  // Talla × Color, sin duplicados (la clave es literalmente el par).
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

  const agregarImagen = (url: string) => {
    const limpia = url.trim();
    if (!limpia) return;
    setImagenes((previo) => [...previo, limpia]);
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
    try {
      if (productoExistente) {
        await servicioProductos.actualizarProducto(productoExistente.id, generales);
        await servicioProductos.actualizarVariantesEImagenes(
          productoExistente.id,
          variantesActuales,
          imagenes,
        );
      } else {
        await servicioProductos.crearProducto({ ...generales, variantes: variantesActuales, imagenes });
      }
      router.back();
      return true;
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
    coloresDisponibles: paletaColores,
    coloresSeleccionados,
    alternarColor,
    obtenerStock,
    cambiarStock,
    variantesActuales,
    imagenes,
    agregarImagen,
    eliminarImagen,
    moverImagen,
    guardando,
    guardar,
    esEdicion: Boolean(productoExistente),
  };
}
