import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Configuración del CLI de Prisma (db pull, generate, studio).
// El CLI usa DIRECT_URL: la conexión directa de Supabase (puerto 5432).
// La app en ejecución usa DATABASE_URL (pooler, puerto 6543) en PrismaService.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
