import { z } from 'zod';
import { FechaSchema, IdSchema, MontoSchema, MontoPositivoSchema } from '../../../../common/validacion/esquemas.js';

const UnidadVentaSchema = z.object({
  idUnidad: IdSchema.describe('Unidad a vender o separar'),
  precioLista: MontoSchema.optional().describe('Si se omite, se usa pro_unidad.precio'),
  descuento: MontoSchema.default(0).describe('Descuento sobre el precio de lista de la unidad'),
});

/** POST /ventas — separar una unidad o registrar una venta directa. */
export const CrearVentaSchema = z
  .object({
    idCliente: IdSchema.describe('Cliente que compra o separa'),
    idTrabajador: IdSchema.optional().describe(
      'Si se omite, se usa la ficha de trabajador del usuario de la sesión',
    ),
    fechaVenta: FechaSchema.optional().describe('Fecha de la venta; por defecto, hoy'),
    tipoMoneda: z.enum(['PEN', 'USD']).default('PEN').describe('Moneda de la venta'),
    unidades: z
      .array(UnidadVentaSchema)
      .min(1)
      .max(20)
      .describe('Una o más unidades en la misma venta'),
    modalidad: z
      .enum(['SEPARACION', 'DIRECTA'])
      .default('SEPARACION')
      .describe(
        'SEPARACION: venta SEPARADA y cuota de separación. DIRECTA: venta VIGENTE con cronograma completo',
      ),
    montoSeparacion: MontoPositivoSchema.optional().describe(
      'Obligatorio en modalidad SEPARACION; debe ser mayor que 0',
    ),
    montoInicial: MontoSchema.optional().describe('Obligatorio en modalidad DIRECTA'),
    numeroCuotas: z.coerce
      .number()
      .int()
      .min(0)
      .max(240)
      .optional()
      .describe('Obligatorio en modalidad DIRECTA (0 si no hay financiamiento)'),
    fechaPrimeraCuota: FechaSchema.optional().describe(
      'Vencimiento de la primera cuota mensual (AAAA-MM-DD)',
    ),
  })
  .superRefine((v, ctx) => {
    if (v.modalidad === 'SEPARACION' && v.montoSeparacion === undefined) {
      ctx.addIssue({ code: 'custom', message: 'Indique montoSeparacion para separar la unidad', path: ['montoSeparacion'] });
    }
    if (v.modalidad === 'DIRECTA') {
      if (v.montoInicial === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Indique montoInicial para una venta directa', path: ['montoInicial'] });
      }
      if (v.numeroCuotas === undefined) {
        ctx.addIssue({ code: 'custom', message: 'Indique numeroCuotas para una venta directa', path: ['numeroCuotas'] });
      }
    }
  });

export type CrearVentaDto = z.infer<typeof CrearVentaSchema>;
