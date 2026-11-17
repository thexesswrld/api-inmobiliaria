import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { paginado } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CuotasQuery } from '../model/dto/cuotas-query.dto.js';
import { toCuotaListadoRespuesta, type FilaCuota, type NombresCuota } from '../model/cuota.mapper.js';
import type { CuotaListadoRespuesta } from '../model/respuestas.js';

/** Joins comunes a v_cuota_estado con la venta y su cliente. */
const DESDE = Prisma.sql`
  FROM v_cuota_estado ce
  JOIN ven_cuota   c  ON c.id = ce.id
  JOIN ven_venta   v  ON v.id = ce.id_venta AND v.estado = 1
  JOIN per_cliente cl ON cl.id = v.id_cliente
  JOIN per_persona p  ON p.id = cl.id_persona
`;

@Injectable()
export class CuotasService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /cuotas
   * Lee v_cuota_estado: saldo, mora y días de atraso calculados a la fecha,
   * sin depender de que el job diario ya haya pasado.
   */
  async listar(query: CuotasQuery): Promise<Paginado<CuotaListadoRespuesta>> {
    const filtros: Prisma.Sql[] = [];
    if (query.estado) filtros.push(Prisma.sql`ce.estado_real = ${query.estado}`);
    if (query.tipoCuota) filtros.push(Prisma.sql`ce.tipo_cuota = ${query.tipoCuota}`);
    if (query.idVenta) filtros.push(Prisma.sql`ce.id_venta = ${query.idVenta}`);
    if (query.idCliente) filtros.push(Prisma.sql`v.id_cliente = ${query.idCliente}`);
    if (query.desde) filtros.push(Prisma.sql`ce.fecha_vencimiento >= ${query.desde}`);
    if (query.hasta) filtros.push(Prisma.sql`ce.fecha_vencimiento <= ${query.hasta}`);
    if (query.vencidas !== undefined) {
      filtros.push(query.vencidas ? Prisma.sql`ce.dias_atraso > 0` : Prisma.sql`ce.dias_atraso = 0`);
    }
    if (query.buscar) {
      const patron = `%${query.buscar}%`;
      filtros.push(Prisma.sql`(
        v.codigo ILIKE ${patron}
        OR p.nombre ILIKE ${patron}
        OR p.apellido_paterno ILIKE ${patron}
        OR p.apellido_materno ILIKE ${patron}
        OR p.documento ILIKE ${patron}
      )`);
    }

    const where = filtros.length > 0 ? Prisma.sql`WHERE ${Prisma.join(filtros, ' AND ')}` : Prisma.empty;
    const offset = (query.pagina - 1) * query.porPagina;

    const [filas, conteo, nombres] = await Promise.all([
      this.prisma.$queryRaw<FilaCuota[]>(Prisma.sql`
        SELECT ce.id,
               ce.numero,
               ce.id_venta                      AS "idVenta",
               v.codigo                         AS "ventaCodigo",
               cl.id                            AS "clienteId",
               p.nombre,
               p.apellido_paterno               AS "apellidoPaterno",
               p.apellido_materno               AS "apellidoMaterno",
               p.documento,
               ce.tipo_cuota                    AS "tipoCuota",
               fn_codigo_opcion(c.estado_cuota) AS "estadoCuota",
               ce.estado_real                   AS "estadoReal",
               ce.fecha_vencimiento::text       AS "fechaVencimiento",
               ce.monto::text                   AS "monto",
               ce.monto_pagado::text            AS "montoPagado",
               ce.saldo_capital::text           AS "saldo",
               ce.monto_mora::text              AS "montoMora",
               ce.monto_mora_pagado::text       AS "montoMoraPagado",
               ce.saldo_mora::text              AS "saldoMora",
               ce.dias_atraso::int              AS "diasAtraso"
        ${DESDE}
        ${where}
        ORDER BY ce.fecha_vencimiento ASC, ce.id_venta ASC, ce.numero ASC
        LIMIT ${query.porPagina} OFFSET ${offset}
      `),
      this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        ${DESDE}
        ${where}
      `),
      this.nombres(),
    ]);

    return paginado(
      filas.map((f) => toCuotaListadoRespuesta(f, nombres)),
      Number(conteo[0]?.total ?? 0),
      query,
    );
  }

  /** GET /ventas/:id/cuotas */
  async listarDeVenta(idVenta: number, query: CuotasQuery): Promise<Paginado<CuotaListadoRespuesta>> {
    const venta = await this.prisma.venta.findFirst({ where: { id: idVenta, ...ACTIVO }, select: { id: true } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    return this.listar({ ...query, idVenta });
  }

  /** POST /cuotas/marcar-vencidas y job diario. La regla vive en la función de la base. */
  async marcarVencidas(): Promise<{ marcadas: number }> {
    const [fila] = await this.prisma.$queryRaw<Array<{ marcadas: number }>>`
      SELECT fn_marcar_cuotas_vencidas() AS marcadas
    `;
    return { marcadas: Number(fila?.marcadas ?? 0) };
  }

  /** Nombres de TIPO_CUOTA y ESTADO_CUOTA para no mostrar solo códigos. */
  private async nombres(): Promise<NombresCuota> {
    const opciones = await this.prisma.opcionLista.findMany({
      where: { ...ACTIVO, lista: { codigo: { in: ['TIPO_CUOTA', 'ESTADO_CUOTA'] } } },
      select: { codigo: true, nombre: true, lista: { select: { codigo: true } } },
    });

    const tipo = new Map<string, string>();
    const estado = new Map<string, string>();
    for (const o of opciones) {
      (o.lista.codigo === 'TIPO_CUOTA' ? tipo : estado).set(o.codigo, o.nombre);
    }
    return { tipo, estado };
  }
}
