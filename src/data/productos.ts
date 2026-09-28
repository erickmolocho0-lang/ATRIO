import { obtenerColorPorId } from '@/data/colores';
import type { ColorProducto, Producto, VarianteProducto } from '@/types';
import { idVariante } from '@/utils/variantes';

type StockPorTallaColor = Record<string, Record<string, number>>;

function variantes(productoId: string, stockPorTallaColor: StockPorTallaColor): VarianteProducto[] {
  const resultado: VarianteProducto[] = [];
  for (const talla of Object.keys(stockPorTallaColor)) {
    for (const colorId of Object.keys(stockPorTallaColor[talla])) {
      resultado.push({
        id: idVariante(productoId, talla, colorId),
        talla,
        colorId,
        stock: stockPorTallaColor[talla][colorId],
      });
    }
  }
  return resultado;
}

function coloresDe(variantesProducto: VarianteProducto[]): ColorProducto[] {
  const ids = [...new Set(variantesProducto.map((v) => v.colorId))];
  return ids
    .map((id) => obtenerColorPorId(id))
    .filter((color): color is ColorProducto => color !== undefined);
}

function producto(
  datos: Omit<Producto, 'colores' | 'variantes' | 'activo'> & {
    variantes: VarianteProducto[];
    activo?: boolean;
  },
): Producto {
  return { ...datos, activo: datos.activo ?? true, colores: coloresDe(datos.variantes) };
}

