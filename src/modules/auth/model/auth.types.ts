/** Contenido del JWT. Va firmado, pero NO cifrado: nunca poner datos sensibles. */
export interface JwtPayload {
  sub: number; // id del usuario
  username: string;
  jti: string; // id único del token: dos logins nunca dan el mismo token
}

/** Datos del cliente que se guardan en auth_sesiones. */
export interface ContextoCliente {
  ip?: string;
  userAgent?: string;
}
