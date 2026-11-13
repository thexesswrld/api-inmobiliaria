import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarSwagger } from './config/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV !== 'production') configurarSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