export const productos: Producto[] = [
  producto({
    id: 'at-co-014',
    sku: 'AT-CO-014',
    nombre: 'Abrigo trench arena',
    categoriaId: 'abrigos',
    categoriaNombre: 'ABRIGOS',
    precio: 549,
    descripcion:
      'Trench de línea recta con cinturón anudado, canesú doble y bolsillos de ojal. Cae por debajo de la rodilla para superponer sobre prendas de punto.',
    composicion: 'Composición: 68 % algodón, 30 % poliéster, 2 % elastano.',
    confeccion: 'Confección: cosido y ensamblado en taller propio.',
    origen: 'Origen: Lima, Perú.',
    imagenes: [],
    variantes: variantes('at-co-014', {
      XS: { arena: 2, tinta: 0 },
      S: { arena: 3, tinta: 2 },
      M: { arena: 3, tinta: 1 },
      L: { arena: 1, tinta: 0 },
    }),
    etiquetas: ['NUEVO'],
    esNovedad: true,
    popularidad30d: 184,
    fechaAlta: '2026-08-28',
  }),
  producto({
    id: 'at-co-021',
    sku: 'AT-CO-021',
    nombre: 'Blazer estructurado tinta',
    categoriaId: 'abrigos',
    categoriaNombre: 'ABRIGOS',
    precio: 389,
    descripcion:
      'Blazer de hombro marcado y solapa de pico. Forro interior completo y botonadura simple. Un básico de fondo de armario.',
    composicion: 'Composición: 54 % lana virgen, 44 % poliéster, 2 % elastano.',
    confeccion: 'Confección: entretela termoadhesiva y pespuntes reforzados.',
    origen: 'Origen: Lima, Perú.',
    imagenes: [],
    variantes: variantes('at-co-021', {
      S: { tinta: 1, negro: 0 },
      M: { tinta: 2, negro: 1 },
      XL: { tinta: 0, negro: 0 },
    }),
    etiquetas: ['ÚLTIMAS'],
    esNovedad: false,
    popularidad30d: 96,
    fechaAlta: '2026-07-15',
  }),
  producto({
    id: 'at-ca-007',
    sku: 'AT-CA-007',
    nombre: 'Camisa popelín blanca',
    categoriaId: 'camisas',
    categoriaNombre: 'CAMISAS',
    precio: 179,
    descripcion:
      'Camisa de popelín de algodón con cuello clásico y puño ajustable. Corte regular, ligeramente entallado en la cintura.',
    composicion: 'Composición: 100 % algodón peinado.',
    confeccion: 'Confección: costuras francesas en los laterales.',
    origen: 'Origen: Pisco, Perú.',
    imagenes: [],
    variantes: variantes('at-ca-007', {
      XS: { blanco: 3, crudo: 2 },
      S: { blanco: 4, crudo: 3 },
      M: { blanco: 5, crudo: 3 },
      L: { blanco: 3, crudo: 2 },
      XL: { blanco: 1, crudo: 1 },
    }),
    etiquetas: ['NUEVO'],
    esNovedad: true,
    popularidad30d: 152,
    fechaAlta: '2026-08-20',
  }),
  producto({
    id: 'at-ca-012',
    sku: 'AT-CA-012',
    nombre: 'Camisa oversize lino',
    categoriaId: 'camisas',
    categoriaNombre: 'CAMISAS',
    precio: 199,
    precioAnterior: 235,
    descripcion:
      'Camisa amplia de lino lavado con caída fluida y hombro caído. Pensada para llevar abierta sobre una camiseta.',
    composicion: 'Composición: 100 % lino europeo.',
    confeccion: 'Confección: lavado enzimático para un tacto suave.',
    origen: 'Origen: Arequipa, Perú.',
    imagenes: [],
    variantes: variantes('at-ca-012', {
      S: { crudo: 2, arena: 1 },
      M: { crudo: 2, arena: 2 },
      L: { crudo: 1, arena: 1 },
    }),
    etiquetas: ['-15%'],
    esNovedad: false,
    popularidad30d: 121,
    fechaAlta: '2026-06-30',
  }),
  producto({
    id: 'at-de-003',
    sku: 'AT-DE-003',
    nombre: 'Jean recto crudo',
    categoriaId: 'denim',
    categoriaNombre: 'DENIM',
    precio: 259,
    descripcion:
      'Denim rígido sin lavar, de tiro medio y pernera recta. El índigo cede con el uso y marca el desgaste natural.',
    composicion: 'Composición: 100 % algodón denim de 13 oz.',
    confeccion: 'Confección: remaches de cobre y costuras a contraste.',
    origen: 'Origen: Lima, Perú.',
    imagenes: [],
    variantes: variantes('at-de-003', {
      S: { crudo: 3, negro: 2 },
      M: { crudo: 4, negro: 3 },
      L: { crudo: 3, negro: 2 },
      XL: { crudo: 1, negro: 0 },
    }),
    etiquetas: ['NUEVO'],
    esNovedad: true,
    popularidad30d: 143,
    fechaAlta: '2026-08-12',
  }),
  producto({
    id: 'at-ve-009',
    sku: 'AT-VE-009',
    nombre: 'Vestido midi plisado',
    categoriaId: 'vestidos',
    categoriaNombre: 'VESTIDOS',
    precio: 329,
    descripcion:
      'Vestido midi con falda plisada permanente y cintura elástica cubierta. Escote redondo y manga tres cuartos.',
    composicion: 'Composición: 100 % poliéster reciclado.',
    confeccion: 'Confección: plisado fijado al calor.',
    origen: 'Origen: Lima, Perú.',
    imagenes: [],
    variantes: variantes('at-ve-009', {
      XS: { negro: 1, terracota: 0 },
      S: { negro: 1, terracota: 1 },
      M: { negro: 0, terracota: 0 },
    }),
    etiquetas: ['ÚLTIMAS'],
    esNovedad: false,
    popularidad30d: 88,
    fechaAlta: '2026-05-22',
  }),
  producto({
    id: 'at-pu-005',
    sku: 'AT-PU-005',
    nombre: 'Jersey lana merino',
    categoriaId: 'punto',
    categoriaNombre: 'PUNTO',
    precio: 289,
    descripcion:
      'Jersey de cuello redondo en lana merino de galga fina. Abriga sin volumen y regula la temperatura.',
    composicion: 'Composición: 100 % lana merino extrafina.',
    confeccion: 'Confección: tejido tubular sin costuras laterales.',
    origen: 'Origen: Puno, Perú.',
    imagenes: [],
    variantes: variantes('at-pu-005', {
      S: { oliva: 2, crudo: 2 },
      M: { oliva: 3, crudo: 3 },
      L: { oliva: 2, crudo: 2 },
      XL: { oliva: 1, crudo: 0 },
    }),
    etiquetas: ['NUEVO'],
    esNovedad: true,
    popularidad30d: 167,
    fechaAlta: '2026-08-25',
  }),
  producto({
    id: 'at-fa-002',
    sku: 'AT-FA-002',
    nombre: 'Falda pana camel',
    categoriaId: 'faldas',
    categoriaNombre: 'FALDAS',
    precio: 219,
    precioAnterior: 259,
    descripcion:
      'Falda recta de pana fina a la altura de la rodilla, con abertura trasera y cierre invisible lateral.',
    composicion: 'Composición: 98 % algodón, 2 % elastano.',
    confeccion: 'Confección: forro de raso en el cuerpo.',
    origen: 'Origen: Lima, Perú.',
    imagenes: [],
    variantes: variantes('at-fa-002', {
      XS: { arena: 1, terracota: 1 },
      S: { arena: 2, terracota: 1 },
      L: { arena: 1, terracota: 1 },
    }),
    etiquetas: ['-15%'],
    esNovedad: false,
    popularidad30d: 74,
    fechaAlta: '2026-07-02',
  }),
];
