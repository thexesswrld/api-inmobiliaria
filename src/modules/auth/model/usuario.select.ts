import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';

// Qué se lee de la base para cada caso. Tenerlo aquí evita repetir el
// mismo `select` en varios services y da el tipo exacto del resultado.

const persona = {
  select: { nombre: true, apellidoPaterno: true, apellidoMaterno: true, correo: true },
} satisfies Prisma.PersonaDefaultArgs;

/** Usuario con sus roles y permisos activos: para el login y para validar la sesión. */
export const usuarioConAccesosSelect = {
  id: true,
  username: true,
  estado: true,
  persona,
  roles: {
    where: { ...ACTIVO, rol: ACTIVO },
    select: {
      rol: {
        select: {
          codigo: true,
          permisos: {
            where: { ...ACTIVO, permiso: ACTIVO },
            select: { permiso: { select: { codigo: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.UsuarioSelect;

export type UsuarioConAccesos = Prisma.UsuarioGetPayload<{ select: typeof usuarioConAccesosSelect }>;

/** Usuario para listados y detalle. */
export const usuarioDetalleSelect = {
  id: true,
  username: true,
  estado: true,
  fechaCreacion: true,
  persona,
  roles: {
    where: { ...ACTIVO, rol: ACTIVO },
    select: { rol: { select: { codigo: true, nombre: true } } },
  },
} satisfies Prisma.UsuarioSelect;

export type UsuarioDetalle = Prisma.UsuarioGetPayload<{ select: typeof usuarioDetalleSelect }>;

export type PersonaNombre = Prisma.PersonaGetPayload<typeof persona>;
