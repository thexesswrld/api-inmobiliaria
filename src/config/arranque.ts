import { Logger, type INestApplication } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Describe la conexión SIN la contraseña: "host:puerto/base | user: usuario".
 * Si la URL no se puede leer, lo dice en vez de mostrarla (podría tener la contraseña).
 */
export function describirConexion(url: string): string {
  try {
    const u = new URL(url);
    const base = u.pathname.replace(/^\//, '') || '(sin base)';
    const puerto = u.port || '5432';
    return `${u.hostname}:${puerto}/${base} | user: ${decodeURIComponent(u.username) || '(sin usuario)'}`;
  } catch {
    return 'DATABASE_URL con formato inválido';
  }
}

/** Muestra en consola dónde quedó la API, Swagger y si la base de datos responde. */
export async function mostrarResumenArranque(
  app: INestApplication,
  opciones: { puerto: number; swagger: boolean; databaseUrl: string },
) {
  const log = new Logger('Bootstrap');
  const base = `http://localhost:${opciones.puerto}`;
  const conexion = describirConexion(opciones.databaseUrl);

  log.log('-------------------------------------------');
  log.log(`API iniciada en: ${base}`);
  log.log(`Swagger docs en: ${opciones.swagger ? `${base}/docs` : 'desactivado (NODE_ENV=production)'}`);

  try {
    await app.get(PrismaService).$queryRaw`SELECT 1`;
    log.log(`Base de datos: conectada (${conexion})`);
  } catch (e) {
    log.error(`Base de datos: SIN CONEXIÓN (${conexion}) → ${e instanceof Error ? e.message.trim().split('\n').pop() : String(e)}`);
  }

  log.log('-------------------------------------------');
}
