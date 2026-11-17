import { Module } from '@nestjs/common';
import { ComprobantesController } from './controllers/comprobantes.controller.js';
import { ComprobantesDePagoController } from './controllers/comprobantes-pago.controller.js';
import { ComprobantesService } from './service/comprobantes.service.js';

@Module({
  controllers: [ComprobantesController, ComprobantesDePagoController],
  providers: [ComprobantesService],
  exports: [ComprobantesService],
})
export class ComprobantesModule {}
