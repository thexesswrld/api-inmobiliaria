import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Cliente,
  IsPublic,
  UsuarioActual,
  type DatosCliente,
} from '../../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../../common/auth/usuario-autenticado.js';
import { ApiBodyZod } from '../../../common/swagger/documentacion.js';
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
  @ApiBodyZod(LoginSchema, 'Credenciales del usuario.')
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: [
      '**Para qué sirve:** valida usuario y contraseña y entrega el token JWT que se usa en el resto de endpoints.',
      '**Permiso:** no requiere token (`@IsPublic`).',
      '**Body:** `username` y `password`.',
      '**Devuelve:** `{ token, tipo, expiraEn, usuario }`; `usuario` trae sus roles y sus permisos (`modulo.entidad.accion`).',
      '**Cómo usarlo:** copia `data.token` y pégalo en el botón **Authorize** de Swagger.',
      '**Errores:** `401` si el usuario no existe, está inactivo o la contraseña no coincide.',
    ].join('\n\n'),
  })
  login(@Body({ schema: LoginSchema }) dto: LoginDto, @Cliente() cliente: DatosCliente) {
    return this.auth.login(dto, cliente);
  }

  /** POST /auth/logout → cierra la sesión del token usado */
  @Post('logout')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cerrar sesión',
    description: [
      '**Para qué sirve:** invalida el token con el que se llama; deja de servir de inmediato.',
      '**Permiso:** solo requiere sesión.',
      '**Devuelve:** `data: null`.',
      '**Errores:** `401` si el token ya no es válido.',
    ].join('\n\n'),
  })
  async logout(@UsuarioActual() usuario: UsuarioAutenticado) {
    await this.auth.logout(usuario);
    return null;
  }

  /** GET /auth/me → usuario de la sesión con sus roles y permisos */
  @Get('me')
  @ApiOperation({
    summary: 'Usuario de la sesión',
    description: [
      '**Para qué sirve:** confirma quién está autenticado y qué puede hacer; útil para armar el menú del frontend.',
      '**Permiso:** solo requiere sesión.',
      '**Devuelve:** datos del usuario, sus roles y la lista de permisos efectivos.',
      '**Errores:** `401` sin token o con token vencido.',
    ].join('\n\n'),
  })
  me(@UsuarioActual() usuario: UsuarioAutenticado) {
    return toUsuarioSesionRespuesta(usuario);
  }
}
