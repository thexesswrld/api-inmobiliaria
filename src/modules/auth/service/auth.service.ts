import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ESTADO_ACTIVO } from '../../../common/estado.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import type { Env } from '../../../config/env.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { verificarPassword } from '../logic/password.logic.js';
import type { ContextoCliente } from '../model/auth.types.js';
import type { LoginDto } from '../model/dto/login.dto.js';
import type { LoginRespuesta } from '../model/respuestas.js';
import { toLoginRespuesta } from '../model/usuario.mapper.js';
import { usuarioConAccesosSelect } from '../model/usuario.select.js';
import { SesionesService } from './sesiones.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sesiones: SesionesService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async login(dto: LoginDto, cliente: ContextoCliente): Promise<LoginRespuesta> {
    // Único lugar donde se lee password_hash (PrismaService lo omite por defecto).
    const encontrado = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
      select: { ...usuarioConAccesosSelect, passwordHash: true },
    });

    const activo = encontrado?.estado === ESTADO_ACTIVO ? encontrado : null;
    const valido = await verificarPassword(dto.password, activo?.passwordHash ?? null);

    // Mismo mensaje para "no existe", "inactivo" y "contraseña mal": no dar pistas.
    if (!activo || !valido) throw new UnauthorizedException('Usuario o contraseña incorrectos');

    const { passwordHash: _, ...usuario } = activo;
    const sesion = await this.sesiones.crear(usuario, cliente);
    return toLoginRespuesta(sesion.token, this.config.get('JWT_EXPIRA_EN', { infer: true }), sesion.usuario);
  }

  logout(usuario: UsuarioAutenticado): Promise<void> {
    return this.sesiones.cerrar(usuario.idSesion, usuario.id);
  }
}
