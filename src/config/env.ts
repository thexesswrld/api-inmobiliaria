import { z } from 'zod';
const esquemaEnv = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRA_EN: z.string().default('8h'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.string().default('development'),
  // Swagger en /docs. Si no se indica: activo en desarrollo, apagado en producción.
  SWAGGER_HABILITADO: z.enum(['true', 'false']).optional(),
});

/** ¿Se publica Swagger? La variable manda; si no está, depende de NODE_ENV. */
export function swaggerHabilitado(env: Pick<Env, 'NODE_ENV' | 'SWAGGER_HABILITADO'>): boolean {
  if (env.SWAGGER_HABILITADO) return env.SWAGGER_HABILITADO === 'true';
  return env.NODE_ENV !== 'production';
}

export type Env = z.infer<typeof esquemaEnv>;

export function validarEnv(config: Record<string, unknown>): Env {
  const resultado = esquemaEnv.safeParse(config);
  if (!resultado.success) {
    const errores = resultado.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Variables de entorno inválidas:\n${errores.join('\n')}`);
  }
  return resultado.data;
}
