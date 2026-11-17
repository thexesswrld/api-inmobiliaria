import { describe, expect, it } from 'vitest';
import { armarArbolSectores } from './arbol-sectores.logic.js';

interface SectorPrueba {
  id: number;
  idSectorPadre: number | null;
  orden: number;
  nombre: string;
}

const sector = (id: number, padre: number | null, orden: number, nombre: string): SectorPrueba => ({
  id,
  idSectorPadre: padre,
  orden,
  nombre,
});

describe('armarArbolSectores', () => {
  it('anida los hijos bajo su padre y ordena por orden', () => {
    const arbol = armarArbolSectores([
      sector(1, null, 2, 'Etapa II'),
      sector(2, 1, 2, 'Manzana B'),
      sector(3, 1, 1, 'Manzana A'),
      sector(4, 3, 1, 'Lote 1'),
      sector(5, null, 1, 'Etapa I'),
    ]);

    expect(arbol.map((s) => s.id)).toEqual([5, 1]);
    expect(arbol[1]?.hijos.map((s) => s.id)).toEqual([3, 2]);
    expect(arbol[1]?.hijos[0]?.hijos.map((s) => s.id)).toEqual([4]);
  });

  it('trata como raíz un sector cuyo padre no vino en la lista', () => {
    const arbol = armarArbolSectores([sector(7, 99, 1, 'Huérfano')]);
    expect(arbol.map((s) => s.id)).toEqual([7]);
  });

  it('no entra en bucle con un padre repetido', () => {
    const arbol = armarArbolSectores([sector(1, 1, 1, 'Raro')]);
    expect(arbol.map((s) => s.id)).toEqual([1]);
  });

  it('devuelve una lista vacía si no hay sectores', () => {
    expect(armarArbolSectores([])).toEqual([]);
  });
});
