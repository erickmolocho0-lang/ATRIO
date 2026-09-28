import type { COLORS } from './colors';

const TEXTO = '245, 243, 239';
const FONDO = '17, 16, 13';

export const COLORS_OSCURO: Record<keyof typeof COLORS, string> = {
  papel: '#17160D',
  tinta: '#F5F3EF',
  arcilla: '#E8875A',
  lino: '#232219',
  blanco: '#1F1E17', 

  textoSecundario: `rgba(${TEXTO}, 0.55)`,
  borde: `rgba(${TEXTO}, 0.14)`,

  tinta60: `rgba(${TEXTO}, 0.60)`,
  tinta50: `rgba(${TEXTO}, 0.50)`,
  tinta45: `rgba(${TEXTO}, 0.45)`,
  tinta42: `rgba(${TEXTO}, 0.42)`,
  tinta40: `rgba(${TEXTO}, 0.40)`,
  tinta35: `rgba(${TEXTO}, 0.35)`,
  tinta20: `rgba(${TEXTO}, 0.20)`,
  tinta14: `rgba(${TEXTO}, 0.14)`,
  tinta08: `rgba(${TEXTO}, 0.08)`,
  tinta72: `rgba(${TEXTO}, 0.72)`,

  arcilla10: 'rgba(232, 135, 90, 0.14)',

  papel90: `rgba(${FONDO}, 0.90)`,
  papel45: `rgba(${FONDO}, 0.45)`,
  papel20: `rgba(${FONDO}, 0.20)`,
  papel60: `rgba(${FONDO}, 0.60)`,
};