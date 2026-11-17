import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ACTIVO } from '../../../common/estado.js';
import { ErrorCronograma, simularCronograma } from '../../../common/cronograma/cronograma.js';
import { toOpcion } from '../../../common/opciones/opciones.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { SimularCotizacionDto } from '../model/dto/simular-cotizacion.dto.js';
import type { CotizacionRespuesta, UnidadCotizadaRespuesta } from '../model/respuestas.js';

@Injectable()
export class CotizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Simula el cronograma. No escribe nada en la base. */
  async simular(dto: SimularCotizacionDto): Promise<CotizacionRespuesta> {
    let unidad: UnidadCotizadaRespuesta | null = null;
    let precioLista = dto.precioLista;

    if (dto.idUnidad !== undefined) {
      const encontrada = await this.prisma.unidad.findFirst({
        where: { id: dto.idUnidad, ...ACTIVO },
        select: {
          id: true,
          nombre: true,
          precio: true,
          estadoComercialOpcion: { select: { codigo: true, nombre: true } },
          sector: { select: { nombre: true, proyecto: { select: { nombre: true } } } },
        },
      });
      if (!encontrada) throw new NotFoundException('Unidad no encontrada');

      if (precioLista === undefined) {
        if (encontrada.precio === null) {
          throw new UnprocessableEntityException('La unidad no tiene precio de lista: envíe precioLista');
        }
        precioLista = Number(encontrada.precio);
      }

      unidad = {
        id: encontrada.id,
        nombre: encontrada.nombre,
        estado: toOpcion(encontrada.estadoComercialOpcion),
        proyecto: encontrada.sector.proyecto.nombre,
        sector: encontrada.sector.nombre,
        disponible: encontrada.estadoComercialOpcion.codigo === 'DISPONIBLE',
      };
    }

    if (precioLista === undefined) {
      throw new UnprocessableEntityException('Indique idUnidad o precioLista');
    }

    try {
      const cronograma = simularCronograma({
        precioLista,
        descuento: dto.descuento,
        montoInicial: dto.montoInicial,
        numeroCuotas: dto.numeroCuotas,
        montoSeparacion: dto.montoSeparacion,
        incluirSeparacion: dto.incluirSeparacion,
        fechaPrimeraCuota: dto.fechaPrimeraCuota,
      });
      return { unidad, ...cronograma };
    } catch (e) {
      if (e instanceof ErrorCronograma) throw new UnprocessableEntityException(e.message);
      throw e;
    }
  }
}
