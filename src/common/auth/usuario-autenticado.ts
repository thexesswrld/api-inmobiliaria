import type { Request } from 'express';

// Lo que el guard deja en request.usuario después de validar el token.
export interface UsuarioAutenticado {
  id: number;
  username: string;
  nombreCompleto: string;
  idSesion: number;
  roles: string[];
  permisos: ReadonlySet<string>;
}

export type RequestConUsuario = Request & { usuario?: UsuarioAutenticado };
