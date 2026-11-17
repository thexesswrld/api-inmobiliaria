import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CuotasService } from '../service/cuotas.service.js';

/**
 * Job diario: pasa a VENCIDA las cuotas impagas con fecha pasada.
 * La regla está en `fn_marcar_cuotas_vencidas()` (database/negocio/04_pagos.sql);
 * aquí solo se dispara y se registra el resultado.
 */
@Injectable()
export class CuotasVencidasTask {
  private readonly logger = new Logger(CuotasVencidasTask.name);

  constructor(private readonly cuotas: CuotasService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'cuotas-vencidas' })
  async ejecutar(): Promise<void> {
    try {
      const { marcadas } = await this.cuotas.marcarVencidas();
      this.logger.log(`Cuotas marcadas como VENCIDA: ${marcadas}`);
    } catch (e) {
      this.logger.error('No se pudieron marcar las cuotas vencidas', e instanceof Error ? e.stack : e);
    }
  }
}
