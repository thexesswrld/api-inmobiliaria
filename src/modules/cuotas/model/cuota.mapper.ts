import { aDinero, aFecha, nombreCompleto } from '../../../common/formato/formato.js';
import type { EstadoRealCuota } from '../../ventas/model/respuestas.js';
import type { CuotaListadoRespuesta } from './respuestas.js';

/** Fila de v_cuota_estado con los numeric convertidos a texto en el SQL. */
export interface FilaCuota {
  id: number;
  numero: number;
  idVenta: number;
  ventaCodigo: string;
  clienteId: number;
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  documento: string;
  tipoCuota: string;
  estadoCuota: string;
  estadoReal: EstadoRealCuota;
  fechaVencimiento: string;
  monto: string | null;
  montoPagado: string | null;
  saldo: string | null;
  montoMora: string | null;
  montoMoraPagado: string | null;
  saldoMora: string | null;
  diasAtraso: number;
}

export interface NombresCuota {
  tipo: Map<string, string>;
  estado: Map<string, string>;
}

export function toCuotaListadoRespuesta(f: FilaCuota, nombres: NombresCuota): CuotaListadoRespuesta {
  return {
    id: f.id,
    numero: f.numero,
    tipo: { codigo: f.tipoCuota, nombre: nombres.tipo.get(f.tipoCuota) ?? f.tipoCuota },
    estado: { codigo: f.estadoCuota, nombre: nombres.estado.get(f.estadoCuota) ?? f.estadoCuota },
    estadoReal: f.estadoReal,
    fechaVencimiento: aFecha(f.fechaVencimiento) ?? '',
    monto: aDinero(f.monto) ?? '0.00',
    montoPagado: aDinero(f.montoPagado) ?? '0.00',
    saldo: aDinero(f.saldo) ?? '0.00',
    montoMora: aDinero(f.montoMora) ?? '0.00',
    montoMoraPagado: aDinero(f.montoMoraPagado) ?? '0.00',
    saldoMora: aDinero(f.saldoMora) ?? '0.00',
    diasAtraso: Number(f.diasAtraso),
    venta: { id: f.idVenta, codigo: f.ventaCodigo },
    cliente: {
      id: f.clienteId,
      nombreCompleto: nombreCompleto({
        nombre: f.nombre,
        apellidoPaterno: f.apellidoPaterno,
        apellidoMaterno: f.apellidoMaterno,
      }),
      documento: f.documento,
    },
  };
}
