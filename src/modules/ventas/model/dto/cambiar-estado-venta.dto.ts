import { z } from 'zod';

/** PATCH /ventas/:id/estado */
export const CambiarEstadoVentaSchema = z.object({
  estado: z
    .enum(['CANCELADA', 'ENTREGADA', 'ANULADA', 'RESUELTA'])
    .describe('Estado destino de la venta'),
});

export type CambiarEstadoVentaDto = z.infer<typeof CambiarEstadoVentaSchema>;
