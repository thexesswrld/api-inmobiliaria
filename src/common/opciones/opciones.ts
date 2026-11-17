import type { Prisma } from '../../generated/prisma/client.js';

/** Lo que la API muestra de una opción de lista: siempre codigo + nombre. */
export interface OpcionRespuesta {
  codigo: string;
  nombre: string;
}

export const opcionSelect = { codigo: true, nombre: true } satisfies Prisma.OpcionListaSelect;

export type OpcionSeleccionada = Prisma.OpcionListaGetPayload<{ select: typeof opcionSelect }>;

export function toOpcion(opcion: OpcionSeleccionada): OpcionRespuesta {
  return { codigo: opcion.codigo, nombre: opcion.nombre };
}

/** Cualquier cliente de Prisma (normal o de transacción) sirve para resolver opciones. */
export type DbOpciones = Pick<Prisma.TransactionClient, 'opcionLista'>;

/**
 * Trae el id de una opción a partir de los códigos de lista y opción:
 * `idOpcion(tx, 'ESTADO_VENTA', 'VIGENTE')`.
 *
 * Es el equivalente de `fn_opcion()` de la base. La API trabaja con códigos,
 * nunca con ids numéricos escritos a mano.
 */
export async function idOpcion(db: DbOpciones, lista: string, codigo: string): Promise<number> {
  const opcion = await db.opcionLista.findFirst({
    where: { codigo, lista: { codigo: lista } },
    select: { id: true },
  });
  if (!opcion) {
    throw new Error(`No existe la opción ${lista}.${codigo}. Revise gen_listas_de_opciones (database/esquema/02_datos_iniciales.sql).`);
  }
  return opcion.id;
}

/** Varias opciones de la misma lista en una sola consulta. */
export async function idsOpciones(
  db: DbOpciones,
  lista: string,
  codigos: readonly string[],
): Promise<Map<string, number>> {
  const filas = await db.opcionLista.findMany({
    where: { codigo: { in: [...codigos] }, lista: { codigo: lista } },
    select: { codigo: true, id: true },
  });
  const mapa = new Map(filas.map((f) => [f.codigo, f.id] as const));
  for (const codigo of codigos) {
    if (!mapa.has(codigo)) {
      throw new Error(`No existe la opción ${lista}.${codigo}. Revise gen_listas_de_opciones (database/esquema/02_datos_iniciales.sql).`);
    }
  }
  return mapa;
}
