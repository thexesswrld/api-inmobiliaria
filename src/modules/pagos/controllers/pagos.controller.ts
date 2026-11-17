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
  CambiarEstadoPagoSchema,
  type CambiarEstadoPagoDto,
} from '../model/dto/cambiar-estado-pago.dto.js';
import { PagosQuerySchema, type PagosQuery } from '../model/dto/pagos-query.dto.js';
import { PagosService } from '../service/pagos.service.js';

@ApiTags('Pagos')
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /** GET /pagos */
  @Get()
  @Permisos(PERMISOS.LISTAR_PAGOS)
  @ApiQueryZod(PagosQuerySchema)
  @ApiOperation({
    summary: 'Listar pagos',
    description: [
      '**Para qué sirve:** conciliación de cobranza; revisa qué pagos están registrados, validados o pendientes de anular.',
      '**Permiso:** `ven.pago.listar`.',
      '**Query:** `pagina`, `porPagina`, `estado`, `medioPago`, `idVenta`, `idCliente`, `desde`, `hasta` y `buscar` (número de operación, código de venta o documento del cliente).',
      '**Devuelve:** `data` con la página de pagos y `meta` con el total.',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: PagosQuerySchema }) query: PagosQuery) {
    return this.pagos.listar(query);
  }

  /** GET /pagos/88 */
  @Get(':id')
  @Permisos(PERMISOS.VER_PAGO)
  @ApiIdParam('Id del pago', 88)
  @ApiOperation({
    summary: 'Ver pago',
    description: [
      '**Para qué sirve:** detalle de un cobro para revisar cómo se repartió entre las cuotas de la venta.',
      '**Permiso:** `ven.pago.ver`.',
      '**Devuelve:** datos del pago, su venta, medio de pago y las aplicaciones CAPITAL / MORA por cuota.',
      '**Errores:** `403` sin el permiso; `404` si el pago no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.pagos.obtener(id);
  }

  /** PATCH /pagos/88/estado */
  @Patch(':id/estado')
  @ApiIdParam('Id del pago', 88)
  @ApiBodyZod(CambiarEstadoPagoSchema, 'Estado destino del pago y motivo cuando corresponda.')
  @ApiOperation({
    summary: 'Validar, rechazar o anular un pago',
    description: [
      '**Para qué sirve:** confirma que el dinero ingresó o deja el pago sin efecto.',
      '**Permiso:** solo requiere sesión; el service exige `ven.pago.validar` para VALIDADO/RECHAZADO y `ven.pago.anular` para ANULADO.',
      '**Body:** `estado` (VALIDADO, RECHAZADO o ANULADO) y `motivoAnulacion`, obligatorio salvo en VALIDADO.',
      '**Devuelve:** el pago con su nuevo estado y las cuotas recalculadas por el trigger.',
      '**Errores:** `403` sin el permiso; `404` si el pago no existe; `422` si la transición no es válida o falta el motivo.',
      '**Transiciones:** REGISTRADO → VALIDADO, RECHAZADO o ANULADO; VALIDADO y RECHAZADO → ANULADO.',
    ].join('\n\n'),
  })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: CambiarEstadoPagoSchema }) dto: CambiarEstadoPagoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.pagos.cambiarEstado(id, dto, usuario);
  }
}
