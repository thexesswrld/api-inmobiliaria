import { aUsuarioAutenticado, extraerPermisos, permisosFaltantes, tieneTodos } from './permisos.logic.js';
import type { UsuarioConAccesos } from '../model/usuario.select.js';

const rol = (codigo: string, permisos: string[]) => ({
  rol: { codigo, permisos: permisos.map((p) => ({ permiso: { codigo: p } })) },
});

const usuario: UsuarioConAccesos = {
  id: 7,
  username: 'jperez',
  estado: 1,
  persona: { nombre: 'Juan', apellidoPaterno: 'Pérez', apellidoMaterno: null, correo: null },
  roles: [rol('VENDEDOR', ['a.listar', 'b.ver']), rol('CAJA', ['b.ver', 'c.crear'])],
};

describe('permisos.logic', () => {
  it('une los permisos de todos los roles sin repetidos', () => {
    expect([...extraerPermisos(usuario)].sort()).toEqual(['a.listar', 'b.ver', 'c.crear']);
  });

  it('tieneTodos exige todos los requeridos', () => {
    const permisos = new Set(['a', 'b']);
    expect(tieneTodos([], permisos)).toBe(true);
    expect(tieneTodos(['a', 'b'], permisos)).toBe(true);
    expect(tieneTodos(['a', 'x'], permisos)).toBe(false);
  });

  it('detecta permisos declarados que faltan en la BD', () => {
    expect(permisosFaltantes(['a', 'b', 'c'], ['a', 'c'])).toEqual(['b']);
  });

  it('arma el usuario autenticado', () => {
    const u = aUsuarioAutenticado(usuario, 99);
    expect(u).toMatchObject({ id: 7, username: 'jperez', nombreCompleto: 'Juan Pérez', idSesion: 99 });
    expect(u.roles).toEqual(['VENDEDOR', 'CAJA']);
  });
});
