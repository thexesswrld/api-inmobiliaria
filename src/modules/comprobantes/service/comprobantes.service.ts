import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { hoyISO } from '../../../common/cronograma/cronograma.js';
import { ACTIVO } from '../../../common/estado.js';
import { nombreCompleto } from '../../../common/formato/formato.js';
import { idOpcion } from '../../../common/opciones/opciones.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { calcularIgv } from '../logic/igv.logic.js';
import type { ActualizarSunatDto } from '../model/dto/actualizar-sunat.dto.js';
import type { AnularComprobanteDto } from '../model/dto/anular-comprobante.dto.js';
import type { ComprobantesQuery } from '../model/dto/comprobantes-query.dto.js';
import type { EmitirComprobanteDto } from '../model/dto/emitir-comprobante.dto.js';
import { toComprobanteRespuesta } from '../model/comprobante.mapper.js';
import { comprobanteSelect } from '../model/comprobante.select.js';
import type { ComprobanteRespuesta } from '../model/respuestas.js';

/** Tipos que se emiten desde un pago. Las notas necesitan comprobante de referencia. */
const TIPOS_NOTA = new Set(['NOTA_CREDITO', 'NOTA_DEBITO']);

/** Transiciones válidas de ven_comprobante.estado_sunat. */
const TRANSICIONES_SUNAT: Record<string, readonly string[]> = {
  NO_APLICA: [],
  PENDIENTE: ['ENVIADO', 'RECHAZADO'],
  ENVIADO: ['ACEPTADO', 'OBSERVADO', 'RECHAZADO'],
  OBSERVADO: ['ACEPTADO', 'RECHAZADO'],
  RECHAZADO: ['ENVIADO'],
  ACEPTADO: ['BAJA'],
  BAJA: [],
};

@Injectable()
export class ComprobantesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: ComprobantesQuery): Promise<Paginado<ComprobanteRespuesta>> {
    const where: Prisma.ComprobanteWhereInput = {
      ...ACTIVO,
      ...(query.estado ? { estadoOpcion: { codigo: query.estado } } : {}),
      ...(query.estadoSunat ? { estadoSunatOpcion: { codigo: query.estadoSunat } } : {}),
      ...(query.tipoComprobante ? { tipoComprobanteOpcion: { codigo: query.tipoComprobante } } : {}),
      ...(query.idCliente ? { idCliente: query.idCliente } : {}),
      ...(query.idPago ? { idPago: query.idPago } : {}),
      ...(query.serie ? { serie: query.serie.toUpperCase() } : {}),
      ...(query.desde ? { fechaEmision: { gte: query.desde } } : {}),
      ...(query.hasta ? { fechaEmision: { lte: query.hasta } } : {}),
      ...(query.buscar ? filtroBusqueda(query.buscar) : {}),
    };

    const [comprobantes, total] = await Promise.all([
      this.prisma.comprobante.findMany({
        where,
        select: comprobanteSelect,
        orderBy: { id: 'desc' },
        ...rango(query),
      }),
      this.prisma.comprobante.count({ where }),
    ]);

