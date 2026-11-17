import { z } from 'zod';

const FechaHoraSchema = z
  .string()
  .trim()
  .min(10)
  .max(40)
  .refine((valor) => !Number.isNaN(Date.parse(valor)), 'Use una fecha y hora ISO 8601');

/** PATCH /comprobantes/:id/sunat — respuesta del envío a SUNAT u OSE. */
export const ActualizarSunatSchema = z.object({
  estado: z
    .enum(['ENVIADO', 'ACEPTADO', 'OBSERVADO', 'RECHAZADO', 'BAJA'])
    .describe('Estado del comprobante ante SUNAT u OSE'),
  hashCpe: z.string().trim().min(1).max(100).optional().describe('Hash del comprobante electrónico'),
  urlPdf: z.string().trim().min(1).max(500).optional().describe('URL del PDF generado'),
  urlXml: z.string().trim().min(1).max(500).optional().describe('URL del XML firmado'),
  urlCdr: z.string().trim().min(1).max(500).optional().describe('URL de la constancia de recepción (CDR)'),
  fechaEnvioSunat: FechaHoraSchema.optional().describe(
    'Fecha y hora ISO 8601 del envío; por defecto, la hora del servidor cuando pasa a ENVIADO',
  ),
  mensajeSunat: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .optional()
    .describe('Respuesta o descripción del error devuelto por SUNAT'),
});

export type ActualizarSunatDto = z.infer<typeof ActualizarSunatSchema>;
