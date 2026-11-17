import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { ApiIdParam, ApiQueryZod } from '../../../common/swagger/documentacion.js';
import { CuotasQuerySchema, type CuotasQuery } from '../model/dto/cuotas-query.dto.js';
import { CuotasService } from '../service/cuotas.service.js';

@ApiTags('Cuotas')
@Controller('ventas')
export class CuotasDeVentaController {
  constructor(private readonly cuotas: CuotasService) {}

  /** GET /ventas/12/cuotas */
  @Get(':id/cuotas')
  @Permisos(PERMISOS.LISTAR_CUOTAS)
  @ApiIdParam('Id de la venta', 12)
  @ApiQueryZod(CuotasQuerySchema)
  @ApiOperation({
    summary: 'Cronograma de una venta',
    description: [
      '**Para qué sirve:** muestra el cronograma acordado y cuánto falta pagar de cada cuota.',
      '**Permiso:** `ven.cuota.listar`.',
      '**Query:** los mismos filtros del listado general; `idVenta` se toma de la ruta.',
      '**Devuelve:** `data` paginado por vencimiento; cada cuota trae estado real, saldo, mora y días de atraso.',
      '**Errores:** `403` sin el permiso; `404` si la venta no existe.',
    ].join('\n\n'),
  })
  listar(
    @Param('id', ParseIntPipe) id: number,
    @Query({ schema: CuotasQuerySchema }) query: CuotasQuery,
  ) {
    return this.cuotas.listarDeVenta(id, query);
  }
}
