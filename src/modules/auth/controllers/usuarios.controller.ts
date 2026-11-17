import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permisos } from '../../../common/auth/decorators.js';
import { PERMISOS } from '../../../common/auth/permisos-banderas.js';
import { ApiIdParam, ApiQueryZod } from '../../../common/swagger/documentacion.js';
import { UsuariosQuerySchema, type UsuariosQuery } from '../model/dto/usuarios-query.dto.js';
import { UsuariosService } from '../service/usuarios.service.js';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  /** GET /usuarios?pagina=1&porPagina=20&buscar=perez */
  @Get()
  @Permisos(PERMISOS.LISTAR_USUARIOS)
  @ApiQueryZod(UsuariosQuerySchema)
  @ApiOperation({
    summary: 'Listar usuarios',
    description: [
      '**Para qué sirve:** muestra el padrón de usuarios para elegir uno o revisar quién tiene acceso.',
      '**Permiso:** `auth.usuario.listar`.',
      '**Query:** `pagina`, `porPagina` y `buscar` (usuario, nombre, apellidos o documento).',
      '**Devuelve:** `data` con la página de usuarios y `meta` con el total de registros.',
      '**Errores:** `403` sin el permiso.',
    ].join('\n\n'),
  })
  listar(@Query({ schema: UsuariosQuerySchema }) query: UsuariosQuery) {
    return this.usuarios.listar(query);
  }

  /** GET /usuarios/5 */
  @Get(':id')
  @Permisos(PERMISOS.VER_USUARIO)
  @ApiIdParam('Id del usuario', 5)
  @ApiOperation({
    summary: 'Ver usuario',
    description: [
      '**Para qué sirve:** abre la ficha de un usuario concreto.',
      '**Permiso:** `auth.usuario.ver`.',
      '**Devuelve:** datos del usuario, sus roles y estado.',
      '**Errores:** `403` sin el permiso; `404` si el usuario no existe.',
    ].join('\n\n'),
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.obtener(id);
  }
}
