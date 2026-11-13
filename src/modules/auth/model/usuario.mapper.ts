import { ESTADO_ACTIVO } from '../../../common/estado.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { LoginRespuesta, UsuarioRespuesta, UsuarioSesionRespuesta } from './respuestas.js';
import type { PersonaNombre, UsuarioDetalle } from './usuario.select.js';

// Mappers: convierten lo que devuelve Prisma en lo que ve el frontend.
// Aquí se decide QUÉ campos salen (nunca password_hash ni auditoría).

export function nombreCompleto(p: PersonaNombre): string {
  return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
}

export function toUsuarioSesionRespuesta(u: UsuarioAutenticado): UsuarioSesionRespuesta {
  return {
    id: u.id,
    username: u.username,
    nombreCompleto: u.nombreCompleto,
    roles: u.roles,
    permisos: [...u.permisos].sort(),
  };
}

export function toLoginRespuesta(token: string, expiraEn: string, u: UsuarioAutenticado): LoginRespuesta {
  return { token, tipo: 'Bearer', expiraEn, usuario: toUsuarioSesionRespuesta(u) };
}

export function toUsuarioRespuesta(u: UsuarioDetalle): UsuarioRespuesta {
  return {
    id: u.id,
    username: u.username,
    nombreCompleto: nombreCompleto(u.persona),
    correo: u.persona.correo,
    activo: u.estado === ESTADO_ACTIVO,
    roles: u.roles.map(({ rol }) => ({ codigo: rol.codigo, nombre: rol.nombre })),
    fechaCreacion: u.fechaCreacion.toISOString(),
  };
}
