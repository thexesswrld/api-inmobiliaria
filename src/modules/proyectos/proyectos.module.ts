import { Module } from '@nestjs/common';
import { ProyectosController } from './controllers/proyectos.controller.js';
import { UnidadesController } from './controllers/unidades.controller.js';
import { ProyectosService } from './service/proyectos.service.js';
import { UnidadesService } from './service/unidades.service.js';

@Module({
  controllers: [ProyectosController, UnidadesController],
  providers: [ProyectosService, UnidadesService],
})
export class ProyectosModule {}
