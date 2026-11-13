import { HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export interface ErrorTraducido {
  status: number;
  codigo: string;
  mensaje: string;
  detalles?: unknown;
  /** true si es un error no previsto: se registra completo en el log. */
  inesperado?: boolean;
}

const CODIGO_POR_STATUS: Record<number, string> = {
  400: 'VALIDACION',
  401: 'NO_AUTENTICADO',
  403: 'SIN_PERMISO',
  404: 'NO_ENCONTRADO',
  409: 'CONFLICTO',
  422: 'REGLA_NEGOCIO',
};

/**
 * Convierte cualquier error (Nest, Prisma o un RAISE EXCEPTION de Postgres)
 * en un error con forma estándar. Es una función pura: fácil de testear.
 */
export function traducirError(e: unknown): ErrorTraducido {
  if (e instanceof HttpException) return desdeHttp(e);
  if (e instanceof Prisma.PrismaClientKnownRequestError) return desdePrisma(e);
  return inesperado();
}

function desdeHttp(e: HttpException): ErrorTraducido {
  const status = e.getStatus();
  const codigo = CODIGO_POR_STATUS[status] ?? 'HTTP';
  const cuerpo = e.getResponse();
  const mensajeCuerpo =
    typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as { message?: unknown }).message : cuerpo;

  // El pipe de validación devuelve una lista de mensajes: van en detalles.
  if (Array.isArray(mensajeCuerpo)) {
    return { status, codigo, mensaje: 'Los datos enviados no son válidos', detalles: mensajeCuerpo };
  }
  return { status, codigo, mensaje: typeof mensajeCuerpo === 'string' ? mensajeCuerpo : e.message };
}

function desdePrisma(e: Prisma.PrismaClientKnownRequestError): ErrorTraducido {
  switch (e.code) {
    case 'P2002':
      return { status: 409, codigo: 'DUPLICADO', mensaje: 'Ya existe un registro con esos datos', detalles: e.meta?.target };
    case 'P2003':
      return { status: 409, codigo: 'REFERENCIA', mensaje: 'El registro está relacionado con otros datos' };
    case 'P2025':
      return { status: 404, codigo: 'NO_ENCONTRADO', mensaje: 'Registro no encontrado' };
    case 'P2010': // error en $queryRaw / $executeRaw
    case 'P2039': // error de la base en una consulta normal (p. ej. un trigger)
      return desdePostgres(e);
    default:
      return inesperado();
  }
}

/** Errores que vienen de la base: RAISE EXCEPTION de los triggers, CHECK, NOT NULL... */
function desdePostgres(e: Prisma.PrismaClientKnownRequestError): ErrorTraducido {
  const { sqlstate, mensaje } = datosPostgres(e);
  switch (sqlstate) {
    case 'P0001': // RAISE EXCEPTION sin ERRCODE: regla de negocio de database/negocio/
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, codigo: 'REGLA_NEGOCIO', mensaje };
    case '23514': // CHECK
      return { status: HttpStatus.UNPROCESSABLE_ENTITY, codigo: 'REGLA_NEGOCIO', mensaje: 'Un valor está fuera de lo permitido' };
    case '23505': // UNIQUE
      return { status: HttpStatus.CONFLICT, codigo: 'DUPLICADO', mensaje: 'Ya existe un registro con esos datos' };
    case '23503': // FOREIGN KEY
      return { status: HttpStatus.CONFLICT, codigo: 'REFERENCIA', mensaje: 'El registro está relacionado con otros datos' };
    case '23502': // NOT NULL
      return { status: HttpStatus.BAD_REQUEST, codigo: 'VALIDACION', mensaje: 'Falta un dato obligatorio' };
    default:
      return inesperado();
  }
}

/** Con @prisma/adapter-pg, el SQLSTATE y el mensaje original vienen en meta.driverAdapterError.cause. */
function datosPostgres(e: Prisma.PrismaClientKnownRequestError): { sqlstate?: string; mensaje: string } {
  const causa = (e.meta?.driverAdapterError as { cause?: { originalCode?: string; originalMessage?: string } })
    ?.cause;
  return { sqlstate: causa?.originalCode, mensaje: causa?.originalMessage ?? e.message };
}

function inesperado(): ErrorTraducido {
  return { status: 500, codigo: 'INTERNO', mensaje: 'Ocurrió un error inesperado', inesperado: true };
}
