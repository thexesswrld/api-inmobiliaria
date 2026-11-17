import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { hoyISO } from '../../../common/cronograma/cronograma.js';
import { ACTIVO } from '../../../common/estado.js';
import { aCentavos, deCentavos } from '../../../common/formato/formato.js';
import { idOpcion, idsOpciones } from '../../../common/opciones/opciones.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CambiarEstadoPagoDto } from '../model/dto/cambiar-estado-pago.dto.js';
import type { CrearPagoDto } from '../model/dto/crear-pago.dto.js';
import type { PagosQuery } from '../model/dto/pagos-query.dto.js';
import { toPagoDetalleRespuesta, toPagoRespuesta } from '../model/pago.mapper.js';
import { pagoDetalleSelect, pagoListadoSelect } from '../model/pago.select.js';
import type { PagoDetalleRespuesta, PagoRespuesta } from '../model/respuestas.js';

/** Transiciones válidas de ven_pago.estado_pago. */
const TRANSICIONES: Record<string, readonly string[]> = {
  REGISTRADO: ['VALIDADO', 'RECHAZADO', 'ANULADO'],
  VALIDADO: ['ANULADO'],
  RECHAZADO: ['ANULADO'],
  ANULADO: [],
};

/** Estados de venta que ya no admiten cobros. */
const VENTAS_CERRADAS = new Set(['ANULADA', 'RESUELTA']);

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: PagosQuery): Promise<Paginado<PagoRespuesta>> {
    const where: Prisma.PagoWhereInput = {
      ...ACTIVO,
      ...(query.idVenta ? { idVenta: query.idVenta } : {}),
      ...(query.idCliente ? { venta: { idCliente: query.idCliente } } : {}),
      ...(query.estado ? { estadoPagoOpcion: { codigo: query.estado } } : {}),
      ...(query.medioPago ? { medioPagoOpcion: { codigo: query.medioPago } } : {}),
      ...(query.desde ? { fechaPago: { gte: query.desde } } : {}),
      ...(query.hasta ? { fechaPago: { lte: query.hasta } } : {}),
      ...(query.buscar ? filtroBusqueda(query.buscar) : {}),
    };

    const [pagos, total] = await Promise.all([
      this.prisma.pago.findMany({
        where,
        select: pagoListadoSelect,
        orderBy: { id: 'desc' },
        ...rango(query),
      }),
      this.prisma.pago.count({ where }),
    ]);

    return paginado(pagos.map(toPagoRespuesta), total, query);
  }

  /** GET /ventas/:id/pagos */
  async listarDeVenta(idVenta: number, query: PagosQuery): Promise<Paginado<PagoRespuesta>> {
    const venta = await this.prisma.venta.findFirst({ where: { id: idVenta, ...ACTIVO }, select: { id: true } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return this.listar({ ...query, idVenta });
  }

  async obtener(id: number): Promise<PagoDetalleRespuesta> {
    const pago = await this.prisma.pago.findFirst({
      where: { id, ...ACTIVO },
      select: pagoDetalleSelect,
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return toPagoDetalleRespuesta(pago);
  }

  /**
   * POST /ventas/:id/pagos
   * Inserta el pago y su reparto. La base valida los topes, bloquea el pago
   * y recalcula `monto_pagado` / `estado_cuota` con sus triggers.
   */
  async registrar(idVenta: number, dto: CrearPagoDto, usuario: UsuarioAutenticado): Promise<PagoDetalleRespuesta> {
    const venta = await this.prisma.venta.findFirst({
      where: { id: idVenta, ...ACTIVO },
      select: { id: true, codigo: true, moneda: { select: { codigo: true } }, estadoComercialOpcion: { select: { codigo: true } } },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const estadoVenta = venta.estadoComercialOpcion.codigo;
    if (VENTAS_CERRADAS.has(estadoVenta)) {
      throw new UnprocessableEntityException(`La venta ${venta.codigo} está ${estadoVenta} y no admite pagos`);
    }

    if (dto.tipoMoneda !== venta.moneda.codigo && dto.tipoCambio === undefined) {
      throw new UnprocessableEntityException(
        'El pago está en otra moneda que la venta: tipoCambio es obligatorio',
      );
    }

    await this.verificarCuotas(idVenta, dto);

    const [moneda, medioPago, estadoRegistrado, aplicaA] = await Promise.all([
      idOpcion(this.prisma, 'TIPO_MONEDA', dto.tipoMoneda),
      idOpcion(this.prisma, 'MEDIO_PAGO', dto.medioPago),
      idOpcion(this.prisma, 'ESTADO_PAGO', 'REGISTRADO'),
      idsOpciones(this.prisma, 'APLICA_A', [...new Set(dto.aplicaciones.map((a) => a.aplicaA))]),
    ]);

    const pago = await this.prisma.$transaction(async (tx) => {
      const creado = await tx.pago.create({
        data: {
          idVenta,
          fechaPago: dto.fechaPago ?? hoyISO(),
          monto: deCentavos(aCentavos(dto.monto)),
          tipoMoneda: moneda,
          tipoCambio: dto.tipoCambio === undefined ? null : Number(dto.tipoCambio.toFixed(4)),
          medioPago,
          idCuentaBancaria: dto.idCuentaBancaria ?? null,
          numeroOperacion: dto.numeroOperacion ?? null,
          ruta: dto.ruta ?? null,
          estadoPago: estadoRegistrado,
          idUsuarioCreacion: usuario.id,
        },
        select: { id: true },
      });

      if (dto.aplicaciones.length > 0) {
        await tx.pagoAplicacion.createMany({
          data: dto.aplicaciones.map((a) => ({
            idPago: creado.id,
            idVenta,
            idCuota: a.idCuota,
            montoAplicado: deCentavos(aCentavos(a.monto)),
            aplicaA: aplicaA.get(a.aplicaA)!,
            idUsuarioCreacion: usuario.id,
          })),
        });
      }

      return creado;
    });

    return this.obtener(pago.id);
  }

  /** PATCH /pagos/:id/estado — validar, rechazar o anular. */
  async cambiarEstado(
    id: number,
    dto: CambiarEstadoPagoDto,
    usuario: UsuarioAutenticado,
  ): Promise<PagoDetalleRespuesta> {
    const permiso = dto.estado === 'ANULADO' ? PERMISOS.ANULAR_PAGO : PERMISOS.VALIDAR_PAGO;
    if (!usuario.permisos.has(permiso)) {
      throw new ForbiddenException(`Requiere el permiso ${permiso} para pasar el pago a ${dto.estado}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const bloqueo = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM ven_pago WHERE id = ${id} AND estado = 1 FOR UPDATE
      `;
      if (bloqueo.length === 0) throw new NotFoundException('Pago no encontrado');

      const pago = await tx.pago.findUnique({
        where: { id },
        select: { id: true, estadoPagoOpcion: { select: { codigo: true } } },
      });
      if (!pago) throw new NotFoundException('Pago no encontrado');

      const actual = pago.estadoPagoOpcion.codigo;
      if (!TRANSICIONES[actual]?.includes(dto.estado)) {
        throw new UnprocessableEntityException(`No se puede pasar el pago ${id} de ${actual} a ${dto.estado}`);
      }

      await tx.pago.update({
        where: { id },
        data: {
          estadoPago: await idOpcion(tx, 'ESTADO_PAGO', dto.estado),
          ...(dto.estado === 'VALIDADO' ? {} : { motivoAnulacion: dto.motivoAnulacion ?? null }),
          idUsuarioModificacion: usuario.id,
        },
      });
    });

    return this.obtener(id);
  }

  /**
   * Solo comprueba que las cuotas existan y sean de esta venta (las FKs
   * compuestas también lo impiden). Los topes de capital y mora, y el pago
   * a una cuota ANULADA, los valida `trg_pago_aplicacion_cuota`.
   */
  private async verificarCuotas(idVenta: number, dto: CrearPagoDto): Promise<void> {
    if (dto.aplicaciones.length === 0) return;

    const ids = [...new Set(dto.aplicaciones.map((a) => a.idCuota))];
    const cuotas = await this.prisma.cuota.findMany({
      where: { id: { in: ids }, idVenta, ...ACTIVO },
      select: { id: true },
    });
    if (cuotas.length !== ids.length) {
      throw new UnprocessableEntityException('Alguna de las cuotas indicadas no pertenece a la venta');
    }
  }
}

function filtroBusqueda(buscar: string): Prisma.PagoWhereInput {
  const contiene = { contains: buscar, mode: 'insensitive' } as const;
  return {
    OR: [
      { numeroOperacion: contiene },
      { venta: { codigo: contiene } },
      { venta: { cliente: { persona: { nombre: contiene } } } },
      { venta: { cliente: { persona: { apellidoPaterno: contiene } } } },
      { venta: { cliente: { persona: { apellidoMaterno: contiene } } } },
      { venta: { cliente: { persona: { documento: contiene } } } },
    ],
  };
}
