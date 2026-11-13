import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { Paginado, type RespuestaOk } from './respuesta.types.js';
import { SIN_ENVOLTURA_KEY } from './sin-envoltura.decorator.js';

/** Envuelve toda respuesta exitosa en { ok: true, data, meta? }. */
@Injectable()
export class RespuestaInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const sinEnvoltura = this.reflector.getAllAndOverride<boolean>(SIN_ENVOLTURA_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (sinEnvoltura) return next.handle();

    return next.handle().pipe(map((res: unknown) => envolver(res)));
  }
}

export function envolver(res: unknown): RespuestaOk<unknown> {
  if (res instanceof Paginado) return { ok: true, data: res.items, meta: res.meta };
  return { ok: true, data: res ?? null };
}
