import { z } from 'zod';
import { PaginacionSchema } from '../../../../common/paginacion/paginacion.js';
import { FechaSchema, IdSchema } from '../../../../common/validacion/esquemas.js';

/** GET /comprobantes?pagina=1&porPagina=20&estado=EMITIDO&estadoSunat=PENDIENTE */
export const ComprobantesQuerySchema = PaginacionSchema.extend({
  estado: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de ESTADO_COMPROBANTE: EMITIDO, ANULADO o RECHAZADO'),
  estadoSunat: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de ESTADO_SUNAT: PENDIENTE, ENVIADO, ACEPTADO, OBSERVADO, RECHAZADO o BAJA'),
  tipoComprobante: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe('Código de TIPO_COMPROBANTE: FACTURA, BOLETA, NOTA_CREDITO, NOTA_DEBITO'),
  idCliente: IdSchema.optional().describe('Solo comprobantes de este cliente'),
  idPago: IdSchema.optional().describe('Solo comprobantes de este pago'),
  serie: z.string().trim().min(1).max(4).optional().describe('Serie exacta, por ejemplo B001'),
  desde: FechaSchema.optional().describe('Fecha de emisión desde (AAAA-MM-DD)'),
  hasta: FechaSchema.optional().describe('Fecha de emisión hasta (AAAA-MM-DD)'),
  buscar: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Acepta "B001-00000124", un número suelto, la serie o el documento del cliente'),
});

export type ComprobantesQuery = z.infer<typeof ComprobantesQuerySchema>;
