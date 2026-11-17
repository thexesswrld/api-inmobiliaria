import { Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { ApiQueryZod } from '../../../common/swagger/documentacion.js';
import { CuotasQuerySchema, type CuotasQuery } from '../model/dto/cuotas-query.dto.js';
import { CuotasService } from '../service/cuotas.service.js';

@ApiTags('Cuotas')
@Controller('cuotas')
export class CuotasController {
  constructor(private readonly cuotas: CuotasService) {}

  /** GET /cuotas */
  @Get()
  @Permisos(PERMISOS.LISTAR_CUOTAS)
  @ApiQueryZod(CuotasQuerySchema)
  @ApiOperation({
    summary: 'Listar cuotas',
    description: [
      '**Para qué sirve:** cartera de cobranza; muestra qué cuotas están por vencer, vencidas o pagadas.',
      '**Permiso:** `ven.cuota.listar`.',
      '**Query:** `pagina`, `porPagina`, `estado`, `tipoCuota`, `idVenta`, `idCliente`, `vencidas`, `desde`, `hasta` y `buscar`.',
      '**Devuelve:** `data` con la página de cuotas y `meta` con el total. Cada cuota trae estado real, saldo, mora y días de atraso.',
      '**Errores:** `403` sin el permiso.',
      '**Nota:** lee `v_cuota_estado`, así que el estado se calcula a la fecha sin esperar al job diario.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: CuotasQuerySchema }) query: CuotasQuery) {
    return this.cuotas.listar(query);
  }

  /** POST /cuotas/marcar-vencidas */
  @Post('marcar-vencidas')
  @HttpCode(200)
  @Permisos(PERMISOS.MARCAR_CUOTAS_VENCIDAS)
  @ApiOperation({
    summary: 'Marcar cuotas vencidas',
    description: [
      '**Para qué sirve:** fuerza ahora el proceso que pasa a VENCIDA las cuotas con fecha de vencimiento pasada.',
      '**Permiso:** `ven.cuota.marcar-vencidas`.',
      '**Devuelve:** cuántas cuotas se marcaron y a qué fecha.',
      '**Errores:** `403` sin el permiso.',
      '**Nota:** el job diario ejecuta `fn_marcar_cuotas_vencidas()` a las 3:00; este endpoint es para forzarlo desde administración.',
    ].join('\n\n'),
  })
  marcarVencidas() {
    return this.cuotas.marcarVencidas();
  }
}
