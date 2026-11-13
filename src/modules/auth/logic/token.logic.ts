import { createHash, randomUUID } from 'node:crypto';

/** SHA-256 del token. Es lo que se guarda en auth_sesiones.token_hash (nunca el token). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function nuevoJti(): string {
  return randomUUID();
}

/** "Bearer abc.def.ghi" → "abc.def.ghi". Cualquier otra cosa → null. */
export function extraerBearer(header: string | undefined): string | null {
  const [tipo, token] = header?.split(' ') ?? [];
  return tipo?.toLowerCase() === 'bearer' && token ? token : null;
}
