import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';

export interface ClienteVentaRespuesta {
  id: number;
  nombreCompleto: string;
  documento: string;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
}

export interface TrabajadorVentaRespuesta {
  id: number;
  nombreCompleto: string;
}

export interface DetalleVentaRespuesta {
  id: number;
  unidad: {
    id: number;
    nombre: string;
    sector: { id: number; nombre: string; codigo: string | null };
    proyecto: { id: number; nombre: string };
  };
  precioLista: string;
  descuento: string;
  precioVenta: string;
}

export type EstadoRealCuota = 'PENDIENTE' | 'PAGO_PARCIAL' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

export interface CuotaRespuesta {
  id: number;
  numero: number;
  tipo: OpcionRespuesta;
  estado: OpcionRespuesta;
  /** Estado calculado a la fecha, como la vista v_cuota_estado. */
  estadoReal: EstadoRealCuota;
  fechaVencimiento: string;
  monto: string;
  montoPagado: string;
  saldo: string;
  montoMora: string;
  montoMoraPagado: string;
  saldoMora: string;
  diasAtraso: number;
}

export interface ResumenVentaRespuesta {
  totalPagado: string;
  saldo: string;
  moraPendiente: string;
  cuotasVencidas: number;
  maxDiasAtraso: number;
  /** Deben ser "0.00": si no, el cronograma no cuadra con los montos del contrato. */
  diferenciaInicial: string;
  diferenciaCronograma: string;
}

export interface VentaListadoRespuesta {
  id: number;
  codigo: string;
  fechaVenta: string;
  estado: OpcionRespuesta;
  moneda: OpcionRespuesta;
  montoFinal: string;
  montoInicial: string;
  montoFinanciado: string;
  numeroCuotas: number;
  fechaFinVenta: string | null;
  cliente: ClienteVentaRespuesta;
  trabajador: TrabajadorVentaRespuesta;
  resumen: ResumenVentaRespuesta;
}

export interface VentaDetalleRespuesta extends VentaListadoRespuesta {
  montoBruto: string;
  descuento: string;
  fechaCreacion: string;
  detalles: DetalleVentaRespuesta[];
  cuotas: CuotaRespuesta[];
}
