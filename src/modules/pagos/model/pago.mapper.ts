import { aCentavos, aFecha, aFechaHora, deCentavos, dinero, nombreCompleto } from '../../../common/formato/formato.js';
import { toOpcion } from '../../../common/opciones/opciones.js';
import type { PagoDetalleRespuesta, PagoRespuesta } from './respuestas.js';
import type { PagoDetalleSeleccionado, PagoListadoSeleccionado } from './pago.select.js';

export function toPagoRespuesta(p: PagoListadoSeleccionado): PagoRespuesta {
  const aplicadoC = p.aplicaciones.reduce((suma, a) => suma + aCentavos(a.montoAplicado), 0);
  return {
    id: p.id,
    fechaPago: aFecha(p.fechaPago) ?? '',
    monto: dinero(p.monto),
    tipoCambio: p.tipoCambio === null ? null : Number(p.tipoCambio).toFixed(4),
    numeroOperacion: p.numeroOperacion,
    ruta: p.ruta,
    motivoAnulacion: p.motivoAnulacion,
    estado: toOpcion(p.estadoPagoOpcion),
    moneda: toOpcion(p.moneda),
    medioPago: toOpcion(p.medioPagoOpcion),
    cuentaBancaria: p.cuentaBancaria,
    venta: { id: p.venta.id, codigo: p.venta.codigo },
    cliente: {
      id: p.venta.cliente.id,
      nombreCompleto: nombreCompleto(p.venta.cliente.persona),
      documento: p.venta.cliente.persona.documento,
    },
    aplicado: deCentavos(aplicadoC),
    sinAplicar: deCentavos(Math.max(0, aCentavos(p.monto) - aplicadoC)),
  };
}

export function toPagoDetalleRespuesta(p: PagoDetalleSeleccionado): PagoDetalleRespuesta {
  return {
    ...toPagoRespuesta(p),
    fechaCreacion: aFechaHora(p.fechaCreacion) ?? '',
    aplicaciones: p.aplicaciones.map((a) => ({
      id: a.id,
      cuota: {
        id: a.cuota.id,
        numero: a.cuota.numero,
        fechaVencimiento: aFecha(a.cuota.fechaVencimiento) ?? '',
        monto: dinero(a.cuota.monto),
        montoPagado: dinero(a.cuota.montoPagado),
      },
      monto: dinero(a.montoAplicado),
      aplicaA: toOpcion(a.aplicaAOpcion),
    })),
  };
}
