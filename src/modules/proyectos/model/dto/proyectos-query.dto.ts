import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /proyectos?pagina=1&porPagina=20&buscar=residencial&idEmpresa=1&tipo=MULTIFAMILIAR */
export const ProyectosQuerySchema = PaginacionSchema.extend({
  buscar: z.string().trim().min(1).max(100).optional().describe('Filtra por nombre del proyecto'),
  idEmpresa: IdSchema.optional().describe('Solo proyectos de esta empresa'),
  tipo: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de TIPO_PROYECTO: LOTIZACION, MULTIFAMILIAR, CONDOMINIO'),
});

export type ProyectosQuery = z.infer<typeof ProyectosQuerySchema>;
