import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ESTADO_ACTIVO, ESTADO_ELIMINADO } from '../../../common/estado.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { aUsuarioAutenticado } from '../logic/permisos.logic.js';
import { hashToken, nuevoJti } from '../logic/token.logic.js';
import type { ContextoCliente, JwtPayload } from '../model/auth.types.js';
import { usuarioConAccesosSelect, type UsuarioConAccesos } from '../model/usuario.select.js';

/**
 * Sesiones con JWT + auth_sesiones:
 *  - El JWT prueba quién es el usuario y cuándo vence (sin ir a la BD).
 *  - auth_sesiones permite cerrar la sesión antes de que venza (logout)
 *    y que un cambio de roles/permisos aplique en el siguiente request.
 */
@Injectable()
export class SesionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async crear(usuario: UsuarioConAccesos, cliente: ContextoCliente) {
    const payload: JwtPayload = { sub: usuario.id, username: usuario.username, jti: nuevoJti() };
    const token = await this.jwt.signAsync(payload);

    const sesion = await this.prisma.sesion.create({
      data: {
        idUsuario: usuario.id,
        tokenHash: hashToken(token),
        ip: cliente.ip?.slice(0, 45),
        userAgent: cliente.userAgent?.slice(0, 500),
        idUsuarioCreacion: usuario.id,
      },
      select: { id: true },
    });

    return { token, usuario: aUsuarioAutenticado(usuario, sesion.id) };
  }

  /** Devuelve el usuario si el token es válido y su sesión sigue abierta; si no, null. */
  async validar(token: string): Promise<UsuarioAutenticado | null> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      return null; // firma inválida o token vencido
    }

    const sesion = await this.prisma.sesion.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { id: true, idUsuario: true, estado: true, fechaFin: true, usuario: { select: usuarioConAccesosSelect } },
    });

    const abierta =
      sesion &&
      sesion.estado === ESTADO_ACTIVO &&
      sesion.fechaFin === null &&
      sesion.idUsuario === payload.sub &&
      sesion.usuario.estado === ESTADO_ACTIVO;

    return abierta ? aUsuarioAutenticado(sesion.usuario, sesion.id) : null;
  }

  async cerrar(idSesion: number, idUsuario: number): Promise<void> {
    await this.prisma.sesion.update({
      where: { id: idSesion },
      data: { estado: ESTADO_ELIMINADO, fechaFin: new Date(), idUsuarioModificacion: idUsuario },
    });
  }
}
