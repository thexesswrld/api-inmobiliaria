import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
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
  CambiarEstadoVentaSchema,
  type CambiarEstadoVentaDto,
} from '../model/dto/cambiar-estado-venta.dto.js';
import { CrearVentaSchema, type CrearVentaDto } from '../model/dto/crear-venta.dto.js';
import { FormalizarVentaSchema, type FormalizarVentaDto } from '../model/dto/formalizar-venta.dto.js';
import { VentasQuerySchema, type VentasQuery } from '../model/dto/ventas-query.dto.js';
import { VentasService } from '../service/ventas.service.js';

@ApiTags('Ventas')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  /** GET /ventas */
  @Get()
  @Permisos(PERMISOS.LISTAR_VENTAS)
  @ApiQueryZod(VentasQuerySchema)
  @ApiOperation({
    summary: 'Listar ventas',
    description: [
      '**Para qué sirve:** bandeja principal del área comercial; muestra separaciones y ventas con su estado y saldo.',
      '**Permiso:** `ven.venta.listar`.',
      '**Query:** `pagina`, `porPagina`, `estado` (ESTADO_VENTA), `idCliente`, `idTrabajador`, `desde`, `hasta` y `buscar` (código, nombre o documento del cliente).',
      '**Devuelve:** `data` con la página de ventas y `meta` con el total; cada venta trae su resumen financiero (`v_venta_resumen`).',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: VentasQuerySchema }) query: VentasQuery) {
    return this.ventas.listar(query);
  }

  /** GET /ventas/12 */
  @Get(':id')
  @Permisos(PERMISOS.VER_VENTA)
  @ApiIdParam('Id de la venta', 12)
  @ApiOperation({
    summary: 'Ver venta',
    description: [
      '**Para qué sirve:** abre el expediente completo de una venta.',
      '**Permiso:** `ven.venta.ver`.',
      '**Devuelve:** cabecera, unidades, cronograma de cuotas y resumen financiero (total, pagado, saldo y mora).',
      '**Errores:** `403` sin el permiso; `404` si la venta no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.ventas.obtener(id);
  }

  /** POST /ventas */
  @Post()
  @Permisos(PERMISOS.SEPARAR_VENTA)
  @ApiBodyZod(CrearVentaSchema, 'Datos de la separación o de la venta directa.')
  @ApiOperation({
    summary: 'Separar una unidad o registrar una venta directa',
    description: [
      '**Para qué sirve:** inicia una operación. Con `modalidad=SEPARACION` reserva la unidad con una cuota de separación; con `modalidad=DIRECTA` registra la venta completa de una vez.',
      '**Permiso:** `ven.venta.separar`. La venta directa exige además `ven.venta.formalizar`.',
      '**Body:** `idCliente`, `unidades[]`, `modalidad` y, según la modalidad, `montoSeparacion` o `montoInicial` + `numeroCuotas`. `idTrabajador` se toma del usuario de la sesión si se omite.',
      '**Devuelve:** la venta creada con su código, estado y cronograma.',
      '**Errores:** `404` si el cliente, el trabajador o alguna unidad no existe; `422` si la unidad no está disponible, no tiene precio, el descuento supera el precio o falta el monto según la modalidad.',
      '**Efecto en base:** el trigger pasa la unidad a SEPARADO (o VENDIDO en venta directa) y crea las cuotas.',
    ].join('\n\n'),
  })
  crear(
    @Body({ schema: CrearVentaSchema }) dto: CrearVentaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.ventas.crear(dto, usuario);
  }

  /** PATCH /ventas/12/formalizar */
  @Patch(':id/formalizar')
  @Permisos(PERMISOS.FORMALIZAR_VENTA)
  @ApiIdParam('Id de la venta SEPARADA', 12)
  @ApiBodyZod(FormalizarVentaSchema, 'Condiciones finales del contrato.')
  @ApiOperation({
    summary: 'Formalizar el contrato',
    description: [
      '**Para qué sirve:** convierte una separación en venta vigente cuando el cliente ya pagó la separación y se acordó el precio final.',
      '**Permiso:** `ven.venta.formalizar`.',
      '**Body:** `montoFinal`, `montoInicial`, `numeroCuotas`, `fechaPrimeraCuota` y `fechaInicial`.',
      '**Devuelve:** la venta en estado VIGENTE con el cronograma definitivo.',
      '**Errores:** `404` si la venta no existe; `422` si no está SEPARADA, si la separación no está pagada, si el precio final supera el bruto o si la inicial es menor que la separación.',
      '**Concurrencia:** bloquea la venta con `FOR UPDATE`; si cambió de estado responde `422` y hay que reintentar.',
    ].join('\n\n'),
  })
  formalizar(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: FormalizarVentaSchema }) dto: FormalizarVentaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.ventas.formalizar(id, dto, usuario);
  }

  /** PATCH /ventas/12/estado */
  @Patch(':id/estado')
  @ApiIdParam('Id de la venta', 12)
  @ApiBodyZod(CambiarEstadoVentaSchema, 'Estado destino de la venta.')
  @ApiOperation({
    summary: 'Cancelar, entregar, anular o resolver una venta',
    description: [
      '**Para qué sirve:** cierra el ciclo de vida de la venta.',
      '**Permiso:** solo requiere sesión; el service exige `ven.venta.cerrar` para CANCELADA y ENTREGADA, y `ven.venta.anular` para ANULADA y RESUELTA.',
      '**Body:** `estado`, uno de CANCELADA, ENTREGADA, ANULADA o RESUELTA.',
      '**Devuelve:** la venta con su nuevo estado; los triggers ajustan la unidad y las cuotas.',
      '**Errores:** `403` sin el permiso que corresponde al estado; `404` si la venta no existe; `422` si la transición no es válida o si se intenta cancelar con saldo pendiente.',
      '**Transiciones:** VIGENTE → CANCELADA, ANULADA o RESUELTA; CANCELADA → ENTREGADA; SEPARADA → ANULADA.',
    ].join('\n\n'),
  })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: CambiarEstadoVentaSchema }) dto: CambiarEstadoVentaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.ventas.cambiarEstado(id, dto, usuario);
  }
}
