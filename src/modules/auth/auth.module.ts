import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import type { Env } from '../../config/env.js';
import { AuthGuard } from './auth.guard.js';
import { AuthController } from './controllers/auth.controller.js';
import { UsuariosController } from './controllers/usuarios.controller.js';
import { AuthService } from './service/auth.service.js';
import { PermisosVerificadorService } from './service/permisos-verificador.service.js';
import { SesionesService } from './service/sesiones.service.js';
import { UsuariosService } from './service/usuarios.service.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRA_EN', { infer: true }) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, UsuariosController],
  providers: [
    AuthService,
    SesionesService,
    UsuariosService,
    PermisosVerificadorService,
    // Protege TODOS los endpoints de la app. Usa @IsPublic() para abrir uno.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
