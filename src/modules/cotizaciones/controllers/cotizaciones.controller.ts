import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { ApiBodyZod } from '../../../common/swagger/documentacion.js';
import {
  SimularCotizacionSchema,
  type SimularCotizacionDto,
} from '../model/dto/simular-cotizacion.dto.js';
import { CotizacionesService } from '../service/cotizaciones.service.js';

@ApiTags('Cotizaciones')
@Controller('cotizaciones')
export class CotizacionesController {
  constructor(private readonly cotizaciones: CotizacionesService) {}

  /** POST /cotizaciones/simular */
  @Post('simular')
  @HttpCode(200)
  @Permisos(PERMISOS.SIMULAR_COTIZACION)
  @ApiBodyZod(SimularCotizacionSchema, 'Datos de la simulación; indique idUnidad o precioLista.')
  @ApiOperation({
    summary: 'Simular una cotización',
    description: [
      '**Para qué sirve:** el vendedor prueba precios y cuotas frente al cliente antes de separar la unidad.',
      '**Permiso:** `ven.cotizacion.simular`.',
      '**Body:** `idUnidad` o `precioLista`, más `descuento`, `montoInicial`, `numeroCuotas`, `montoSeparacion`, `incluirSeparacion` y `fechaPrimeraCuota`.',
      '**Devuelve:** precio de lista, descuento, inicial, monto financiado y el cronograma de cuotas propuesto.',
      '**Errores:** `400` si falta `idUnidad` y `precioLista`, o si la unidad no existe; `403` sin el permiso.',
      '**Importante:** no guarda nada en la base de datos; es solo cálculo.',
    ].join('\n\n'),
  })
  simular(@Body({ schema: SimularCotizacionSchema }) dto: SimularCotizacionDto) {
    return this.cotizaciones.simular(dto);
  }
}
