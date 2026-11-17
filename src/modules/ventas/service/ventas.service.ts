import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import {
  ErrorCronograma,
  calcularCronograma,
  hoyISO,
  sumarMeses,
  type CuotaCronograma,
} from '../../../common/cronograma/cronograma.js';
import { ACTIVO } from '../../../common/estado.js';
import { aCentavos, deCentavos, nombreCompleto } from '../../../common/formato/formato.js';
import { idOpcion, idsOpciones } from '../../../common/opciones/opciones.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CambiarEstadoVentaDto } from '../model/dto/cambiar-estado-venta.dto.js';
import type { CrearVentaDto } from '../model/dto/crear-venta.dto.js';
import type { FormalizarVentaDto } from '../model/dto/formalizar-venta.dto.js';
import type { VentasQuery } from '../model/dto/ventas-query.dto.js';
import type { ResumenVentaRespuesta, VentaDetalleRespuesta, VentaListadoRespuesta } from '../model/respuestas.js';
import {
  toResumenVentaRespuesta,
  toVentaDetalleRespuesta,
  toVentaListadoRespuesta,
  type FilaResumenVenta,
} from '../model/venta.mapper.js';
import { ventaDetalleSelect, ventaListadoSelect } from '../model/venta.select.js';

/** Transiciones válidas de ven_venta.estado_comercial. */
const TRANSICIONES: Record<string, readonly string[]> = {
  SEPARADA: ['ANULADA'],
  VIGENTE: ['CANCELADA', 'ANULADA', 'RESUELTA'],
  CANCELADA: ['ENTREGADA'],
  ENTREGADA: [],
  ANULADA: [],
  RESUELTA: [],
};

interface DetalleCalculado {
  idUnidad: number;
  precioLista: string;
  descuento: string;
  precioVenta: string;
}

@Injectable()
export class VentasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: VentasQuery): Promise<Paginado<VentaListadoRespuesta>> {
    const where: Prisma.VentaWhereInput = {
      ...ACTIVO,
      ...(query.estado ? { estadoComercial: await idOpcion(this.prisma, 'ESTADO_VENTA', query.estado) } : {}),
      ...(query.idCliente ? { idCliente: query.idCliente } : {}),
      ...(query.idTrabajador ? { idTrabajador: query.idTrabajador } : {}),
      ...(query.desde ? { fechaVenta: { gte: query.desde } } : {}),
      ...(query.hasta ? { fechaVenta: { lte: query.hasta } } : {}),
      ...(query.buscar ? filtroBusqueda(query.buscar) : {}),
    };

    const [ventas, total] = await Promise.all([
      this.prisma.venta.findMany({
        where,
        select: ventaListadoSelect,
        orderBy: { id: 'desc' },
        ...rango(query),
      }),
      this.prisma.venta.count({ where }),
    ]);

