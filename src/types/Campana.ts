export interface CampanaInicio {
  etiqueta: string;
  titulo: string;
  textoBoton: string;
  categoriaDestino: string;
  imagenUrl?: string;
}

/** Campaña vista desde el panel admin: incluye las inactivas. */
export interface CampanaAdmin extends CampanaInicio {
  id: string;
  activa: boolean;
}

export type DatosCampana = Omit<CampanaAdmin, 'id'>;
