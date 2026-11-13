import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { nombreCompleto } from '../model/usuario.mapper.js';
import type { UsuarioConAccesos } from '../model/usuario.select.js';

/** Códigos de los roles activos del usuario. */
export function extraerRoles(u: Pick<UsuarioConAccesos, 'roles'>): string[] {
  return u.roles.map(({ rol }) => rol.codigo);
}

/** Une los permisos de todos los roles (sin repetidos). */
export function extraerPermisos(u: Pick<UsuarioConAccesos, 'roles'>): Set<string> {
  return new Set(u.roles.flatMap(({ rol }) => rol.permisos.map(({ permiso }) => permiso.codigo)));
}

/** true si el usuario tiene TODOS los permisos requeridos (sin requeridos → true). */
export function tieneTodos(requeridos: readonly string[], permisos: ReadonlySet<string>): boolean {
  return requeridos.every((p) => permisos.has(p));
}

/** Permisos declarados en permisos-banderas.ts que no existen en auth_permiso. */
export function permisosFaltantes(declarados: readonly string[], enBaseDeDatos: readonly string[]): string[] {
  const existentes = new Set(enBaseDeDatos);
  return declarados.filter((p) => !existentes.has(p));
}

/** Arma lo que el guard deja en request.usuario. */
export function aUsuarioAutenticado(u: UsuarioConAccesos, idSesion: number): UsuarioAutenticado {
  return {
    id: u.id,
    username: u.username,
    nombreCompleto: nombreCompleto(u.persona),
    idSesion,
    roles: extraerRoles(u),
    permisos: extraerPermisos(u),
  };
}
