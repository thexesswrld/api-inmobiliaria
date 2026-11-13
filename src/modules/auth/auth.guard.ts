import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, PERMISOS_KEY } from '../../common/auth/decorators.js';
import type { Permiso } from '../../common/auth/permisos-banderas.js';
import type { RequestConUsuario } from '../../common/auth/usuario-autenticado.js';
import { tieneTodos } from './logic/permisos.logic.js';
import { extraerBearer } from './logic/token.logic.js';
import { SesionesService } from './service/sesiones.service.js';

/**
 * Guard global (registrado como APP_GUARD en AuthModule):
 *   @IsPublic()        → pasa sin token
 *   sin token válido   → 401
 *   @Permisos(...)     → exige todos; si falta uno → 403
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sesiones: SesionesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<RequestConUsuario>();
    const token = extraerBearer(req.headers.authorization);
    if (!token) throw new UnauthorizedException('Falta el token de acceso');

    const usuario = await this.sesiones.validar(token);
    if (!usuario) throw new UnauthorizedException('La sesión no es válida o ya expiró');
    req.usuario = usuario;

    const requeridos = this.reflector.getAllAndOverride<Permiso[]>(PERMISOS_KEY, objetivos) ?? [];
    if (!tieneTodos(requeridos, usuario.permisos)) {
      throw new ForbiddenException('No tiene permiso para realizar esta acción');
    }
    return true;
  }
}
