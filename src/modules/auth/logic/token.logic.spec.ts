import { extraerBearer, hashToken } from './token.logic.js';
import { hashPassword, verificarPassword } from './password.logic.js';

describe('token.logic', () => {
  it('extrae el token del header Authorization', () => {
    expect(extraerBearer('Bearer abc.def')).toBe('abc.def');
    expect(extraerBearer('bearer abc')).toBe('abc');
    expect(extraerBearer('Basic abc')).toBeNull();
    expect(extraerBearer('Bearer')).toBeNull();
    expect(extraerBearer(undefined)).toBeNull();
  });

  it('hashToken es SHA-256 en hex (64 caracteres) y estable', () => {
    expect(hashToken('x')).toHaveLength(64);
    expect(hashToken('x')).toBe(hashToken('x'));
    expect(hashToken('x')).not.toBe(hashToken('y'));
  });
});

describe('password.logic', () => {
  it('verifica una contraseña contra su hash', async () => {
    const hash = await hashPassword('secreto');
    expect(await verificarPassword('secreto', hash)).toBe(true);
    expect(await verificarPassword('otro', hash)).toBe(false);
  });

  it('sin hash (usuario inexistente) siempre es false', async () => {
    expect(await verificarPassword('secreto', null)).toBe(false);
  });
});
