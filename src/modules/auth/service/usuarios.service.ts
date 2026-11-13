import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { paginado, rango } from '../../../common/paginacion/paginacion.js';
import type { Paginado } from '../../../common/respuesta/respuesta.types.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UsuariosQuery } from '../model/dto/usuarios-query.dto.js';
import type { UsuarioRespuesta } from '../model/respuestas.js';
import { toUsuarioRespuesta } from '../model/usuario.mapper.js';
import { usuarioDetalleSelect } from '../model/usuario.select.js';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: UsuariosQuery): Promise<Paginado<UsuarioRespuesta>> {
    const where = filtroBusqueda(query.buscar);
    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({ where, select: usuarioDetalleSelect, orderBy: { username: 'asc' }, ...rango(query) }),
      this.prisma.usuario.count({ where }),
    ]);
    return paginado(usuarios.map(toUsuarioRespuesta), total, query);
  }

  async obtener(id: number): Promise<UsuarioRespuesta> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id }, select: usuarioDetalleSelect });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return toUsuarioRespuesta(usuario);
  }
}

function filtroBusqueda(buscar?: string): Prisma.UsuarioWhereInput {
  if (!buscar) return {};
  const contiene = { contains: buscar, mode: 'insensitive' } as const;
  return {
    OR: [
      { username: contiene },
      { persona: { nombre: contiene } },
      { persona: { apellidoPaterno: contiene } },
      { persona: { apellidoMaterno: contiene } },
      { persona: { documento: contiene } },
    ],
  };
}
