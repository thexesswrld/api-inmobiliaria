export interface SectorPlano {
  id: number;
  idSectorPadre: number | null;
  orden: number;
  nombre: string;
}

export type SectorConHijos<T> = T & { hijos: SectorConHijos<T>[] };

/**
 * Convierte la lista plana de sectores (con id_sector_padre) en un árbol.
 * Los sectores cuyo padre no vino en la lista se tratan como raíces.
 */
export function armarArbolSectores<T extends SectorPlano>(sectores: readonly T[]): SectorConHijos<T>[] {
  const nodos = new Map<number, SectorConHijos<T>>();
  for (const sector of sectores) nodos.set(sector.id, { ...sector, hijos: [] });

  const raices: SectorConHijos<T>[] = [];
  for (const nodo of nodos.values()) {
    const padre = nodo.idSectorPadre === null ? undefined : nodos.get(nodo.idSectorPadre);
    if (padre && padre.id !== nodo.id) padre.hijos.push(nodo);
    else raices.push(nodo);
  }

  ordenar(raices);
  return raices;
}

function ordenar<T extends SectorPlano>(lista: SectorConHijos<T>[]): void {
  lista.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre) || a.id - b.id);
  for (const nodo of lista) ordenar(nodo.hijos);
}
