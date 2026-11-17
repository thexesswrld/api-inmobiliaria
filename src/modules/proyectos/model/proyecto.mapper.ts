import { aDinero, aFechaHora, nombreCompleto } from '../../../common/formato/formato.js';
import { toOpcion } from '../../../common/opciones/opciones.js';
import type {
  ModeloReferenciaRespuesta,
  ModeloRespuesta,
  ProyectoRespuesta,
  SectorRespuesta,
  UnidadDetalleRespuesta,
  UnidadRespuesta,
} from './respuestas.js';
import type {
  ModeloSeleccionado,
  ProyectoSeleccionado,
  SectorSeleccionado,
  UnidadDetalleSeleccionada,
  UnidadSeleccionada,
} from './proyecto.select.js';

export function toProyectoRespuesta(p: ProyectoSeleccionado): ProyectoRespuesta {
  return {
    id: p.id,
    nombre: p.nombre,
    tipo: toOpcion(p.tipoProyectoOpcion),
    direccion: p.direccion,
    logo: p.logo,
    empresa: { id: p.empresa.id, nombre: p.empresa.nombre, ruc: p.empresa.ruc },
    totalSectores: p._count.sectores,
    totalModelos: p._count.modelos,
  };
}

export function toSectorRespuesta(s: SectorSeleccionado): SectorRespuesta {
  return {
    id: s.id,
    idSectorPadre: s.idSectorPadre,
    nombre: s.nombre,
    codigo: s.codigo,
    orden: s.orden,
    tipo: toOpcion(s.tipoSectorOpcion),
    totalUnidades: s._count.unidades,
  };
}

export function toUnidadRespuesta(u: UnidadSeleccionada): UnidadRespuesta {
  return {
    id: u.id,
    nombre: u.nombre,
    tipo: toOpcion(u.tipoUnidadOpcion),
    estado: toOpcion(u.estadoComercialOpcion),
    precio: aDinero(u.precio),
    areaProyectada: aDinero(u.areaProyectada),
    areaSuperficie: aDinero(u.areaSuperficie),
    atributos: (u.atributos ?? {}) as Record<string, unknown>,
    sector: { id: u.sector.id, nombre: u.sector.nombre, codigo: u.sector.codigo },
    proyecto: { id: u.sector.proyecto.id, nombre: u.sector.proyecto.nombre },
  };
}

export function toUnidadDetalleRespuesta(u: UnidadDetalleSeleccionada): UnidadDetalleRespuesta {
  return {
    ...toUnidadRespuesta(u),
    propietario: u.propietario
      ? {
          id: u.propietario.id,
          nombreCompleto: nombreCompleto(u.propietario.persona),
          documento: u.propietario.persona.documento,
        }
      : null,
    totalModelos: u._count.modelos,
    fechaCreacion: aFechaHora(u.fechaCreacion) ?? '',
  };
}

export function toModeloRespuesta(m: ModeloSeleccionado): ModeloRespuesta {
  return {
    id: m.id,
    nombre: m.nombre,
    ruta: m.ruta,
    tipo: toOpcion(m.tipoModeloOpcion),
    version: m.version,
    principal: m.esPrincipal,
    orden: m.orden,
    sector: m.sector,
    unidad: m.unidad,
    referencias: m.referencias.map(
      (r): ModeloReferenciaRespuesta => ({
        id: r.id,
        idSector: r.idSector,
        idUnidad: r.idUnidad,
        geometria: r.geometria,
        idElementoExterno: r.idElementoExterno,
      }),
    ),
  };
}
