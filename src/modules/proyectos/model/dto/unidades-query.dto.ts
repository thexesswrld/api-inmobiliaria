import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /unidades?pagina=1&porPagina=20&idProyecto=3&idSector=12&estado=DISPONIBLE&tipo=LOTE */
export const UnidadesQuerySchema = PaginacionSchema.extend({
  idProyecto: IdSchema.optional().describe('Solo unidades de este proyecto'),
  idSector: IdSchema.optional().describe('Solo unidades de este sector'),
  estado: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de ESTADO_UNIDAD: DISPONIBLE, SEPARADO, VENDIDO, ENTREGADO, BLOQUEADO'),
  tipo: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de TIPO_UNIDAD: LOTE, DEPARTAMENTO, CASA, OFICINA, LOCAL'),
  buscar: z.string().trim().min(1).max(100).optional().describe('Filtra por nombre de la unidad'),
});

export type UnidadesQuery = z.infer<typeof UnidadesQuerySchema>;

/** PATCH /unidades/:id/estado */
export const CambiarEstadoUnidadSchema = z.object({
  estado: z
    .enum(['DISPONIBLE', 'BLOQUEADO'])
    .describe('Solo alterna DISPONIBLE ↔ BLOQUEADO; los demás estados los pone la venta'),
});

export type CambiarEstadoUnidadDto = z.infer<typeof CambiarEstadoUnidadSchema>;
