export interface ModalidadEntrega {
  id: 'estandar' | 'express' | 'retiro';
  nombre: string;
  tipo: 'envio' | 'retiro';
  descripcion: string;
  horario: string;
  activo: boolean;
}

export interface TarifaEntrega {
  metodoId: ModalidadEntrega['id'];
  costo: number;
}

export interface ZonaEntrega {
  id: string;
  nombre: string;
  distrito: string;
  provincia: string;
  departamento: string;
  mapsUrl: string;
  activo: boolean;
  tarifas: TarifaEntrega[];
}

export type DatosZonaEntrega = Omit<ZonaEntrega, 'id'> & { id?: string };

export interface ConfiguracionEntregas {
  modalidades: ModalidadEntrega[];
  zonas: ZonaEntrega[];
}
