import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos, UsuarioActual } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  ApiBodyZod,
  ApiIdParam,
  ApiQueryZod,
} from '../../../common/swagger/documentacion.js';
import {
  CambiarEstadoUnidadSchema,
  UnidadesQuerySchema,
  type CambiarEstadoUnidadDto,
  type UnidadesQuery,
} from '../model/dto/unidades-query.dto.js';
import { UnidadesService } from '../service/unidades.service.js';

@ApiTags('Unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidades: UnidadesService) {}

  /** GET /unidades?estado=DISPONIBLE&idProyecto=3 */
  @Get()
  @Permisos(PERMISOS.LISTAR_UNIDADES)
  @ApiQueryZod(UnidadesQuerySchema)
  @ApiOperation({
    summary: 'Listar unidades',
    description: [
      '**Para qué sirve:** busca unidades concretas por proyecto, sector, estado comercial o tipo.',
      '**Permiso:** `pro.unidad.listar`.',
      '**Query:** `pagina`, `porPagina`, `idProyecto`, `idSector`, `estado` (ESTADO_UNIDAD), `tipo` (TIPO_UNIDAD) y `buscar`.',
      '**Devuelve:** `data` con la página de unidades y `meta` con el total.',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: UnidadesQuerySchema }) query: UnidadesQuery) {
    return this.unidades.listar(query);
  }

  /** GET /unidades/45 */
  @Get(':id')
  @Permisos(PERMISOS.VER_UNIDAD)
  @ApiIdParam('Id de la unidad', 45)
  @ApiOperation({
    summary: 'Ver unidad',
    description: [
      '**Para qué sirve:** ficha de la unidad antes de separarla o venderla.',
      '**Permiso:** `pro.unidad.ver`.',
      '**Devuelve:** datos de la unidad, propietario actual (si lo tiene) y cantidad de modelos.',
      '**Errores:** `403` sin el permiso; `404` si la unidad no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.unidades.obtener(id);
  }

  /** PATCH /unidades/45/estado */
  @Patch(':id/estado')
  @Permisos(PERMISOS.BLOQUEAR_UNIDAD)
  @ApiIdParam('Id de la unidad', 45)
  @ApiBodyZod(CambiarEstadoUnidadSchema, 'Estado manual de la unidad.')
  @ApiOperation({
    summary: 'Bloquear o liberar una unidad',
    description: [
      '**Para qué sirve:** bloquea una unidad para reservarla a un cliente mientras se negocia, o la libera de nuevo.',
      '**Permiso:** `pro.unidad.bloquear`.',
      '**Body:** `estado` (`DISPONIBLE` o `BLOQUEADO`).',
      '**Devuelve:** la unidad con su estado actualizado.',
      '**Errores:** `400` si se intenta otro estado o la unidad ya está vendida; `403` sin el permiso; `404` si no existe.',
      '**Nota:** los estados SEPARADO, VENDIDO y ENTREGADO los pone la venta y sus triggers, no este endpoint.',
    ].join('\n\n'),
  })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: CambiarEstadoUnidadSchema }) dto: CambiarEstadoUnidadDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.unidades.cambiarEstado(id, dto, usuario.id);
  }
}
