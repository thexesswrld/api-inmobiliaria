import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos, UsuarioActual } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import {
  ApiBodyZod,
  ApiIdParam,
  ApiQueryZod,
} from '../../../common/swagger/documentacion.js';
import { CrearPagoSchema, type CrearPagoDto } from '../model/dto/crear-pago.dto.js';
import { PagosQuerySchema, type PagosQuery } from '../model/dto/pagos-query.dto.js';
import { PagosService } from '../service/pagos.service.js';

@ApiTags('Pagos')
@Controller('ventas')
export class PagosDeVentaController {
  constructor(private readonly pagos: PagosService) {}

  /** GET /ventas/12/pagos */
  @Get(':id/pagos')
  @Permisos(PERMISOS.LISTAR_PAGOS)
  @ApiIdParam('Id de la venta', 12)
  @ApiQueryZod(PagosQuerySchema)
  @ApiOperation({
    summary: 'Pagos de una venta',
    description: [
      '**Para qué sirve:** estado de cuenta de una venta concreta: qué se cobró y cuándo.',
      '**Permiso:** `ven.pago.listar`.',
      '**Query:** los mismos filtros del listado general; `idVenta` se toma de la ruta.',
      '**Devuelve:** `data` paginado, del pago más reciente al más antiguo, y `meta` con el total.',
      '**Errores:** `403` sin el permiso; `404` si la venta no existe.',
    ].join('\n\n'),
  })
  listar(
    @Param('id', ParseIntPipe) id: number,
    @Query({ schema: PagosQuerySchema }) query: PagosQuery,
  ) {
    return this.pagos.listarDeVenta(id, query);
  }

  /** POST /ventas/12/pagos */
  @Post(':id/pagos')
  @Permisos(PERMISOS.REGISTRAR_PAGO)
  @ApiIdParam('Id de la venta que recibe el pago', 12)
  @ApiBodyZod(CrearPagoSchema, 'Datos del cobro y su reparto entre cuotas.')
  @ApiOperation({
    summary: 'Registrar un pago',
    description: [
      '**Para qué sirve:** registra el dinero recibido del cliente y lo reparte entre las cuotas de la venta.',
      '**Permiso:** `ven.pago.registrar`.',
      '**Body:** `monto`, `medioPago`, `tipoMoneda`, `fechaPago`, datos de la operación y `aplicaciones[]` (`idCuota`, `monto`, `aplicaA` = CAPITAL o MORA). Puede enviarse sin aplicaciones: el saldo queda a favor.',
      '**Devuelve:** el pago en estado REGISTRADO con sus aplicaciones.',
      '**Errores:** `404` si la venta no existe; `422` si la venta está ANULADA o RESUELTA, si falta `tipoCambio` al pagar en otra moneda o si una cuota no pertenece a la venta.',
      '**Efecto en base:** `trg_pago_aplicacion_cuota` valida los topes y recalcula saldo y estado de cada cuota. El IGV no se calcula aquí: va en el comprobante.',
    ].join('\n\n'),
  })
  registrar(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: CrearPagoSchema }) dto: CrearPagoDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.pagos.registrar(id, dto, usuario);
  }
}
