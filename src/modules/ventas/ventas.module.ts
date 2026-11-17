import { Module } from '@nestjs/common';
import { VentasController } from './controllers/ventas.controller.js';
import { VentasService } from './service/ventas.service.js';

@Module({
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
