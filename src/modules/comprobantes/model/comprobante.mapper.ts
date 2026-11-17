import { aFecha, aFechaHora, dinero } from '../../../common/formato/formato.js';
import { toOpcion } from '../../../common/opciones/opciones.js';
import type { ComprobanteSeleccionado } from './comprobante.select.js';
import type { ComprobanteRespuesta } from './respuestas.js';

export function numeroCompleto(serie: string, numero: number): string {
  return `${serie.trim()}-${String(numero).padStart(8, '0')}`;
}

export function toComprobanteRespuesta(c: ComprobanteSeleccionado): ComprobanteRespuesta {
  return {
    id: c.id,
    tipoComprobante: toOpcion(c.tipoComprobanteOpcion),
    serie: c.serie.trim(),
    numero: c.numero,
    numeroCompleto: numeroCompleto(c.serie, c.numero),
    fechaEmision: aFecha(c.fechaEmision) ?? '',
    estado: toOpcion(c.estadoOpcion),
    estadoSunat: toOpcion(c.estadoSunatOpcion),
    moneda: toOpcion(c.moneda),
    tipoCambio: c.tipoCambio === null ? null : Number(c.tipoCambio).toFixed(4),
    opGravada: dinero(c.opGravada),
    opExonerada: dinero(c.opExonerada),
    opInafecta: dinero(c.opInafecta),
    porcentajeIgv: Number(c.porcentajeIgv).toFixed(2),
    igv: dinero(c.igv),
    total: dinero(c.total),
    cliente: {
      id: c.cliente.id,
      tipoDocumento: c.clienteTipoDocumento,
      numeroDocumento: c.clienteNumeroDocumento,
      razonSocial: c.clienteRazonSocial,
      direccion: c.clienteDireccion,
    },
    pago: c.pago
      ? {
          id: c.pago.id,
          monto: dinero(c.pago.monto),
          venta: { id: c.pago.venta.id, codigo: c.pago.venta.codigo },
        }
      : null,
    referencia: c.referencia
      ? {
          id: c.referencia.id,
          serie: c.referencia.serie.trim(),
          numero: c.referencia.numero,
          numeroCompleto: numeroCompleto(c.referencia.serie, c.referencia.numero),
        }
      : null,
    glosa: c.glosa,
    observaciones: c.observaciones,
    motivoAnulacion: c.motivoAnulacion,
    hashCpe: c.hashCpe,
    urlPdf: c.urlPdf,
    urlXml: c.urlXml,
    urlCdr: c.urlCdr,
    fechaEnvioSunat: aFechaHora(c.fechaEnvioSunat),
    mensajeSunat: c.mensajeSunat,
    fechaCreacion: aFechaHora(c.fechaCreacion) ?? '',
  };
}
