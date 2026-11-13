import { compare, hash } from 'bcryptjs';

const COSTO = 10;

// Hash que nunca coincide. Se usa cuando el usuario no existe, para que la
// respuesta tarde lo mismo y no se pueda adivinar qué usuarios existen.
let hashFalso: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return hash(password, COSTO);
}

/**
 * Compara la contraseña con el hash guardado (bcrypt; también acepta los
 * hashes `crypt(..., gen_salt('bf'))` de pgcrypto). Si no hay hash, compara
 * igual contra uno falso y devuelve false.
 */
export async function verificarPassword(password: string, hashGuardado: string | null): Promise<boolean> {
  if (hashGuardado) return compare(password, hashGuardado);
  hashFalso ??= hash('nunca-coincide', COSTO);
  await compare(password, await hashFalso);
  return false;
}
