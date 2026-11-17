import type { SimulacionCronograma } from '../../../common/cronograma/cronograma.js';
import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';

export interface UnidadCotizadaRespuesta {
  id: number;
  nombre: string;
  estado: OpcionRespuesta;
  proyecto: string;
  sector: string;
  disponible: boolean;
}

export interface CotizacionRespuesta extends SimulacionCronograma {
  unidad: UnidadCotizadaRespuesta | null;
}
