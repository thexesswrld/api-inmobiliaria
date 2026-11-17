import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const NOMBRE_SEGURIDAD = 'bearer';

const DESCRIPCION = `
API de gestión inmobiliaria: proyectos, unidades, cotizaciones, ventas, cuotas, pagos y comprobantes.

### Autenticación
1. Ejecuta **POST /auth/login** con usuario y contraseña.
2. Copia \`data.token\` y pégalo en el botón **Authorize**.
3. Todos los endpoints exigen token salvo los marcados como públicos.

Cada endpoint indica el permiso que necesita (\`modulo.entidad.accion\`).
Si falta el permiso, la respuesta es \`403\` con código \`SIN_PERMISO\`.

### Formato de las respuestas
Éxito:
\`\`\`json
{ "ok": true, "data": { }, "meta": { "pagina": 1, "porPagina": 20, "total": 42 } }
\`\`\`
Error:
\`\`\`json
{ "ok": false, "error": { "codigo": "REGLA_NEGOCIO", "mensaje": "…", "detalles": [] } }
\`\`\`

\`meta\` solo aparece en los listados paginados.

### Códigos de error
| HTTP | Código | Significado |
| --- | --- | --- |
| 400 | \`VALIDACION\` | Los datos enviados no son válidos; \`detalles\` trae los mensajes por campo. |
| 401 | \`NO_AUTENTICADO\` | Falta el token, está vencido o la sesión se cerró. |
| 403 | \`SIN_PERMISO\` | El usuario no tiene el permiso que exige el endpoint. |
| 404 | \`NO_ENCONTRADO\` | El registro solicitado no existe. |
| 409 | \`DUPLICADO\` / \`REFERENCIA\` | Choca con un registro único o con datos relacionados. |
| 422 | \`REGLA_NEGOCIO\` | La operación no cumple una regla del negocio (trigger o validación del service). |
| 500 | \`INTERNO\` | Error inesperado. |

### Convenciones de datos
- **Fechas:** \`AAAA-MM-DD\` en la entrada; las respuestas usan el mismo formato para fechas y \`AAAA-MM-DD HH:mm:ss\` para marcas de tiempo.
- **Montos:** se envían como número y se devuelven como **string con dos decimales** (\`"1250.00"\`) para no perder precisión. En los cuerpos de error o descripciones pueden aparecer como número.
- **Estados:** son códigos en mayúsculas de las tablas de opciones (por ejemplo \`ESTADO_VENTA\`, \`MEDIO_PAGO\`). Cada parámetro documenta los valores válidos.
- **Paginación:** \`pagina\` empieza en 1; \`porPagina\` admite hasta 100 y vale 20 por defecto.
`;

export function configurarSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Inmobiliaria')
    .setDescription(DESCRIPCION)
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, NOMBRE_SEGURIDAD)
    .addSecurityRequirements(NOMBRE_SEGURIDAD)
    .addTag('Autenticación', 'Inicio y cierre de sesión, y datos del usuario autenticado.')
    .addTag('Usuarios', 'Padrón de usuarios del sistema y sus accesos.')
    .addTag('Proyectos', 'Catálogo de proyectos, sectores y modelos gráficos.')
    .addTag('Unidades', 'Unidades vendibles: consulta y bloqueo manual.')
    .addTag('Cotizaciones', 'Simulación de precios y cronogramas sin guardar datos.')
    .addTag('Ventas', 'Separaciones, formalización y cierre de ventas.')
    .addTag('Cuotas', 'Cronogramas, estado real de cada cuota y cobranza vencida.')
    .addTag('Pagos', 'Registro de cobros, reparto entre cuotas y validación.')
    .addTag('Comprobantes', 'Emisión, anulación y seguimiento SUNAT de comprobantes.')
    .build();

  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, config), {
    swaggerOptions: { persistAuthorization: true }, // el token no se borra al recargar
  });
}
