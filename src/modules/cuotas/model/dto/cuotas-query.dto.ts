import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { FechaSchema, IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /cuotas?pagina=1&porPagina=20&estado=VENCIDA&idVenta=12 */
export const CuotasQuerySchema = PaginacionSchema.extend({
  estado: z
    .enum(['PENDIENTE', 'PAGO_PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA'])
    .optional()
    .describe('Estado real calculado por v_cuota_estado'),
  tipoCuota: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de TIPO_CUOTA: SEPARACION, INICIAL, FINANCIADA o MORA'),
  idVenta: IdSchema.optional().describe('Solo cuotas de esta venta'),
  idCliente: IdSchema.optional().describe('Solo cuotas de este cliente'),
  vencidas: z
    .enum(['true', 'false'])
    .transform((valor) => valor === 'true')
    .optional()
    .describe('true = solo cuotas con días de atraso; false = solo cuotas al día'),
  desde: FechaSchema.optional().describe('Vencimiento desde (AAAA-MM-DD)'),
  hasta: FechaSchema.optional().describe('Vencimiento hasta (AAAA-MM-DD)'),
  buscar: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Busca por código de venta, nombre o documento del cliente'),
});

export type CuotasQuery = z.infer<typeof CuotasQuerySchema>;
