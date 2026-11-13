import { applyDecorators, createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ApiExtension, ApiForbiddenResponse, ApiSecurity } from '@nestjs/swagger';
import type { Permiso } from './permisos-banderas.js';
import type { RequestConUsuario, UsuarioAutenticado } from './usuario-autenticado.js';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const PERMISOS_KEY = 'auth:permisos';

/*El endpoint no pide token. Sin este decorador, todo endpoint exige sesión. */
export const IsPublic = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    ApiSecurity({}), // Swagger: este endpoint no necesita token
  );

/* El usuario debe tener TODOS los permisos indicados. Se puede usar en el método o en la clase. */
export const Permisos = (...permisos: Permiso[]) =>
  applyDecorators(
    SetMetadata(PERMISOS_KEY, permisos),
    // Swagger: muestra qué permisos pide el endpoint
    ApiExtension('x-permisos', permisos),
    ApiForbiddenResponse({ description: `Requiere los permisos: ${permisos.join(', ')}` }),
  );

/* Inyecta el usuario de la sesión: `perfil(@UsuarioActual() u: UsuarioAutenticado)`. */
export const UsuarioActual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioAutenticado | undefined =>
    ctx.switchToHttp().getRequest<RequestConUsuario>().usuario,
);
