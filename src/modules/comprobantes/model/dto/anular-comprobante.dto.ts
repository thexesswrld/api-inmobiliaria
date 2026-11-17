import { z } from 'zod';

/** PATCH /comprobantes/:id/anular */
export const AnularComprobanteSchema = z.object({
  motivoAnulacion: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe('Motivo por el que se anula el comprobante; queda registrado en el historial'),
});

export type AnularComprobanteDto = z.infer<typeof AnularComprobanteSchema>;
