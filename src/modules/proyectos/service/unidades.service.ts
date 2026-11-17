import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { idOpcion } from '../../../common/opciones/opciones.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CambiarEstadoUnidadDto, UnidadesQuery } from '../model/dto/unidades-query.dto.js';
import { toUnidadDetalleRespuesta, toUnidadRespuesta } from '../model/proyecto.mapper.js';
import { unidadDetalleSelect, unidadSelect } from '../model/proyecto.select.js';
import type { UnidadDetalleRespuesta, UnidadRespuesta } from '../model/respuestas.js';

const ESTADOS_MANUALES = new Set(['DISPONIBLE', 'BLOQUEADO']);

@Injectable()
export class UnidadesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: UnidadesQuery): Promise<Paginado<UnidadRespuesta>> {
    const where: Prisma.UnidadWhereInput = {
      ...ACTIVO,
      ...(query.idSector ? { idSector: query.idSector } : {}),
      ...(query.idProyecto ? { sector: { idProyecto: query.idProyecto } } : {}),
      ...(query.estado ? { estadoComercial: await idOpcion(this.prisma, 'ESTADO_UNIDAD', query.estado) } : {}),
      ...(query.tipo ? { tipoUnidad: await idOpcion(this.prisma, 'TIPO_UNIDAD', query.tipo) } : {}),
      ...(query.buscar ? { nombre: { contains: query.buscar, mode: 'insensitive' } } : {}),
    };

    const [unidades, total] = await Promise.all([
      this.prisma.unidad.findMany({
        where,
        select: unidadSelect,
        orderBy: [{ idSector: 'asc' }, { nombre: 'asc' }],
        ...rango(query),
      }),
      this.prisma.unidad.count({ where }),
    ]);

    return paginado(unidades.map(toUnidadRespuesta), total, query);
  }

  async obtener(id: number): Promise<UnidadDetalleRespuesta> {
    const unidad = await this.prisma.unidad.findFirst({
      where: { id, ...ACTIVO },
      select: unidadDetalleSelect,
    });
    if (!unidad) throw new NotFoundException('Unidad no encontrada');
    return toUnidadDetalleRespuesta(unidad);
  }

  /**
   * Bloqueo manual: solo alterna DISPONIBLE ↔ BLOQUEADO.
   * Las demás transiciones las gobiernan las ventas y sus triggers.
   */
  async cambiarEstado(id: number, dto: CambiarEstadoUnidadDto, idUsuario: number): Promise<UnidadDetalleRespuesta> {
    const unidad = await this.prisma.unidad.findFirst({
      where: { id, ...ACTIVO },
      select: { id: true, nombre: true, estadoComercialOpcion: { select: { codigo: true } } },
    });
    if (!unidad) throw new NotFoundException('Unidad no encontrada');

    const actual = unidad.estadoComercialOpcion.codigo;
    if (!ESTADOS_MANUALES.has(actual)) {
      throw new UnprocessableEntityException(
        `La unidad "${unidad.nombre}" está ${actual}: cambie su estado desde la venta correspondiente`,
      );
    }

    if (actual !== dto.estado) {
      await this.prisma.unidad.update({
        where: { id },
        data: {
          estadoComercial: await idOpcion(this.prisma, 'ESTADO_UNIDAD', dto.estado),
          idUsuarioModificacion: idUsuario,
        },
      });
    }

    return this.obtener(id);
  }
}
