import { z } from 'zod';

/** Fecha sin hora: "2026-01-31". */
export const FechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use el formato AAAA-MM-DD')
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00.000Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
  }, 'La fecha no existe en el calendario');

/** Monto en la moneda de la venta. Se redondea a centavos en el service. */
export const MontoSchema = z.coerce.number().finite().min(0).max(999_999_999_999.99);

/** Monto estrictamente mayor que cero. */
export const MontoPositivoSchema = MontoSchema.refine((valor) => valor > 0, 'El monto debe ser mayor que 0');

/** Id de una fila (entero positivo). */
export const IdSchema = z.coerce.number().int().positive();
