import { z } from 'zod';
import { Paginado } from '../respuesta/respuesta.types.js';

/** Query string estándar de los listados: ?pagina=1&porPagina=20 */
export const PaginacionSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginacionQuery = z.infer<typeof PaginacionSchema>;

/** Calcula skip/take para Prisma. */
export function rango({ pagina, porPagina }: PaginacionQuery) {
  return { skip: (pagina - 1) * porPagina, take: porPagina };
}

/** Arma el resultado paginado que el interceptor convierte en { data, meta }. */
export function paginado<T>(items: T[], total: number, { pagina, porPagina }: PaginacionQuery): Paginado<T> {
  return new Paginado(items, { total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) });
}
