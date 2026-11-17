import { z } from 'zod';
import {
  FechaSchema,
  IdSchema,
  MontoPositivoSchema,
} from '../../../../common/validacion/esquemas.js';

const AplicacionPagoSchema = z.object({
  idCuota: IdSchema.describe('Cuota de la venta que recibe el dinero'),
  monto: MontoPositivoSchema.describe('Monto aplicado a esa cuota, en la moneda de la venta'),
  aplicaA: z
    .enum(['CAPITAL', 'MORA'])
    .default('CAPITAL')
    .describe('Concepto que cubre el monto: CAPITAL de la cuota o MORA acumulada'),
});

/**
 * POST /ventas/:id/pagos
 * Los topes del reparto (monto del pago, saldo y mora de cada cuota) los
 * valida la base en `trg_pago_aplicacion_cuota`; aquí solo se valida la forma.
 */
export const CrearPagoSchema = z
  .object({
    fechaPago: FechaSchema.optional().describe('Fecha del pago (AAAA-MM-DD); por defecto, hoy'),
    monto: MontoPositivoSchema.describe('Monto total recibido, mayor que 0'),
    tipoMoneda: z
      .enum(['PEN', 'USD'])
      .default('PEN')
      .describe('Moneda del pago; si difiere de la moneda de la venta, envíe tipoCambio'),
    tipoCambio: z.coerce
      .number()
      .positive()
      .max(999_999.9999)
      .optional()
      .describe('Tipo de cambio aplicado; obligatorio si la moneda difiere de la de la venta'),
    medioPago: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .describe('Código de MEDIO_PAGO: EFECTIVO, TRANSFERENCIA, DEPOSITO, TARJETA, BILLETERA o CHEQUE'),
    idCuentaBancaria: IdSchema.optional().describe(
      'Cuenta bancaria de la empresa donde ingresó el dinero (opcional)',
    ),
    numeroOperacion: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .optional()
      .describe('Número de operación o referencia del banco'),
    ruta: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .describe('Ruta o URL del voucher o comprobante del pago'),
    aplicaciones: z
      .array(AplicacionPagoSchema)
      .max(50)
      .default([])
      .describe(
        'Reparto del pago entre cuotas. Puede quedar vacío: el saldo no aplicado queda a favor del cliente',
      ),
  })
  .superRefine((v, ctx) => {
    const vistas = new Set<string>();
    v.aplicaciones.forEach((a, i) => {
      const clave = `${a.idCuota}:${a.aplicaA}`;
      if (vistas.has(clave)) {
        ctx.addIssue({
          code: 'custom',
          message: 'No repita la misma cuota y concepto en una aplicación',
          path: ['aplicaciones', i, 'idCuota'],
        });
      }
      vistas.add(clave);
    });
  });

export type CrearPagoDto = z.infer<typeof CrearPagoSchema>;
