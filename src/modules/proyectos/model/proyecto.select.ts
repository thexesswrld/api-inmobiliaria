import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { opcionSelect } from '../../../common/opciones/opciones.js';

/** Proyecto para listados y detalle. */
export const proyectoSelect = {
  id: true,
  nombre: true,
  direccion: true,
  logo: true,
  tipoProyectoOpcion: { select: opcionSelect },
  empresa: { select: { id: true, nombre: true, ruc: true } },
  _count: {
    select: {
      sectores: { where: ACTIVO },
      modelos: { where: ACTIVO },
    },
  },
} satisfies Prisma.ProyectoSelect;

export type ProyectoSeleccionado = Prisma.ProyectoGetPayload<{ select: typeof proyectoSelect }>;

/** Sector con el total de unidades activas (para el árbol). */
export const sectorSelect = {
  id: true,
  idProyecto: true,
  idSectorPadre: true,
  nombre: true,
  codigo: true,
  orden: true,
  tipoSectorOpcion: { select: opcionSelect },
  _count: { select: { unidades: { where: ACTIVO } } },
} satisfies Prisma.SectorSelect;

export type SectorSeleccionado = Prisma.SectorGetPayload<{ select: typeof sectorSelect }>;

/** Unidad para listados: incluye sector y proyecto para navegar sin otra consulta. */
export const unidadSelect = {
  id: true,
  nombre: true,
  precio: true,
  areaProyectada: true,
  areaSuperficie: true,
  atributos: true,
  tipoUnidadOpcion: { select: opcionSelect },
  estadoComercialOpcion: { select: opcionSelect },
  sector: {
    select: {
      id: true,
      nombre: true,
      codigo: true,
      proyecto: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.UnidadSelect;

export type UnidadSeleccionada = Prisma.UnidadGetPayload<{ select: typeof unidadSelect }>;

/** Detalle de una unidad: agrega propietario, modelos y fecha de alta. */
export const unidadDetalleSelect = {
  ...unidadSelect,
  fechaCreacion: true,
  propietario: {
    select: {
      id: true,
      persona: {
        select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, documento: true },
      },
    },
  },
  _count: { select: { modelos: { where: ACTIVO } } },
} satisfies Prisma.UnidadSelect;

export type UnidadDetalleSeleccionada = Prisma.UnidadGetPayload<{ select: typeof unidadDetalleSelect }>;

/** Modelo (plano, render, tour) con sus zonas clicables. */
export const modeloSelect = {
  id: true,
  nombre: true,
  ruta: true,
  version: true,
  esPrincipal: true,
  orden: true,
  tipoModeloOpcion: { select: opcionSelect },
  sector: { select: { id: true, nombre: true } },
  unidad: { select: { id: true, nombre: true } },
  referencias: {
    where: ACTIVO,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      idSector: true,
      idUnidad: true,
      geometria: true,
      idElementoExterno: true,
    },
  },
} satisfies Prisma.ModeloSelect;

export type ModeloSeleccionado = Prisma.ModeloGetPayload<{ select: typeof modeloSelect }>;
