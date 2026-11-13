import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { UsuariosQuerySchema, type UsuariosQuery } from '../model/dto/usuarios-query.dto.js';
import { UsuariosService } from '../service/usuarios.service.js';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** GET /usuarios?pagina=1&porPagina=20&buscar=perez */
  @Get()
  @Permisos(PERMISOS.LISTAR_USUARIOS)
  @ApiOperation({ summary: 'Listar usuarios', description: 'Paginado. `buscar` filtra por usuario, nombre, apellidos o documento.' })
  listar(@Query({ schema: UsuariosQuerySchema }) query: UsuariosQuery) {
    return this.usuarios.listar(query);
  }

  /** GET /usuarios/5 */
  @Get(':id')
  @Permisos(PERMISOS.VER_USUARIO)
  @ApiOperation({ summary: 'Ver usuario' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.obtener(id);
  }
}
