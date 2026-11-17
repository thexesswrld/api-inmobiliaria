import { aCentavos, aDinero, aFecha, aFechaHora, deCentavos, dinero, nombreCompleto } from '../../../common/formato/formato.js';
import { hoyISO } from '../../../common/cronograma/cronograma.js';
import { toOpcion } from '../../../common/opciones/opciones.js';
import type {
  ClienteVentaRespuesta,
  CuotaRespuesta,
  EstadoRealCuota,
  ResumenVentaRespuesta,
  TrabajadorVentaRespuesta,
  VentaDetalleRespuesta,
  VentaListadoRespuesta,
} from './respuestas.js';
import type { VentaDetalleSeleccionada, VentaListadoSeleccionada } from './venta.select.js';

export const RESUMEN_VACIO: ResumenVentaRespuesta = {
  totalPagado: '0.00',
  saldo: '0.00',
  moraPendiente: '0.00',
  cuotasVencidas: 0,
  maxDiasAtraso: 0,
  diferenciaInicial: '0.00',
  diferenciaCronograma: '0.00',
};

function toClienteRespuesta(
  cliente: VentaListadoSeleccionada['cliente'],
): ClienteVentaRespuesta {
  return {
    id: cliente.id,
    nombreCompleto: nombreCompleto(cliente.persona),
    documento: cliente.persona.documento,
    correo: cliente.persona.correo,
    telefono: cliente.persona.telefono,
    direccion: cliente.persona.direccion,
  };
}

function toTrabajadorRespuesta(
  trabajador: VentaListadoSeleccionada['trabajador'],
): TrabajadorVentaRespuesta {
  return { id: trabajador.id, nombreCompleto: nombreCompleto(trabajador.persona) };
}

export function toVentaListadoRespuesta(
  v: VentaListadoSeleccionada,
  resumen: ResumenVentaRespuesta,
): VentaListadoRespuesta {
  return {
    id: v.id,
    codigo: v.codigo,
    fechaVenta: aFecha(v.fechaVenta) ?? '',
    estado: toOpcion(v.estadoComercialOpcion),
    moneda: toOpcion(v.moneda),
    montoFinal: dinero(v.montoFinal),
    montoInicial: dinero(v.montoInicial),
    montoFinanciado: dinero(v.montoFinanciado),
    numeroCuotas: v.numeroCuotas,
    fechaFinVenta: aFecha(v.fechaFinVenta),
    cliente: toClienteRespuesta(v.cliente),
    trabajador: toTrabajadorRespuesta(v.trabajador),
    resumen,
  };
}

export function toVentaDetalleRespuesta(
  v: VentaDetalleSeleccionada,
  resumen: ResumenVentaRespuesta,
): VentaDetalleRespuesta {
  return {
    ...toVentaListadoRespuesta(v, resumen),
    montoBruto: dinero(v.montoBruto),
    descuento: dinero(v.descuento),
    fechaCreacion: aFechaHora(v.fechaCreacion) ?? '',
    detalles: v.detalles.map((d) => ({
      id: d.id,
      unidad: {
        id: d.unidad.id,
        nombre: d.unidad.nombre,
        sector: { id: d.unidad.sector.id, nombre: d.unidad.sector.nombre, codigo: d.unidad.sector.codigo },
        proyecto: { id: d.unidad.sector.proyecto.id, nombre: d.unidad.sector.proyecto.nombre },
      },
      precioLista: dinero(d.precioLista),
      descuento: dinero(d.descuento),
      precioVenta: dinero(d.precioVenta),
    })),
    cuotas: v.cuotas.map(toCuotaRespuesta),
  };
}

/** Réplica de v_cuota_estado: estado real, saldo y días de atraso a la fecha. */
export function toCuotaRespuesta(c: VentaDetalleSeleccionada['cuotas'][number]): CuotaRespuesta {
  const montoC = aCentavos(c.monto);
  const pagadoC = aCentavos(c.montoPagado);
  const moraC = aCentavos(c.montoMora);
  const moraPagadaC = aCentavos(c.montoMoraPagado);

  const saldoC = Math.max(0, montoC - pagadoC);
  const fecha = aFecha(c.fechaVencimiento) ?? '';
  const hoy = hoyISO();
  const vencida = saldoC > 0 && fecha < hoy;
  const diasAtraso = vencida
    ? Math.max(0, Math.round((Date.parse(`${hoy}T00:00:00Z`) - Date.parse(`${fecha}T00:00:00Z`)) / 86_400_000))
    : 0;

  const codigo = c.estadoCuotaOpcion.codigo;
  const estadoReal: EstadoRealCuota =
    codigo === 'ANULADA'
      ? 'ANULADA'
      : saldoC <= 0
        ? 'PAGADA'
        : vencida
          ? 'VENCIDA'
          : pagadoC > 0
            ? 'PAGO_PARCIAL'
            : 'PENDIENTE';

  return {
    id: c.id,
    numero: c.numero,
    tipo: toOpcion(c.tipoCuotaOpcion),
    estado: toOpcion(c.estadoCuotaOpcion),
    estadoReal,
    fechaVencimiento: fecha,
    monto: dinero(c.monto),
    montoPagado: dinero(c.montoPagado),
    saldo: deCentavos(saldoC),
    montoMora: dinero(c.montoMora),
    montoMoraPagado: dinero(c.montoMoraPagado),
    saldoMora: deCentavos(Math.max(0, moraC - moraPagadaC)),
    diasAtraso,
  };
}

/** Fila de v_venta_resumen con los numeric convertidos a texto en el SQL. */
export interface FilaResumenVenta {
  totalPagado: string | null;
  saldo: string | null;
  moraPendiente: string | null;
  cuotasVencidas: number;
  maxDiasAtraso: number;
  diferenciaInicial: string | null;
  diferenciaCronograma: string | null;
}

export function toResumenVentaRespuesta(fila: FilaResumenVenta | undefined): ResumenVentaRespuesta {
  if (!fila) return RESUMEN_VACIO;
  return {
    totalPagado: aDinero(fila.totalPagado) ?? '0.00',
    saldo: aDinero(fila.saldo) ?? '0.00',
    moraPendiente: aDinero(fila.moraPendiente) ?? '0.00',
    cuotasVencidas: Number(fila.cuotasVencidas),
    maxDiasAtraso: Number(fila.maxDiasAtraso),
    diferenciaInicial: aDinero(fila.diferenciaInicial) ?? '0.00',
    diferenciaCronograma: aDinero(fila.diferenciaCronograma) ?? '0.00',
  };
}
