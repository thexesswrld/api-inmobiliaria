import { z } from 'zod';
import { IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /proyectos/:id/modelos?idSector=4&idUnidad=30&tipo=PLANO */
export const ModelosQuerySchema = z.object({
  idSector: IdSchema.optional().describe('Solo modelos de este sector'),
  idUnidad: IdSchema.optional().describe('Solo modelos de esta unidad'),
  tipo: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de TIPO_MODELO: IMAGEN, PLANO, RENDER, MODELO_3D, VIDEO, TOUR_360'),
});

export type ModelosQuery = z.infer<typeof ModelosQuerySchema>;
