// Lo que la API devuelve al frontend (dentro de { ok, data }).

export interface UsuarioSesionRespuesta {
  id: number;
  username: string;
  nombreCompleto: string;
  roles: string[];
  permisos: string[];
}

export interface LoginRespuesta {
  token: string;
  tipo: 'Bearer';
  expiraEn: string;
  usuario: UsuarioSesionRespuesta;
}

export interface UsuarioRespuesta {
  id: number;
  username: string;
  nombreCompleto: string;
  correo: string | null;
  activo: boolean;
  roles: { codigo: string; nombre: string }[];
  fechaCreacion: string;
}
