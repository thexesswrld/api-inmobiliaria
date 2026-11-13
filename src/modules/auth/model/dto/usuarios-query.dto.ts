import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';

/** GET /usuarios?pagina=1&porPagina=20&buscar=perez */
export const UsuariosQuerySchema = PaginacionSchema.extend({
  buscar: z.string().trim().min(1).max(100).optional(),
});

export type UsuariosQuery = z.infer<typeof UsuariosQuerySchema>;
