import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { FechaSchema, IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /pagos?pagina=1&porPagina=20&estado=REGISTRADO&idVenta=12 */
export const PagosQuerySchema = PaginacionSchema.extend({
  estado: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de ESTADO_PAGO: REGISTRADO, VALIDADO, RECHAZADO o ANULADO'),
  medioPago: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de MEDIO_PAGO: EFECTIVO, TRANSFERENCIA, DEPOSITO, TARJETA, BILLETERA o CHEQUE'),
  idVenta: IdSchema.optional().describe('Solo pagos de esta venta'),
  idCliente: IdSchema.optional().describe('Solo pagos de este cliente'),
  desde: FechaSchema.optional().describe('Fecha de pago desde (AAAA-MM-DD)'),
  hasta: FechaSchema.optional().describe('Fecha de pago hasta (AAAA-MM-DD)'),
  buscar: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Busca por número de operación, código de venta, nombre o documento del cliente'),
});

export type PagosQuery = z.infer<typeof PagosQuerySchema>;
