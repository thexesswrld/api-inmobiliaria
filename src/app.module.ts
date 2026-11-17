import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ErroresFilter } from './common/errores/errores.filter.js';
import { RespuestaInterceptor } from './common/respuesta/respuesta.interceptor.js';
import { validarEnv } from './config/env.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ComprobantesModule } from './modules/comprobantes/comprobantes.module.js';
import { CotizacionesModule } from './modules/cotizaciones/cotizaciones.module.js';
import { CuotasModule } from './modules/cuotas/cuotas.module.js';
import { PagosModule } from './modules/pagos/pagos.module.js';
import { ProyectosModule } from './modules/proyectos/proyectos.module.js';
import { VentasModule } from './modules/ventas/ventas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ProyectosModule,
    CotizacionesModule,
    VentasModule,
    PagosModule,
    ComprobantesModule,
    CuotasModule,
  ],
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
