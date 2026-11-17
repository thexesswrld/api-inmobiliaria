import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ACTIVO } from '../../../common/estado.js';
import { idOpcion, idsOpciones } from '../../../common/opciones/opciones.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { armarArbolSectores } from '../logic/arbol-sectores.logic.js';
import type { ModelosQuery } from '../model/dto/modelos-query.dto.js';
import type { ProyectosQuery } from '../model/dto/proyectos-query.dto.js';
import { toModeloRespuesta, toProyectoRespuesta, toSectorRespuesta } from '../model/proyecto.mapper.js';
import { modeloSelect, proyectoSelect, sectorSelect } from '../model/proyecto.select.js';
import type {
  ModeloRespuesta,
  ProyectoDetalleRespuesta,
  ProyectoRespuesta,
  SectorArbolRespuesta,
} from '../model/respuestas.js';

@Injectable()
export class ProyectosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: ProyectosQuery): Promise<Paginado<ProyectoRespuesta>> {
    const where: Prisma.ProyectoWhereInput = {
      ...ACTIVO,
      ...(query.idEmpresa ? { idEmpresa: query.idEmpresa } : {}),
      ...(query.tipo ? { tipoProyecto: await idOpcion(this.prisma, 'TIPO_PROYECTO', query.tipo) } : {}),
      ...(query.buscar ? { nombre: { contains: query.buscar, mode: 'insensitive' } } : {}),
    };

    const [proyectos, total] = await Promise.all([
      this.prisma.proyecto.findMany({
        where,
        select: proyectoSelect,
        orderBy: { nombre: 'asc' },
        ...rango(query),
      }),
      this.prisma.proyecto.count({ where }),
    ]);

    return paginado(proyectos.map(toProyectoRespuesta), total, query);
  }

  async obtener(id: number): Promise<ProyectoDetalleRespuesta> {
    const proyecto = await this.prisma.proyecto.findFirst({
      where: { id, ...ACTIVO },
      select: proyectoSelect,
    });
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const estados = await idsOpciones(this.prisma, 'ESTADO_UNIDAD', [
      'DISPONIBLE',
      'SEPARADO',
      'VENDIDO',
      'ENTREGADO',
    ]);

    const donde = { ...ACTIVO, sector: { idProyecto: id } } satisfies Prisma.UnidadWhereInput;
    const [totalUnidades, disponibles, separadas, vendidas, entregadas] = await Promise.all([
      this.prisma.unidad.count({ where: donde }),
      this.prisma.unidad.count({ where: { ...donde, estadoComercial: estados.get('DISPONIBLE') } }),
      this.prisma.unidad.count({ where: { ...donde, estadoComercial: estados.get('SEPARADO') } }),
      this.prisma.unidad.count({ where: { ...donde, estadoComercial: estados.get('VENDIDO') } }),
      this.prisma.unidad.count({ where: { ...donde, estadoComercial: estados.get('ENTREGADO') } }),
    ]);

    return {
      ...toProyectoRespuesta(proyecto),
      totalUnidades,
      unidadesDisponibles: disponibles,
      unidadesSeparadas: separadas,
      unidadesVendidas: vendidas,
      unidadesEntregadas: entregadas,
    };
  }

  /** Árbol Etapa > Manzana > Lote / Torre > Piso. */
  async sectores(idProyecto: number): Promise<SectorArbolRespuesta[]> {
    await this.verificarProyecto(idProyecto);

    const sectores = await this.prisma.sector.findMany({
      where: { idProyecto, ...ACTIVO },
      select: sectorSelect,
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    });

    return armarArbolSectores(sectores.map(toSectorRespuesta)) as SectorArbolRespuesta[];
  }

  /** Modelos del proyecto con sus zonas clicables (plano interactivo). */
  async modelos(idProyecto: number, query: ModelosQuery): Promise<ModeloRespuesta[]> {
    await this.verificarProyecto(idProyecto);

    const modelos = await this.prisma.modelo.findMany({
      where: {
        idProyecto,
        ...ACTIVO,
        ...(query.idSector ? { idSector: query.idSector } : {}),
        ...(query.idUnidad ? { idUnidad: query.idUnidad } : {}),
        ...(query.tipo ? { tipoModelo: await idOpcion(this.prisma, 'TIPO_MODELO', query.tipo) } : {}),
      },
      select: modeloSelect,
      orderBy: [{ esPrincipal: 'desc' }, { orden: 'asc' }, { id: 'asc' }],
    });

    return modelos.map(toModeloRespuesta);
  }

  private async verificarProyecto(idProyecto: number): Promise<void> {
    const existe = await this.prisma.proyecto.findFirst({
      where: { id: idProyecto, ...ACTIVO },
      select: { id: true },
    });
    if (!existe) throw new NotFoundException('Proyecto no encontrado');
  }
}
