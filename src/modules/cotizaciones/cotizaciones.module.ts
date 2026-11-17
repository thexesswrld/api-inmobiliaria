import { Module } from '@nestjs/common';
import { CotizacionesController } from './controllers/cotizaciones.controller.js';
import { CotizacionesService } from './service/cotizaciones.service.js';

@Module({
  controllers: [CotizacionesController],
  providers: [CotizacionesService],
})
export class CotizacionesModule {}
