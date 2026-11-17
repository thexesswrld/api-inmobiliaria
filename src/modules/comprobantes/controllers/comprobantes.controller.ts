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
import { ActualizarSunatSchema, type ActualizarSunatDto } from '../model/dto/actualizar-sunat.dto.js';
import { AnularComprobanteSchema, type AnularComprobanteDto } from '../model/dto/anular-comprobante.dto.js';
import { ComprobantesQuerySchema, type ComprobantesQuery } from '../model/dto/comprobantes-query.dto.js';
import { ComprobantesService } from '../service/comprobantes.service.js';

@ApiTags('Comprobantes')
@Controller('comprobantes')
export class ComprobantesController {
  constructor(private readonly comprobantes: ComprobantesService) {}

  /** GET /comprobantes */
  @Get()
  @Permisos(PERMISOS.LISTAR_COMPROBANTES)
  @ApiQueryZod(ComprobantesQuerySchema)
  @ApiOperation({
    summary: 'Listar comprobantes',
    description: [
      '**Para qué sirve:** libro de comprobantes emitidos y su situación ante SUNAT.',
      '**Permiso:** `ven.comprobante.listar`.',
      '**Query:** `pagina`, `porPagina`, `estado`, `estadoSunat`, `tipoComprobante`, `idCliente`, `idPago`, `serie`, `desde`, `hasta` y `buscar`.',
      '**Devuelve:** `data` con la página de comprobantes y `meta` con el total.',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: ComprobantesQuerySchema }) query: ComprobantesQuery) {
    return this.comprobantes.listar(query);
  }

  /** GET /comprobantes/25 */
  @Get(':id')
  @Permisos(PERMISOS.VER_COMPROBANTE)
  @ApiIdParam('Id del comprobante', 25)
  @ApiOperation({
    summary: 'Ver comprobante',
    description: [
      '**Para qué sirve:** revisa un comprobante emitido con sus importes y su estado SUNAT.',
      '**Permiso:** `ven.comprobante.ver`.',
      '**Devuelve:** serie y número, tipo, cliente, base imponible, IGV, total y datos de SUNAT.',
      '**Errores:** `403` sin el permiso; `404` si el comprobante no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.comprobantes.obtener(id);
  }

  /** PATCH /comprobantes/25/anular */
  @Patch(':id/anular')
  @Permisos(PERMISOS.ANULAR_COMPROBANTE)
  @ApiIdParam('Id del comprobante', 25)
  @ApiBodyZod(AnularComprobanteSchema, 'Motivo de la anulación.')
  @ApiOperation({
    summary: 'Anular un comprobante',
    description: [
      '**Para qué sirve:** deja sin efecto un comprobante mal emitido sin borrar el registro contable.',
      '**Permiso:** `ven.comprobante.anular`.',
      '**Body:** `motivoAnulacion`, obligatorio.',
      '**Devuelve:** el comprobante en estado ANULADO con el motivo.',
      '**Errores:** `403` sin el permiso; `404` si no existe; `422` si ya estaba ANULADO.',
      '**Nota:** el comprobante emitido no se modifica ni se elimina, solo cambia de estado.',
    ].join('\n\n'),
  })
  anular(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: AnularComprobanteSchema }) dto: AnularComprobanteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.comprobantes.anular(id, dto, usuario);
  }

  /** PATCH /comprobantes/25/sunat */
  @Patch(':id/sunat')
  @Permisos(PERMISOS.ACTUALIZAR_SUNAT)
  @ApiIdParam('Id del comprobante', 25)
  @ApiBodyZod(ActualizarSunatSchema, 'Respuesta del envío a SUNAT u OSE.')
  @ApiOperation({
    summary: 'Registrar la respuesta de SUNAT',
    description: [
      '**Para qué sirve:** guarda lo que devolvió SUNAT u OSE después del envío del comprobante electrónico.',
      '**Permiso:** `ven.comprobante.sunat`.',
      '**Body:** `estado` (ENVIADO, ACEPTADO, OBSERVADO, RECHAZADO o BAJA) y, según el caso, `hashCpe`, `urlPdf`, `urlXml`, `urlCdr`, `fechaEnvioSunat` y `mensajeSunat`.',
      '**Devuelve:** el comprobante con su estado SUNAT actualizado.',
      '**Errores:** `403` sin el permiso; `404` si no existe; `422` si el comprobante está ANULADO o la transición no es válida.',
      '**Importante:** no envía nada a SUNAT; el envío es un proceso externo.',
    ].join('\n\n'),
  })
  actualizarSunat(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: ActualizarSunatSchema }) dto: ActualizarSunatDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.comprobantes.actualizarSunat(id, dto, usuario);
  }
}
