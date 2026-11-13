import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { RespuestaError } from '../respuesta/respuesta.types.js';
import { traducirError } from './traducir-error.js';

/** Toda excepción sale como { ok: false, error: { codigo, mensaje, detalles? } }. */
@Catch()
export class ErroresFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, codigo, mensaje, detalles, inesperado } = traducirError(e);

    // El detalle técnico va al log, nunca al cliente.
    if (inesperado) this.logger.error(e instanceof Error ? e.stack : e);

    const cuerpo: RespuestaError = { ok: false, error: { codigo, mensaje, ...(detalles ? { detalles } : {}) } };
    res.status(status).json(cuerpo);
  }
}
