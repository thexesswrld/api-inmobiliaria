import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { opcionSelect } from '../../../common/opciones/opciones.js';

const personaResumen = {
  select: {
    nombre: true,
    apellidoPaterno: true,
    apellidoMaterno: true,
    documento: true,
    correo: true,
    telefono: true,
    direccion: true,
  },
} satisfies Prisma.PersonaDefaultArgs;

const clienteResumen = {
  select: { id: true, persona: personaResumen },
} satisfies Prisma.ClienteDefaultArgs;

const trabajadorResumen = {
  select: { id: true, persona: personaResumen },
} satisfies Prisma.TrabajadorDefaultArgs;

const cuotaSelect = {
  id: true,
  numero: true,
  fechaVencimiento: true,
  monto: true,
  montoPagado: true,
  montoMora: true,
  montoMoraPagado: true,
  tipoCuotaOpcion: { select: opcionSelect },
  estadoCuotaOpcion: { select: opcionSelect },
} satisfies Prisma.CuotaSelect;

/** Cabecera para listados. */
export const ventaListadoSelect = {
  id: true,
  codigo: true,
  fechaVenta: true,
  montoFinal: true,
  montoInicial: true,
  montoFinanciado: true,
  numeroCuotas: true,
  fechaFinVenta: true,
  estadoComercialOpcion: { select: opcionSelect },
  moneda: { select: opcionSelect },
  cliente: clienteResumen,
  trabajador: trabajadorResumen,
} satisfies Prisma.VentaSelect;

export type VentaListadoSeleccionada = Prisma.VentaGetPayload<{ select: typeof ventaListadoSelect }>;

/** Detalle: cabecera + unidades + cronograma completo. */
export const ventaDetalleSelect = {
  ...ventaListadoSelect,
  montoBruto: true,
  descuento: true,
  fechaCreacion: true,
  detalles: {
    where: ACTIVO,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      precioLista: true,
      descuento: true,
      precioVenta: true,
      unidad: {
        select: {
          id: true,
          nombre: true,
          sector: {
            select: {
              id: true,
              nombre: true,
              codigo: true,
              proyecto: { select: { id: true, nombre: true } },
            },
          },
        },
      },
    },
  },
  cuotas: {
    where: ACTIVO,
    orderBy: { numero: 'asc' },
    select: cuotaSelect,
  },
} satisfies Prisma.VentaSelect;

export type VentaDetalleSeleccionada = Prisma.VentaGetPayload<{ select: typeof ventaDetalleSelect }>;