    return paginado(comprobantes.map(toComprobanteRespuesta), total, query);
  }

  async obtener(id: number): Promise<ComprobanteRespuesta> {
    const comprobante = await this.prisma.comprobante.findFirst({
      where: { id, ...ACTIVO },
      select: comprobanteSelect,
    });
    if (!comprobante) throw new NotFoundException('Comprobante no encontrado');
    return toComprobanteRespuesta(comprobante);
  }

  async listarDePago(idPago: number, query: ComprobantesQuery): Promise<Paginado<ComprobanteRespuesta>> {
    const pago = await this.prisma.pago.findFirst({ where: { id: idPago, ...ACTIVO }, select: { id: true } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return this.listar({ ...query, idPago });
  }

  /**
   * POST /pagos/:id/comprobante
   * Copia los datos del cliente, calcula el IGV y toma el correlativo de la
   * serie con `fn_siguiente_numero_comprobante` dentro de la transacción.
   */
  async emitir(idPago: number, dto: EmitirComprobanteDto, usuario: UsuarioAutenticado): Promise<ComprobanteRespuesta> {
    const pago = await this.prisma.pago.findFirst({
      where: { id: idPago, ...ACTIVO },
      select: {
        id: true,
        monto: true,
        tipoCambio: true,
        estadoPagoOpcion: { select: { codigo: true } },
        moneda: { select: { id: true } },
        venta: {
          select: {
            id: true,
            cliente: {
              select: {
                id: true,
                persona: {
                  select: {
                    nombre: true,
                    apellidoPaterno: true,
                    apellidoMaterno: true,
                    documento: true,
                    direccion: true,
                    tipoDocumentoOpcion: { select: { codigo: true, codigoExterno: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    const estadoPago = pago.estadoPagoOpcion.codigo;
    if (estadoPago === 'ANULADO' || estadoPago === 'RECHAZADO') {
      throw new UnprocessableEntityException(`El pago ${idPago} está ${estadoPago} y no puede generar comprobantes`);
    }

    const existente = await this.prisma.comprobante.findFirst({
      where: { idPago, ...ACTIVO, estadoOpcion: { codigo: { not: 'ANULADO' } } },
      select: { id: true, serie: true, numero: true },
    });
    if (existente) {
      throw new UnprocessableEntityException(
        `El pago ${idPago} ya tiene el comprobante ${existente.serie.trim()}-${String(existente.numero).padStart(8, '0')}`,
      );
    }

    const serie = await this.prisma.serie.findFirst({
      where: { id: dto.idSerie, ...ACTIVO },
      select: {
        id: true,
        serie: true,
        tipoComprobante: true,
        tipoComprobanteOpcion: { select: { codigo: true } },
      },
    });
    if (!serie) throw new NotFoundException('Serie no encontrada o inactiva');

    const tipo = serie.tipoComprobanteOpcion.codigo;
    if (TIPOS_NOTA.has(tipo) && dto.idComprobanteReferencia === undefined) {
      throw new UnprocessableEntityException(`Indique idComprobanteReferencia para emitir una ${tipo}`);
    }

    if (dto.idComprobanteReferencia !== undefined) {
      const referencia = await this.prisma.comprobante.findFirst({
        where: { id: dto.idComprobanteReferencia, ...ACTIVO },
        select: { id: true, idCliente: true },
      });
      if (!referencia) throw new NotFoundException('Comprobante de referencia no encontrado');
      if (referencia.idCliente !== pago.venta.cliente.id) {
        throw new UnprocessableEntityException('El comprobante de referencia pertenece a otro cliente');
      }
    }

    const desglose = calcularIgv(pago.monto);
    const { persona } = pago.venta.cliente;
    const clienteTipoDocumento = (
      persona.tipoDocumentoOpcion.codigoExterno ?? persona.tipoDocumentoOpcion.codigo
    ).slice(0, 2);

    const [estadoEmitido, estadoSunatPendiente] = await Promise.all([
      idOpcion(this.prisma, 'ESTADO_COMPROBANTE', 'EMITIDO'),
      idOpcion(this.prisma, 'ESTADO_SUNAT', 'PENDIENTE'),
    ]);

    const creado = await this.prisma.$transaction(async (tx) => {
      const [fila] = await tx.$queryRaw<Array<{ numero: number }>>`
        SELECT fn_siguiente_numero_comprobante(${serie.id}) AS numero
      `;

      return tx.comprobante.create({
        data: {
          idSerie: serie.id,
          tipoComprobante: serie.tipoComprobante,
          serie: serie.serie,
          numero: fila.numero,
          fechaEmision: dto.fechaEmision ?? hoyISO(),
          idPago,
          idCliente: pago.venta.cliente.id,
          clienteTipoDocumento,
          clienteNumeroDocumento: persona.documento,
          clienteRazonSocial: nombreCompleto(persona),
          clienteDireccion: persona.direccion,
          tipoMoneda: pago.moneda.id,
          tipoCambio: dto.tipoCambio === undefined ? pago.tipoCambio : Number(dto.tipoCambio.toFixed(4)),
          opGravada: desglose.opGravada,
          opExonerada: '0.00',
          opInafecta: '0.00',
          porcentajeIgv: desglose.porcentajeIgv,
          igv: desglose.igv,
          total: desglose.total,
          idComprobanteReferencia: dto.idComprobanteReferencia ?? null,
          glosa: dto.glosa ?? null,
          observaciones: dto.observaciones ?? null,
          estadoComprobante: estadoEmitido,
          estadoSunat: estadoSunatPendiente,
          idUsuarioCreacion: usuario.id,
        },
        select: { id: true },
      });
    });

    return this.obtener(creado.id);
  }

  /** PATCH /comprobantes/:id/anular */
  async anular(id: number, dto: AnularComprobanteDto, usuario: UsuarioAutenticado): Promise<ComprobanteRespuesta> {
    const comprobante = await this.prisma.comprobante.findFirst({
      where: { id, ...ACTIVO },
      select: { id: true, serie: true, numero: true, estadoOpcion: { select: { codigo: true } } },
    });
    if (!comprobante) throw new NotFoundException('Comprobante no encontrado');

    if (comprobante.estadoOpcion.codigo === 'ANULADO') {
      throw new UnprocessableEntityException(
        `El comprobante ${comprobante.serie.trim()}-${String(comprobante.numero).padStart(8, '0')} ya está ANULADO`,
      );
    }

    await this.prisma.comprobante.update({
      where: { id },
      data: {
        estadoComprobante: await idOpcion(this.prisma, 'ESTADO_COMPROBANTE', 'ANULADO'),
        motivoAnulacion: dto.motivoAnulacion,
        idUsuarioModificacion: usuario.id,
      },
    });

    return this.obtener(id);
  }

  /** PATCH /comprobantes/:id/sunat — registra la respuesta de SUNAT u OSE. */
  async actualizarSunat(
    id: number,
    dto: ActualizarSunatDto,
    usuario: UsuarioAutenticado,
  ): Promise<ComprobanteRespuesta> {
    const comprobante = await this.prisma.comprobante.findFirst({
      where: { id, ...ACTIVO },
      select: {
        id: true,
        serie: true,
        numero: true,
        estadoOpcion: { select: { codigo: true } },
        estadoSunatOpcion: { select: { codigo: true } },
      },
    });
    if (!comprobante) throw new NotFoundException('Comprobante no encontrado');

    const numero = `${comprobante.serie.trim()}-${String(comprobante.numero).padStart(8, '0')}`;
    if (comprobante.estadoOpcion.codigo === 'ANULADO') {
      throw new UnprocessableEntityException(`El comprobante ${numero} está ANULADO: no se envía a SUNAT`);
    }

    const actual = comprobante.estadoSunatOpcion.codigo;
    if (!TRANSICIONES_SUNAT[actual]?.includes(dto.estado)) {
      throw new UnprocessableEntityException(`No se puede pasar el comprobante ${numero} de ${actual} a ${dto.estado}`);
    }

    await this.prisma.comprobante.update({
      where: { id },
      data: {
        estadoSunat: await idOpcion(this.prisma, 'ESTADO_SUNAT', dto.estado),
        ...(dto.hashCpe !== undefined ? { hashCpe: dto.hashCpe } : {}),
        ...(dto.urlPdf !== undefined ? { urlPdf: dto.urlPdf } : {}),
        ...(dto.urlXml !== undefined ? { urlXml: dto.urlXml } : {}),
        ...(dto.urlCdr !== undefined ? { urlCdr: dto.urlCdr } : {}),
        ...(dto.mensajeSunat !== undefined ? { mensajeSunat: dto.mensajeSunat } : {}),
        fechaEnvioSunat: dto.fechaEnvioSunat
          ? new Date(dto.fechaEnvioSunat)
          : dto.estado === 'ENVIADO'
            ? new Date()
            : undefined,
        idUsuarioModificacion: usuario.id,
      },
    });

    return this.obtener(id);
  }
}

function filtroBusqueda(buscar: string): Prisma.ComprobanteWhereInput {
  // "B001-00000124" se busca como serie + número exactos.
  const completo = /^([A-Za-z0-9]{1,4})-(\d{1,8})$/.exec(buscar);
  if (completo) return { serie: completo[1].toUpperCase(), numero: Number(completo[2]) };

  const contiene = { contains: buscar, mode: 'insensitive' } as const;
  const OR: Prisma.ComprobanteWhereInput[] = [
    { serie: contiene },
    { clienteRazonSocial: contiene },
    { clienteNumeroDocumento: contiene },
  ];
  if (/^\d+$/.test(buscar)) OR.push({ numero: Number(buscar) });
  return { OR };
}
