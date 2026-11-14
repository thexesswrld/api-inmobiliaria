import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { mostrarResumenArranque } from './config/arranque.js';
import { swaggerHabilitado, type Env } from './config/env.js';
import { configurarSwagger } from './config/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  const swagger = swaggerHabilitado({
    NODE_ENV: config.get('NODE_ENV', { infer: true }),
    SWAGGER_HABILITADO: config.get('SWAGGER_HABILITADO', { infer: true }),
  });
  if (swagger) configurarSwagger(app);

  const puerto = config.get('PORT', { infer: true });
  await app.listen(puerto);

  await mostrarResumenArranque(app, {
    puerto,
    swagger,
    databaseUrl: config.get('DATABASE_URL', { infer: true }),
  });
}

bootstrap().catch((e: unknown) => {
  new Logger('Bootstrap').error(e instanceof Error ? (e.stack ?? e.message) : String(e));
  process.exit(1);
});
