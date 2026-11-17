import { z } from 'zod';
import { FechaSchema, IdSchema } from '../../../../common/validacion/esquemas.js';

/** POST /pagos/:id/comprobante */
export const EmitirComprobanteSchema = z.object({
  idSerie: IdSchema.describe(
    'Serie activa de la empresa; define el tipo de comprobante (factura, boleta, nota)',
  ),
  fechaEmision: FechaSchema.optional().describe('Fecha de emisión (AAAA-MM-DD); por defecto, hoy'),
  tipoCambio: z.coerce
    .number()
    .positive()
    .max(999_999.9999)
    .optional()
    .describe('Tipo de cambio; solo si la moneda del comprobante difiere de la del pago'),
  idComprobanteReferencia: IdSchema.optional().describe(
    'Comprobante que modifica la nota; obligatorio para notas de crédito o débito',
  ),
  glosa: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .describe('Texto libre que se imprime en el comprobante'),
  observaciones: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .describe('Observaciones internas, no se imprimen'),
});

export type EmitirComprobanteDto = z.infer<typeof EmitirComprobanteSchema>;
