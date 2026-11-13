import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const NOMBRE_SEGURIDAD = 'bearer';

/**
 * Documentación en /docs (JSON en /docs-json).
 * - Los cuerpos y query con { schema } de zod se documentan solos.
 * - Todo endpoint pide token salvo los marcados con @IsPublic().
 * - @Permisos(...) muestra los permisos requeridos en la respuesta 403.
 */
export function configurarSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Inmobiliaria')
    .setDescription(
      'Todas las respuestas tienen la forma `{ ok: true, data, meta? }` o `{ ok: false, error: { codigo, mensaje, detalles? } }`.\n\n' +
        'Para probar endpoints protegidos: ejecuta **POST /auth/login**, copia `data.token` y pégalo en **Authorize**.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, NOMBRE_SEGURIDAD)
    .addSecurityRequirements(NOMBRE_SEGURIDAD)
    .build();

  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true }, // el token no se borra al recargar
  });
}
