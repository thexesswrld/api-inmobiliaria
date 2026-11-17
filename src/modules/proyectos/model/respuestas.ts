import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';

export interface EmpresaResumenRespuesta {
  id: number;
  nombre: string;
  ruc: string;
}

export interface ProyectoRespuesta {
  id: number;
  nombre: string;
  tipo: OpcionRespuesta;
  direccion: string | null;
  logo: string | null;
  empresa: EmpresaResumenRespuesta;
  totalSectores: number;
  totalModelos: number;
}

export interface ProyectoDetalleRespuesta extends ProyectoRespuesta {
  totalUnidades: number;
  unidadesDisponibles: number;
  unidadesSeparadas: number;
  unidadesVendidas: number;
  unidadesEntregadas: number;
}

export interface SectorRespuesta {
  id: number;
  idSectorPadre: number | null;
  nombre: string;
  codigo: string | null;
  orden: number;
  tipo: OpcionRespuesta;
  totalUnidades: number;
}

export interface SectorArbolRespuesta extends SectorRespuesta {
  hijos: SectorArbolRespuesta[];
}

export interface UnidadRespuesta {
  id: number;
  nombre: string;
  tipo: OpcionRespuesta;
  estado: OpcionRespuesta;
  precio: string | null;
  areaProyectada: string | null;
  areaSuperficie: string | null;
  atributos: Record<string, unknown>;
  sector: { id: number; nombre: string; codigo: string | null };
  proyecto: { id: number; nombre: string };
}

export interface UnidadDetalleRespuesta extends UnidadRespuesta {
  propietario: { id: number; nombreCompleto: string; documento: string } | null;
  totalModelos: number;
  fechaCreacion: string;
}

export interface ModeloReferenciaRespuesta {
  id: number;
  idSector: number | null;
  idUnidad: number | null;
  geometria: unknown;
  idElementoExterno: string | null;
}

export interface ModeloRespuesta {
  id: number;
  nombre: string;
  ruta: string;
  tipo: OpcionRespuesta;
  version: number;
  principal: boolean;
  orden: number;
  sector: { id: number; nombre: string } | null;
  unidad: { id: number; nombre: string } | null;
  referencias: ModeloReferenciaRespuesta[];
}
