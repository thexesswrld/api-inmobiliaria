import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { FechaSchema, IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /ventas?pagina=1&porPagina=20&estado=VIGENTE&idCliente=5&buscar=V-2026 */
export const VentasQuerySchema = PaginacionSchema.extend({
  estado: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de ESTADO_VENTA: SEPARADA, VIGENTE, CANCELADA, ENTREGADA, ANULADA, RESUELTA'),
  idCliente: IdSchema.optional().describe('Solo ventas de este cliente'),
  idTrabajador: IdSchema.optional().describe('Solo ventas de este trabajador'),
  buscar: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Busca por código de venta, nombre o documento del cliente'),
  desde: FechaSchema.optional().describe('Fecha de venta desde (AAAA-MM-DD)'),
  hasta: FechaSchema.optional().describe('Fecha de venta hasta (AAAA-MM-DD)'),
});

export type VentasQuery = z.infer<typeof VentasQuerySchema>;
