import { Module } from '@nestjs/common';
import { PagosController } from './controllers/pagos.controller.js';
import { PagosDeVentaController } from './controllers/pagos-venta.controller.js';
import { PagosService } from './service/pagos.service.js';

@Module({
  controllers: [PagosController, PagosDeVentaController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
