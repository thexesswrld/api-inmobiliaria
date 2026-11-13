// Forma de TODAS las respuestas de la API.
//   Éxito: { ok: true,  data, meta? }
//   Error: { ok: false, error: { codigo, mensaje, detalles? } }

export interface MetaPaginacion {
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

export interface RespuestaOk<T> {
  ok: true;
  data: T;
  meta?: MetaPaginacion;
}

export interface RespuestaError {
  ok: false;
  error: {
    codigo: string;
    mensaje: string;
    detalles?: unknown;
  };
}

/** Lo que devuelve un service cuando lista con paginación. El interceptor lo reconoce. */
export class Paginado<T> {
  constructor(
    readonly items: T[],
    readonly meta: MetaPaginacion,
  ) {}
}
