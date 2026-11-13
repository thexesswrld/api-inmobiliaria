import { Body, Controller, Get, Headers, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPublic, UsuarioActual } from '../../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { LoginSchema, type LoginDto } from '../model/dto/login.dto.js';
import { toUsuarioSesionRespuesta } from '../model/usuario.mapper.js';
import { AuthService } from '../service/auth.service.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** POST /auth/login → { token, tipo, expiraEn, usuario } */
  @IsPublic()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión', description: 'Devuelve el token JWT y los roles y permisos del usuario.' })
  login(
    @Body({ schema: LoginSchema }) dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.login(dto, { ip, userAgent });
  }

  /** POST /auth/logout → cierra la sesión del token usado */
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cerrar sesión', description: 'El token usado deja de servir de inmediato.' })
  async logout(@UsuarioActual() usuario: UsuarioAutenticado) {
    await this.auth.logout(usuario);
    return null;
  }

  /** GET /auth/me → usuario de la sesión con sus roles y permisos */
  @Get('me')
  @ApiOperation({ summary: 'Usuario de la sesión', description: 'Datos, roles y permisos del usuario del token.' })
  me(@UsuarioActual() usuario: UsuarioAutenticado) {
    return toUsuarioSesionRespuesta(usuario);
  }
}
