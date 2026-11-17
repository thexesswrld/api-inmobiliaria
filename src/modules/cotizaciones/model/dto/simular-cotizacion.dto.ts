import { z } from 'zod';
import { FechaSchema, IdSchema, MontoSchema } from '../../../../common/validacion/esquemas.js';

/** POST /cotizaciones/simular */
export const SimularCotizacionSchema = z
  .object({
    idUnidad: IdSchema.optional().describe(
      'Usa el precio de lista de esta unidad; se valida que exista',
    ),
    precioLista: MontoSchema.optional().describe(
      'Alternativa a idUnidad: cotizar con un precio escrito a mano',
    ),
    descuento: MontoSchema.default(0).describe('Descuento sobre el precio de lista'),
    montoInicial: MontoSchema.default(0).describe('Cuota inicial; incluye la separación'),
    numeroCuotas: z.coerce
      .number()
      .int()
      .min(0)
      .max(240)
      .default(0)
      .describe('Cuotas mensuales a generar (0 = sin financiamiento)'),
    montoSeparacion: MontoSchema.default(0).describe(
      'Separación ya pactada; se descuenta de la cuota inicial',
    ),
    incluirSeparacion: z
      .boolean()
      .default(true)
      .describe('Si es true, la separación aparece como primera cuota del cronograma'),
    fechaPrimeraCuota: FechaSchema.optional().describe(
      'Vencimiento de la primera cuota mensual (AAAA-MM-DD)',
    ),
  })
  .refine((v) => v.idUnidad !== undefined || v.precioLista !== undefined, {
    message: 'Indique idUnidad o precioLista',
    path: ['precioLista'],
  });

export type SimularCotizacionDto = z.infer<typeof SimularCotizacionSchema>;
