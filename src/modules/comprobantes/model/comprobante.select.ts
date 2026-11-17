import type { Prisma } from '../../../generated/prisma/client.js';
import { opcionSelect } from '../../../common/opciones/opciones.js';

/** Cabecera + datos fiscales congelados al emitir. */
export const comprobanteSelect = {
  id: true,
  tipoComprobanteOpcion: { select: opcionSelect },
  serie: true,
  numero: true,
  fechaEmision: true,
  clienteTipoDocumento: true,
  clienteNumeroDocumento: true,
  clienteRazonSocial: true,
  clienteDireccion: true,
  tipoCambio: true,
  opGravada: true,
  opExonerada: true,
  opInafecta: true,
  porcentajeIgv: true,
  igv: true,
  total: true,
  glosa: true,
  observaciones: true,
  estadoOpcion: { select: opcionSelect },
  motivoAnulacion: true,
  estadoSunatOpcion: { select: opcionSelect },
  hashCpe: true,
  urlPdf: true,
  urlXml: true,
  urlCdr: true,
  fechaEnvioSunat: true,
  mensajeSunat: true,
  fechaCreacion: true,
  moneda: { select: opcionSelect },
  cliente: { select: { id: true } },
  pago: { select: { id: true, monto: true, venta: { select: { id: true, codigo: true } } } },
  referencia: { select: { id: true, serie: true, numero: true } },
} satisfies Prisma.ComprobanteSelect;

export type ComprobanteSeleccionado = Prisma.ComprobanteGetPayload<{ select: typeof comprobanteSelect }>;
