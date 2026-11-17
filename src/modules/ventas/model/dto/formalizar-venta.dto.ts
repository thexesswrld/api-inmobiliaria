import { z } from 'zod';
import { FechaSchema, MontoSchema, MontoPositivoSchema } from '../../../../common/validacion/esquemas.js';

/** PATCH /ventas/:id/formalizar */
export const FormalizarVentaSchema = z.object({
  montoFinal: MontoPositivoSchema.describe(
    'Precio final pactado; el descuento se calcula contra el monto bruto de la venta',
  ),
  montoInicial: MontoSchema.describe(
    'Cuota inicial acordada; no puede ser menor que la separación ya pagada',
  ),
  numeroCuotas: z.coerce
    .number()
    .int()
    .min(0)
    .max(240)
    .describe('Cuotas mensuales a generar (0 si no hay monto financiado)'),
  fechaPrimeraCuota: FechaSchema.optional().describe(
    'Vencimiento de la primera cuota mensual (AAAA-MM-DD); por defecto, dentro de un mes',
  ),
  fechaInicial: FechaSchema.optional().describe('Vencimiento de la cuota inicial; por defecto, hoy'),
});

export type FormalizarVentaDto = z.infer<typeof FormalizarVentaSchema>;
