import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';
import type { EstadoRealCuota } from '../../ventas/model/respuestas.js';

export interface CuotaListadoRespuesta {
  id: number;
  numero: number;
  tipo: OpcionRespuesta;
  /** Estado guardado en ven_cuota.estado_cuota. */
  estado: OpcionRespuesta;
  /** Estado calculado a la fecha, como v_cuota_estado. */
  estadoReal: EstadoRealCuota;
  fechaVencimiento: string;
  monto: string;
  montoPagado: string;
  saldo: string;
  montoMora: string;
  montoMoraPagado: string;
  saldoMora: string;
  diasAtraso: number;
  venta: { id: number; codigo: string };
  cliente: { id: number; nombreCompleto: string; documento: string };
}
