import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { envolver } from '../respuesta/respuesta.interceptor.js';
import { Paginado } from '../respuesta/respuesta.types.js';
import { traducirError } from './traducir-error.js';

const errorPrisma = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test', meta });

const errorPostgres = (sqlstate: string, mensaje: string) =>
  errorPrisma('P2039', { driverAdapterError: { cause: { originalCode: sqlstate, originalMessage: mensaje } } });

describe('traducirError', () => {
  it('excepciones HTTP de Nest', () => {
    expect(traducirError(new NotFoundException('Usuario no encontrado'))).toEqual({
      status: 404,
      codigo: 'NO_ENCONTRADO',
      mensaje: 'Usuario no encontrado',
    });
    expect(traducirError(new ForbiddenException()).codigo).toBe('SIN_PERMISO');
  });

  it('errores de validación van en detalles', () => {
    const r = traducirError(new BadRequestException(['username: obligatorio']));
    expect(r).toMatchObject({ status: 400, codigo: 'VALIDACION', detalles: ['username: obligatorio'] });
  });

  it('errores conocidos de Prisma', () => {
    expect(traducirError(errorPrisma('P2002', { target: ['username'] }))).toMatchObject({
      status: 409,
      codigo: 'DUPLICADO',
      detalles: ['username'],
    });
    expect(traducirError(errorPrisma('P2025')).status).toBe(404);
  });

  it('RAISE EXCEPTION de un trigger → 422 con el mensaje del negocio', () => {
    const r = traducirError(errorPostgres('P0001', 'La unidad "A-1" está BLOQUEADA y no se puede vender'));
    expect(r).toEqual({
      status: 422,
      codigo: 'REGLA_NEGOCIO',
      mensaje: 'La unidad "A-1" está BLOQUEADA y no se puede vender',
    });
  });

  it('cualquier otro error → 500 sin detalles técnicos', () => {
    expect(traducirError(new Error('conexión perdida'))).toEqual({
      status: 500,
      codigo: 'INTERNO',
      mensaje: 'Ocurrió un error inesperado',
      inesperado: true,
    });
  });
});

describe('envolver', () => {
  it('envuelve datos y paginados', () => {
    expect(envolver({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
    expect(envolver(undefined)).toEqual({ ok: true, data: null });
    const meta = { total: 1, pagina: 1, porPagina: 20, totalPaginas: 1 };
    expect(envolver(new Paginado([1], meta))).toEqual({ ok: true, data: [1], meta });
  });
});
