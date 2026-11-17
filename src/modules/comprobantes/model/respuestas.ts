import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';

export interface ComprobanteRespuesta {
  id: number;
  tipoComprobante: OpcionRespuesta;
  serie: string;
  numero: number;
  /** "B001-00000124". */
  numeroCompleto: string;
  fechaEmision: string;
  estado: OpcionRespuesta;
  estadoSunat: OpcionRespuesta;
  moneda: OpcionRespuesta;
  tipoCambio: string | null;
  opGravada: string;
  opExonerada: string;
  opInafecta: string;
  porcentajeIgv: string;
  igv: string;
  total: string;
  cliente: {
    id: number;
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial: string;
    direccion: string | null;
  };
  pago: { id: number; monto: string; venta: { id: number; codigo: string } } | null;
  referencia: { id: number; serie: string; numero: number; numeroCompleto: string } | null;
  glosa: string | null;
  observaciones: string | null;
  motivoAnulacion: string | null;
  hashCpe: string | null;
  urlPdf: string | null;
  urlXml: string | null;
  urlCdr: string | null;
  fechaEnvioSunat: string | null;
  mensajeSunat: string | null;
  fechaCreacion: string;
}
