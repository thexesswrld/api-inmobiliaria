import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { ApiIdParam, ApiQueryZod } from '../../../common/swagger/documentacion.js';
import { ModelosQuerySchema, type ModelosQuery } from '../model/dto/modelos-query.dto.js';
import { ProyectosQuerySchema, type ProyectosQuery } from '../model/dto/proyectos-query.dto.js';
import { ProyectosService } from '../service/proyectos.service.js';

@ApiTags('Proyectos')
@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectos: ProyectosService) {}

  /** GET /proyectos */
  @Get()
  @Permisos(PERMISOS.LISTAR_PROYECTOS)
  @ApiQueryZod(ProyectosQuerySchema)
  @ApiOperation({
    summary: 'Listar proyectos',
    description: [
      '**Para qué sirve:** punto de entrada del catálogo inmobiliario; lista los proyectos de la empresa.',
      '**Permiso:** `pro.proyecto.listar`.',
      '**Query:** `pagina`, `porPagina`, `buscar` (nombre), `idEmpresa` y `tipo` (código de TIPO_PROYECTO).',
      '**Devuelve:** `data` con la página de proyectos y `meta` con el total.',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: ProyectosQuerySchema }) query: ProyectosQuery) {
    return this.proyectos.listar(query);
  }

  /** GET /proyectos/3 */
  @Get(':id')
  @Permisos(PERMISOS.VER_PROYECTO)
  @ApiIdParam('Id del proyecto', 3)
  @ApiOperation({
    summary: 'Ver proyecto',
    description: [
      '**Para qué sirve:** ficha del proyecto con su avance comercial.',
      '**Permiso:** `pro.proyecto.ver`.',
      '**Devuelve:** datos del proyecto y el conteo de unidades por estado comercial.',
      '**Errores:** `403` sin el permiso; `404` si el proyecto no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.proyectos.obtener(id);
  }

  /** GET /proyectos/3/sectores */
  @Get(':id/sectores')
  @Permisos(PERMISOS.LISTAR_SECTORES)
  @ApiIdParam('Id del proyecto', 3)
  @ApiOperation({
    summary: 'Árbol de sectores del proyecto',
    description: [
      '**Para qué sirve:** arma la navegación del proyecto (etapas, manzanas, torres y pisos) para llegar a las unidades.',
      '**Permiso:** `pro.sector.listar`.',
      '**Devuelve:** árbol `Etapa > Manzana > Lote` o `Torre > Piso`, con el total de unidades de cada sector.',
      '**Errores:** `403` sin el permiso; `404` si el proyecto no existe.',
    ].join('\n\n'),
  })
  sectores(@Param('id', ParseIntPipe) id: number) {
    return this.proyectos.sectores(id);
  }

  /** GET /proyectos/3/modelos */
  @Get(':id/modelos')
  @Permisos(PERMISOS.LISTAR_MODELOS)
  @ApiIdParam('Id del proyecto', 3)
  @ApiQueryZod(ModelosQuerySchema)
  @ApiOperation({
    summary: 'Modelos y planos del proyecto',
    description: [
      '**Para qué sirve:** entrega las imágenes, planos y renders que el frontend muestra sobre el proyecto.',
      '**Permiso:** `pro.modelo.listar`.',
      '**Query:** `idSector`, `idUnidad` y `tipo` (código de TIPO_MODELO: IMAGEN, PLANO, RENDER, MODELO_3D, VIDEO, TOUR_360).',
      '**Devuelve:** modelos con sus `referencias`, es decir, la zona clicable (sector o unidad) de cada plano.',
      '**Errores:** `403` sin el permiso; `404` si el proyecto no existe.',
    ].join('\n\n'),
  })
  modelos(
    @Param('id', ParseIntPipe) id: number,
    @Query({ schema: ModelosQuerySchema }) query: ModelosQuery,
  ) {
    return this.proyectos.modelos(id, query);
  }
}
