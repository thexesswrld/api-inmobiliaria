export const PERMISOS = {
  // auth
  LISTAR_USUARIOS: 'auth.usuario.listar',
  VER_USUARIO: 'auth.usuario.ver',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];
