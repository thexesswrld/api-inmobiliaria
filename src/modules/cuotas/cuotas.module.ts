import { Module } from '@nestjs/common';
import { CuotasController } from './controllers/cuotas.controller.js';
import { CuotasDeVentaController } from './controllers/cuotas-venta.controller.js';
import { CuotasService } from './service/cuotas.service.js';
import { CuotasVencidasTask } from './tasks/cuotas-vencidas.task.js';

@Module({
  controllers: [CuotasController, CuotasDeVentaController],
  providers: [CuotasService, CuotasVencidasTask],
  exports: [CuotasService],
})
export class CuotasModule {}
