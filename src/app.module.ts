import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ErroresFilter } from './common/errores/errores.filter.js';
import { RespuestaInterceptor } from './common/respuesta/respuesta.interceptor.js';
import { validarEnv } from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }), PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Valida @Body/@Query/@Param que tengan { schema } (zod)
    { provide: APP_PIPE, useValue: new StandardSchemaValidationPipe() },
    // Respuestas exitosas → { ok: true, data, meta? }
    { provide: APP_INTERCEPTOR, useClass: RespuestaInterceptor },
    // Errores → { ok: false, error: { codigo, mensaje, detalles? } }
    { provide: APP_FILTER, useClass: ErroresFilter },
  ],
})
export class AppModule {}
