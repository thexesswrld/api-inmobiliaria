import { z } from 'zod';

/** PATCH /pagos/:id/estado */
export const CambiarEstadoPagoSchema = z
  .object({
    estado: z
      .enum(['VALIDADO', 'RECHAZADO', 'ANULADO'])
      .describe('Estado destino del pago. VALIDADO aplica el pago a las cuotas; RECHAZADO y ANULADO lo dejan sin efecto'),
    motivoAnulacion: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe('Motivo del rechazo o anulación; obligatorio cuando el estado no es VALIDADO'),
  })
  .superRefine((v, ctx) => {
    if (v.estado !== 'VALIDADO' && v.motivoAnulacion === undefined) {
      ctx.addIssue({
        code: 'custom',
        message: `Indique motivoAnulacion para marcar el pago como ${v.estado}`,
        path: ['motivoAnulacion'],
      });
    }
  });

export type CambiarEstadoPagoDto = z.infer<typeof CambiarEstadoPagoSchema>;
