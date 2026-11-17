import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { opcionSelect } from '../../../common/opciones/opciones.js';

const personaResumen = {
  select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, documento: true },
} satisfies Prisma.PersonaDefaultArgs;

const clienteResumen = {
  select: { id: true, persona: personaResumen },
} satisfies Prisma.ClienteDefaultArgs;

const ventaResumen = {
  select: { id: true, codigo: true, cliente: clienteResumen },
} satisfies Prisma.VentaDefaultArgs;

/** Cabecera del pago para listados. */
export const pagoListadoSelect = {
  id: true,
  fechaPago: true,
  monto: true,
  tipoCambio: true,
  numeroOperacion: true,
  ruta: true,
  motivoAnulacion: true,
  estadoPagoOpcion: { select: opcionSelect },
  moneda: { select: opcionSelect },
  medioPagoOpcion: { select: opcionSelect },
  cuentaBancaria: { select: { id: true, banco: true, numeroCuenta: true } },
  venta: ventaResumen,
  aplicaciones: { where: ACTIVO, select: { montoAplicado: true } },
} satisfies Prisma.PagoSelect;

export type PagoListadoSeleccionado = Prisma.PagoGetPayload<{ select: typeof pagoListadoSelect }>;

/** Detalle: cabecera + reparto por cuota. */
export const pagoDetalleSelect = {
  ...pagoListadoSelect,
  fechaCreacion: true,
  idUsuarioModificacion: true,
  aplicaciones: {
    where: ACTIVO,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      montoAplicado: true,
      aplicaAOpcion: { select: opcionSelect },
      cuota: {
        select: {
          id: true,
          numero: true,
          fechaVencimiento: true,
          monto: true,
          montoPagado: true,
        },
      },
    },
  },
} satisfies Prisma.PagoSelect;

export type PagoDetalleSeleccionado = Prisma.PagoGetPayload<{ select: typeof pagoDetalleSelect }>;
