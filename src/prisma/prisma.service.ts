import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({ connectionString: config.get('DATABASE_URL', { infer: true }) }),
      // Red de seguridad: el hash nunca sale en una consulta salvo que se pida
      // explícitamente con `omit: { passwordHash: false }` (solo en el login).
      omit: { usuario: { passwordHash: true } },
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
