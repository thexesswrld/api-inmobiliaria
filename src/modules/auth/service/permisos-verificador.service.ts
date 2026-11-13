import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ACTIVO } from '../../../common/estado.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { permisosFaltantes } from '../logic/permisos.logic.js';

/**
 * Al arrancar, revisa que cada código de permisos-banderas.ts exista en
 * auth_permiso. Si falta uno, nadie podría usar ese endpoint: mejor saberlo ya.
 */
@Injectable()
export class PermisosVerificadorService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Permisos');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      const enBd = await this.prisma.permiso.findMany({ where: ACTIVO, select: { codigo: true } });
      const faltan = permisosFaltantes(Object.values(PERMISOS), enBd.map((p) => p.codigo));
      if (faltan.length) {
        this.logger.warn(`Permisos sin registrar en auth_permiso (agrégalos al seed): ${faltan.join(', ')}`);
      }
    } catch (e) {
      this.logger.error(`No se pudieron verificar los permisos: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
