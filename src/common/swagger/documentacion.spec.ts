import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LoginSchema } from '../../modules/auth/model/dto/login.dto.js';
import { UsuariosQuerySchema } from '../../modules/auth/model/dto/usuarios-query.dto.js';
import { ActualizarSunatSchema } from '../../modules/comprobantes/model/dto/actualizar-sunat.dto.js';
import { AnularComprobanteSchema } from '../../modules/comprobantes/model/dto/anular-comprobante.dto.js';
import { ComprobantesQuerySchema } from '../../modules/comprobantes/model/dto/comprobantes-query.dto.js';
import { EmitirComprobanteSchema } from '../../modules/comprobantes/model/dto/emitir-comprobante.dto.js';
import { SimularCotizacionSchema } from '../../modules/cotizaciones/model/dto/simular-cotizacion.dto.js';
import { CuotasQuerySchema } from '../../modules/cuotas/model/dto/cuotas-query.dto.js';
import { CambiarEstadoPagoSchema } from '../../modules/pagos/model/dto/cambiar-estado-pago.dto.js';
import { CrearPagoSchema } from '../../modules/pagos/model/dto/crear-pago.dto.js';
import { PagosQuerySchema } from '../../modules/pagos/model/dto/pagos-query.dto.js';
import { ModelosQuerySchema } from '../../modules/proyectos/model/dto/modelos-query.dto.js';
import { ProyectosQuerySchema } from '../../modules/proyectos/model/dto/proyectos-query.dto.js';
import {
  CambiarEstadoUnidadSchema,
  UnidadesQuerySchema,
} from '../../modules/proyectos/model/dto/unidades-query.dto.js';
import { CambiarEstadoVentaSchema } from '../../modules/ventas/model/dto/cambiar-estado-venta.dto.js';
import { CrearVentaSchema } from '../../modules/ventas/model/dto/crear-venta.dto.js';
import { FormalizarVentaSchema } from '../../modules/ventas/model/dto/formalizar-venta.dto.js';
import { VentasQuerySchema } from '../../modules/ventas/model/dto/ventas-query.dto.js';

/**
 * Swagger genera la documentación desde los mismos esquemas zod. Si uno no se
 * puede representar como JSON Schema, el arranque de la app falla; esta prueba
 * lo detecta antes.
 */
const ESQUEMAS: Array<[string, z.ZodType]> = [
  ['LoginSchema', LoginSchema],
  ['UsuariosQuerySchema', UsuariosQuerySchema],
  ['ProyectosQuerySchema', ProyectosQuerySchema],
  ['UnidadesQuerySchema', UnidadesQuerySchema],
  ['CambiarEstadoUnidadSchema', CambiarEstadoUnidadSchema],
  ['ModelosQuerySchema', ModelosQuerySchema],
  ['SimularCotizacionSchema', SimularCotizacionSchema],
  ['VentasQuerySchema', VentasQuerySchema],
  ['CrearVentaSchema', CrearVentaSchema],
  ['FormalizarVentaSchema', FormalizarVentaSchema],
  ['CambiarEstadoVentaSchema', CambiarEstadoVentaSchema],
  ['PagosQuerySchema', PagosQuerySchema],
  ['CrearPagoSchema', CrearPagoSchema],
  ['CambiarEstadoPagoSchema', CambiarEstadoPagoSchema],
  ['ComprobantesQuerySchema', ComprobantesQuerySchema],
  ['EmitirComprobanteSchema', EmitirComprobanteSchema],
  ['AnularComprobanteSchema', AnularComprobanteSchema],
  ['ActualizarSunatSchema', ActualizarSunatSchema],
  ['CuotasQuerySchema', CuotasQuerySchema],
];

describe('documentación Swagger desde zod', () => {
  it.each(ESQUEMAS)('%s se convierte en JSON Schema de entrada', (_nombre, schema) => {
    const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });

    expect(json.type).toBe('object');
    expect(json.properties).toBeDefined();
  });
});