    const resumenes = await this.resumenes(ventas.map((v) => v.id));
    return paginado(
      ventas.map((v) => toVentaListadoRespuesta(v, resumenes.get(v.id) ?? toResumenVentaRespuesta(undefined))),
      total,
      query,
    );
  }

  async obtener(id: number): Promise<VentaDetalleRespuesta> {
    const venta = await this.prisma.venta.findFirst({
      where: { id, ...ACTIVO },
      select: ventaDetalleSelect,
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const resumenes = await this.resumenes([id]);
    return toVentaDetalleRespuesta(venta, resumenes.get(id) ?? toResumenVentaRespuesta(undefined));
  }

  /**
   * POST /ventas
   * - SEPARACION: venta SEPARADA + cuota SEPARACION. El trigger pasa la unidad a SEPARADO.
   * - DIRECTA: venta VIGENTE con cronograma completo. La unidad pasa a VENDIDO.
   */
  async crear(dto: CrearVentaDto, usuario: UsuarioAutenticado): Promise<VentaDetalleRespuesta> {
    if (dto.modalidad === 'DIRECTA' && !usuario.permisos.has(PERMISOS.FORMALIZAR_VENTA)) {
      throw new ForbiddenException(`Una venta directa requiere el permiso ${PERMISOS.FORMALIZAR_VENTA}`);
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.idCliente, ...ACTIVO },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const idTrabajador = dto.idTrabajador ?? (await this.trabajadorDelUsuario(usuario.id));
    if (!idTrabajador) {
      throw new UnprocessableEntityException(
        'Indique idTrabajador: el usuario de la sesión no tiene ficha de trabajador',
      );
    }
    const trabajador = await this.prisma.trabajador.findFirst({
      where: { id: idTrabajador, ...ACTIVO },
      select: { id: true },
    });
    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');

    const fechaVenta = dto.fechaVenta ?? hoyISO();
    const detalles = await this.calcularDetalles(dto);
    const brutoC = detalles.reduce((suma, d) => suma + aCentavos(d.precioLista), 0);
    const descuentoC = detalles.reduce((suma, d) => suma + aCentavos(d.descuento), 0);
    const finalC = brutoC - descuentoC;

    const cuotas: CuotaCronograma[] = [];
    let montoInicialC: number;
    let numeroCuotas = 0;

    if (dto.modalidad === 'SEPARACION') {
      const separacionC = aCentavos(dto.montoSeparacion ?? 0);
      if (separacionC <= 0) throw new UnprocessableEntityException('Indique un monto de separación mayor que 0');
      if (separacionC > finalC) {
        throw new UnprocessableEntityException('La separación no puede ser mayor que el precio final de la venta');
      }
      montoInicialC = separacionC;
      cuotas.push({ numero: 1, tipo: 'SEPARACION', fechaVencimiento: fechaVenta, monto: deCentavos(separacionC) });
    } else {
      montoInicialC = aCentavos(dto.montoInicial ?? 0);
      numeroCuotas = dto.numeroCuotas ?? 0;
      const cronograma = this.cronograma({
        montoFinal: deCentavos(finalC),
        montoInicial: deCentavos(montoInicialC),
        numeroCuotas,
        fechaPrimeraCuota: dto.fechaPrimeraCuota ?? sumarMeses(fechaVenta, 1),
        fechaInicial: fechaVenta,
        numeroDesde: 1,
      });
      cuotas.push(...cronograma.cuotas);
    }

    const financiadoC = finalC - montoInicialC;
    const [monedaId, estadosVenta, estadoCuotaPendiente, tiposCuota] = await Promise.all([
      idOpcion(this.prisma, 'TIPO_MONEDA', dto.tipoMoneda),
      idsOpciones(this.prisma, 'ESTADO_VENTA', ['SEPARADA', 'VIGENTE']),
      idOpcion(this.prisma, 'ESTADO_CUOTA', 'PENDIENTE'),
      idsOpciones(this.prisma, 'TIPO_CUOTA', [...new Set(cuotas.map((c) => c.tipo))]),
    ]);

    const creada = await this.prisma.$transaction(async (tx) => {
      const codigo = await siguienteCodigoVenta(tx, Number(fechaVenta.slice(0, 4)));

      const venta = await tx.venta.create({
        data: {
          codigo,
          idCliente: dto.idCliente,
          idTrabajador,
          fechaVenta,
          tipoMoneda: monedaId,
          montoBruto: deCentavos(brutoC),
          descuento: deCentavos(descuentoC),
          montoFinal: deCentavos(finalC),
          montoInicial: deCentavos(montoInicialC),
          montoFinanciado: deCentavos(financiadoC),
          numeroCuotas,
          fechaFinVenta: cuotas.at(-1)?.fechaVencimiento ?? null,
          estadoComercial: estadosVenta.get(dto.modalidad === 'DIRECTA' ? 'VIGENTE' : 'SEPARADA')!,
          idUsuarioCreacion: usuario.id,
        },
        select: { id: true },
      });

      await tx.detalleVenta.createMany({
        data: detalles.map((d) => ({ ...d, idVenta: venta.id, idUsuarioCreacion: usuario.id })),
      });

      if (cuotas.length > 0) {
        await tx.cuota.createMany({
          data: cuotas.map((c) => ({
            idVenta: venta.id,
            numero: c.numero,
            tipoCuota: tiposCuota.get(c.tipo)!,
            fechaVencimiento: c.fechaVencimiento,
            monto: c.monto,
            estadoCuota: estadoCuotaPendiente,
            idUsuarioCreacion: usuario.id,
          })),
        });
      }

      return venta;
    });

    return this.obtener(creada.id);
  }

  /** PATCH /ventas/:id/formalizar — SEPARADA → VIGENTE y genera el cronograma. */
  async formalizar(
    id: number,
    dto: FormalizarVentaDto,
    usuario: UsuarioAutenticado,
  ): Promise<VentaDetalleRespuesta> {
    const venta = await this.prisma.venta.findFirst({
      where: { id, ...ACTIVO },
      select: {
        id: true,
        codigo: true,
        montoBruto: true,
        estadoComercialOpcion: { select: { codigo: true } },
        cuotas: {
          where: ACTIVO,
          select: {
            id: true,
            numero: true,
            fechaVencimiento: true,
            monto: true,
            montoPagado: true,
            tipoCuotaOpcion: { select: { codigo: true } },
            estadoCuotaOpcion: { select: { codigo: true } },
          },
        },
      },
    });
    if (!venta) throw new NotFoundException('Venta no encontrada');

    const estadoActual = venta.estadoComercialOpcion.codigo;
    if (estadoActual !== 'SEPARADA') {
      throw new UnprocessableEntityException(
        `Solo se puede formalizar una venta SEPARADA (la venta ${venta.codigo} está ${estadoActual})`,
      );
    }

    const activas = venta.cuotas.filter((c) => c.estadoCuotaOpcion.codigo !== 'ANULADA');
    const separaciones = activas.filter((c) => c.tipoCuotaOpcion.codigo === 'SEPARACION');
    const separacionPendiente = separaciones.some((c) => aCentavos(c.montoPagado) < aCentavos(c.monto));
    if (separacionPendiente) {
      throw new UnprocessableEntityException('La cuota de separación aún no está pagada: no se puede formalizar');
    }
    const separacionC = separaciones.reduce((suma, c) => suma + aCentavos(c.monto), 0);

    const brutoC = aCentavos(venta.montoBruto);
    const finalC = aCentavos(dto.montoFinal);
    if (finalC > brutoC) {
      throw new UnprocessableEntityException('El precio final no puede ser mayor que el monto bruto de la venta');
    }
    if (finalC <= 0) throw new UnprocessableEntityException('El precio final debe ser mayor que 0');

    const montoInicialC = aCentavos(dto.montoInicial);
    const numeroDesde = activas.reduce((maximo, c) => Math.max(maximo, c.numero), 0) + 1;
    const fechaPrimeraCuota = dto.fechaPrimeraCuota ?? sumarMeses(hoyISO(), 1);
    const fechaInicial = dto.fechaInicial ?? hoyISO();

    const cronograma = this.cronograma({
      montoFinal: deCentavos(finalC),
      montoInicial: deCentavos(montoInicialC),
      montoSeparacion: deCentavos(separacionC),
      numeroCuotas: dto.numeroCuotas,
      fechaPrimeraCuota,
      fechaInicial,
      numeroDesde,
    });

    const fechasExistentes = activas.map((c) => c.fechaVencimiento.toISOString().slice(0, 10));
    const fechaFinVenta = [...fechasExistentes, ...cronograma.cuotas.map((c) => c.fechaVencimiento)].sort().at(-1) ?? null;

    await this.prisma.$transaction(async (tx) => {
      // Bloquea la venta: dos formalizaciones simultáneas se atienden en fila.
      const bloqueo = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM ven_venta WHERE id = ${id} AND estado = 1 FOR UPDATE
      `;
      if (bloqueo.length === 0) throw new NotFoundException('Venta no encontrada');

      const actual = await tx.venta.findUnique({
        where: { id },
        select: { estadoComercialOpcion: { select: { codigo: true } } },
      });
      if (actual?.estadoComercialOpcion.codigo !== 'SEPARADA') {
        throw new UnprocessableEntityException('La venta cambió de estado mientras se formalizaba: vuelva a intentarlo');
      }

      if (cronograma.cuotas.length > 0) {
        const tipos = await idsOpciones(tx, 'TIPO_CUOTA', [...new Set(cronograma.cuotas.map((c) => c.tipo))]);
        const estadoPendiente = await idOpcion(tx, 'ESTADO_CUOTA', 'PENDIENTE');
        await tx.cuota.createMany({
          data: cronograma.cuotas.map((c) => ({
            idVenta: id,
            numero: c.numero,
            tipoCuota: tipos.get(c.tipo)!,
            fechaVencimiento: c.fechaVencimiento,
            monto: c.monto,
            estadoCuota: estadoPendiente,
            idUsuarioCreacion: usuario.id,
          })),
        });
      }

      // El trigger trg_venta_unidades pasa las unidades a VENDIDO.
      await tx.venta.update({
        where: { id },
        data: {
          montoFinal: deCentavos(finalC),
          descuento: deCentavos(brutoC - finalC),
          montoInicial: deCentavos(montoInicialC),
          montoFinanciado: deCentavos(finalC - montoInicialC),
          numeroCuotas: dto.numeroCuotas,
          fechaFinVenta,
          estadoComercial: await idOpcion(tx, 'ESTADO_VENTA', 'VIGENTE'),
          idUsuarioModificacion: usuario.id,
        },
      });
    });

    return this.obtener(id);
  }

  /** PATCH /ventas/:id/estado — cancelar, entregar, anular o resolver. */
  async cambiarEstado(
    id: number,
    dto: CambiarEstadoVentaDto,
    usuario: UsuarioAutenticado,
  ): Promise<VentaDetalleRespuesta> {
    const permiso =
      dto.estado === 'ANULADA' || dto.estado === 'RESUELTA' ? PERMISOS.ANULAR_VENTA : PERMISOS.CERRAR_VENTA;
    if (!usuario.permisos.has(permiso)) {
      throw new ForbiddenException(`Requiere el permiso ${permiso} para pasar la venta a ${dto.estado}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const bloqueo = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT id FROM ven_venta WHERE id = ${id} AND estado = 1 FOR UPDATE
      `;
      if (bloqueo.length === 0) throw new NotFoundException('Venta no encontrada');

      const venta = await tx.venta.findUnique({
        where: { id },
        select: { id: true, codigo: true, estadoComercialOpcion: { select: { codigo: true } } },
      });
      if (!venta) throw new NotFoundException('Venta no encontrada');

      const actual = venta.estadoComercialOpcion.codigo;
      if (!TRANSICIONES[actual]?.includes(dto.estado)) {
        throw new UnprocessableEntityException(`No se puede pasar la venta ${venta.codigo} de ${actual} a ${dto.estado}`);
      }

      if (dto.estado === 'CANCELADA') {
        const [fila] = await tx.$queryRaw<Array<{ saldo: string }>>`
          SELECT saldo::text AS saldo FROM v_venta_resumen WHERE id = ${id}
        `;
        if (aCentavos(fila?.saldo ?? '0') > 0) {
          throw new UnprocessableEntityException(
            `La venta ${venta.codigo} tiene un saldo pendiente de ${fila?.saldo}: no se puede cancelar`,
          );
        }
      }

      if (dto.estado === 'ANULADA' || dto.estado === 'RESUELTA') {
        // El trigger libera la unidad; las cuotas pendientes las anula la API.
        const [anulada, pagada] = await Promise.all([
          idOpcion(tx, 'ESTADO_CUOTA', 'ANULADA'),
          idOpcion(tx, 'ESTADO_CUOTA', 'PAGADA'),
        ]);
        await tx.cuota.updateMany({
          where: { idVenta: id, estado: 1, estadoCuota: { notIn: [anulada, pagada] } },
          data: { estadoCuota: anulada, idUsuarioModificacion: usuario.id },
        });
      }

      await tx.venta.update({
        where: { id },
        data: {
          estadoComercial: await idOpcion(tx, 'ESTADO_VENTA', dto.estado),
          idUsuarioModificacion: usuario.id,
        },
      });
    });

    return this.obtener(id);
  }

  private async calcularDetalles(dto: CrearVentaDto): Promise<DetalleCalculado[]> {
    const ids = dto.unidades.map((u) => u.idUnidad);
    if (new Set(ids).size !== ids.length) {
      throw new UnprocessableEntityException('No repita la misma unidad en la venta');
    }

    const unidades = await this.prisma.unidad.findMany({
      where: { id: { in: ids }, ...ACTIVO },
      select: {
        id: true,
        nombre: true,
        precio: true,
        estadoComercialOpcion: { select: { codigo: true } },
      },
    });
    if (unidades.length !== ids.length) throw new NotFoundException('Alguna de las unidades no existe');
    const porId = new Map(unidades.map((u) => [u.id, u]));

    return dto.unidades.map((entrada) => {
      const unidad = porId.get(entrada.idUnidad)!;
      if (unidad.estadoComercialOpcion.codigo !== 'DISPONIBLE') {
        throw new UnprocessableEntityException(
          `La unidad "${unidad.nombre}" está ${unidad.estadoComercialOpcion.codigo} y no se puede vender`,
        );
      }

      const precioLista =
        entrada.precioLista ?? (unidad.precio === null ? undefined : Number(unidad.precio));
      if (precioLista === undefined) {
        throw new UnprocessableEntityException(`La unidad "${unidad.nombre}" no tiene precio de lista: envíe precioLista`);
      }

      const precioListaC = aCentavos(precioLista);
      const descuentoC = aCentavos(entrada.descuento);
      const precioVentaC = precioListaC - descuentoC;
      if (precioVentaC < 0) {
        throw new UnprocessableEntityException(
          `El descuento de la unidad "${unidad.nombre}" no puede ser mayor que su precio de lista`,
        );
      }

      return {
        idUnidad: unidad.id,
        precioLista: deCentavos(precioListaC),
        descuento: deCentavos(descuentoC),
        precioVenta: deCentavos(precioVentaC),
      };
    });
  }

  private cronograma(parametros: Parameters<typeof calcularCronograma>[0]) {
    try {
      return calcularCronograma(parametros);
    } catch (e) {
      if (e instanceof ErrorCronograma) throw new UnprocessableEntityException(e.message);
      throw e;
    }
  }

  private async trabajadorDelUsuario(idUsuario: number): Promise<number | undefined> {
    const trabajador = await this.prisma.trabajador.findFirst({
      where: { ...ACTIVO, persona: { usuario: { id: idUsuario } } },
      select: { id: true },
    });
    return trabajador?.id;
  }

  /** Lee v_venta_resumen (la vista hace el cuadre y el saldo). */
  private async resumenes(ids: number[]): Promise<Map<number, ResumenVentaRespuesta>> {
    if (ids.length === 0) return new Map();

    const filas = await this.prisma.$queryRaw<Array<FilaResumenVenta & { id: number }>>`
      SELECT id,
             total_pagado::text           AS "totalPagado",
             saldo::text                  AS "saldo",
             mora_pendiente::text         AS "moraPendiente",
             cuotas_vencidas::int         AS "cuotasVencidas",
             COALESCE(max_dias_atraso, 0)::int AS "maxDiasAtraso",
             diferencia_inicial::text     AS "diferenciaInicial",
             diferencia_cronograma::text  AS "diferenciaCronograma"
      FROM v_venta_resumen
      WHERE id IN (${Prisma.join(ids)})
    `;

    return new Map(filas.map((f) => [f.id, toResumenVentaRespuesta(f)]));
  }
}

/** Código visible secuencial por año: V-2026-00015. El lock evita números repetidos. */
async function siguienteCodigoVenta(tx: Prisma.TransactionClient, anio: number): Promise<string> {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('ven_venta_codigo')::bigint)`;

  const filas = await tx.$queryRaw<Array<{ ultimo: number | null }>>`
    SELECT MAX(CAST(SPLIT_PART(codigo, '-', 3) AS INTEGER)) AS ultimo
    FROM ven_venta
    WHERE codigo LIKE ${`V-${anio}-%`}
  `;

  const ultimo = Number(filas[0]?.ultimo ?? 0);
  return `V-${anio}-${String(ultimo + 1).padStart(5, '0')}`;
}

function filtroBusqueda(buscar: string): Prisma.VentaWhereInput {
  const contiene = { contains: buscar, mode: 'insensitive' } as const;
  return {
    OR: [
      { codigo: contiene },
      { cliente: { persona: { nombre: contiene } } },
      { cliente: { persona: { apellidoPaterno: contiene } } },
      { cliente: { persona: { apellidoMaterno: contiene } } },
      { cliente: { persona: { documento: contiene } } },
    ],
  };
}

/** Solo para que el mapper pueda usar el nombre completo del cliente si se requiere. */
export function nombreDelCliente(cliente: { persona: Parameters<typeof nombreCompleto>[0] }): string {
  return nombreCompleto(cliente.persona);
}
