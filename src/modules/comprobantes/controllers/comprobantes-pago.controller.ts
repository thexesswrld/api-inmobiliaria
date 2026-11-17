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
import { ComprobantesQuerySchema, type ComprobantesQuery } from '../model/dto/comprobantes-query.dto.js';
import { EmitirComprobanteSchema, type EmitirComprobanteDto } from '../model/dto/emitir-comprobante.dto.js';
import { ComprobantesService } from '../service/comprobantes.service.js';

@ApiTags('Comprobantes')
@Controller('pagos')
export class ComprobantesDePagoController {
  constructor(private readonly comprobantes: ComprobantesService) {}

  /** GET /pagos/88/comprobantes */
  @Get(':id/comprobantes')
  @Permisos(PERMISOS.LISTAR_COMPROBANTES)
  @ApiIdParam('Id del pago', 88)
  @ApiQueryZod(ComprobantesQuerySchema)
  @ApiOperation({
    summary: 'Comprobantes de un pago',
    description: [
      '**Para qué sirve:** consulta qué comprobantes se emitieron por un pago.',
      '**Permiso:** `ven.comprobante.listar`.',
      '**Query:** los mismos filtros del listado general; `idPago` se toma de la ruta.',
      '**Devuelve:** `data` paginado, del más reciente al más antiguo, y `meta` con el total.',
      '**Errores:** `403` sin el permiso; `404` si el pago no existe.',
    ].join('\n\n'),
  })
  listar(
    @Param('id', ParseIntPipe) id: number,
    @Query({ schema: ComprobantesQuerySchema }) query: ComprobantesQuery,
  ) {
    return this.comprobantes.listarDePago(id, query);
  }

  /** POST /pagos/88/comprobante */
  @Post(':id/comprobante')
  @Permisos(PERMISOS.EMITIR_COMPROBANTE)
  @ApiIdParam('Id del pago', 88)
  @ApiBodyZod(EmitirComprobanteSchema, 'Serie y datos de emisión.')
  @ApiOperation({
    summary: 'Emitir el comprobante de un pago',
    description: [
      '**Para qué sirve:** genera la factura, boleta o nota del pago recibido, con el IGV ya calculado.',
      '**Permiso:** `ven.comprobante.emitir`.',
      '**Body:** `idSerie` (define el tipo y el correlativo) y, opcionalmente, `fechaEmision`, `tipoCambio`, `idComprobanteReferencia` (obligatorio en notas), `glosa` y `observaciones`.',
      '**Devuelve:** el comprobante emitido con serie, número, base imponible, IGV 18% y total.',
      '**Errores:** `404` si el pago o la serie no existen; `422` si el pago está ANULADO o RECHAZADO, si ya tiene comprobante, si falta la referencia en una nota o si la referencia es de otro cliente.',
      '**Concurrencia:** el número sale de `fn_siguiente_numero_comprobante` dentro de la misma transacción, así que no se repite.',
    ].join('\n\n'),
  })
  emitir(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: EmitirComprobanteSchema }) dto: EmitirComprobanteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.comprobantes.emitir(id, dto, usuario);
  }
}
