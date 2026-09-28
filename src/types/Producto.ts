export type EtiquetaProducto = 'NUEVO' | '-15%' | 'ÚLTIMAS';

export interface ColorProducto {
  id: string;
  nombre: string;
  hex: string;
}

export interface VarianteProducto {
  id: string;
  talla: string;
  colorId: string;
  stock: number;
}

export interface Producto {
  id: string;
  sku: string;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  precio: number;
  precioAnterior?: number;
  descripcion: string;
  composicion: string;
  confeccion: string;
  origen: string;
  imagenes: string[];
  colores: ColorProducto[];
  variantes: VarianteProducto[];
  etiquetas: EtiquetaProducto[];
  esNovedad: boolean;
  popularidad30d: number;
  fechaAlta: string;
  activo: boolean;
}

// Datos generales editables desde el panel admin (sin id/colores/variantes/
// fechaAlta/popularidad30d/activo: esos se derivan o se gestionan aparte).
export interface DatosProductoGenerales {
  sku: string;
  nombre: string;
  categoriaId: string;
  precio: number;
  precioAnterior?: number;
  descripcion: string;
  composicion: string;
  confeccion: string;
  origen: string;
  etiquetas: EtiquetaProducto[];
  esNovedad: boolean;
}
