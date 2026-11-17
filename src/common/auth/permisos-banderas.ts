export const PERMISOS = {
  // auth
  LISTAR_USUARIOS: 'auth.usuario.listar',
  VER_USUARIO: 'auth.usuario.ver',

  // proyectos (pro_)
  LISTAR_PROYECTOS: 'pro.proyecto.listar',
  VER_PROYECTO: 'pro.proyecto.ver',
  LISTAR_SECTORES: 'pro.sector.listar',
  LISTAR_MODELOS: 'pro.modelo.listar',
  LISTAR_UNIDADES: 'pro.unidad.listar',
  VER_UNIDAD: 'pro.unidad.ver',
  BLOQUEAR_UNIDAD: 'pro.unidad.bloquear',

  // cotizaciones (solo lectura, no guarda nada)
  SIMULAR_COTIZACION: 'ven.cotizacion.simular',

  // ventas (ven_)
  LISTAR_VENTAS: 'ven.venta.listar',
  VER_VENTA: 'ven.venta.ver',
  SEPARAR_VENTA: 'ven.venta.separar',
  FORMALIZAR_VENTA: 'ven.venta.formalizar',
  CERRAR_VENTA: 'ven.venta.cerrar',
  ANULAR_VENTA: 'ven.venta.anular',

  // cuotas
  LISTAR_CUOTAS: 'ven.cuota.listar',
  MARCAR_CUOTAS_VENCIDAS: 'ven.cuota.marcar-vencidas',

  // pagos
  LISTAR_PAGOS: 'ven.pago.listar',
  VER_PAGO: 'ven.pago.ver',
  REGISTRAR_PAGO: 'ven.pago.registrar',
  VALIDAR_PAGO: 'ven.pago.validar',
  ANULAR_PAGO: 'ven.pago.anular',

  // comprobantes
  LISTAR_COMPROBANTES: 'ven.comprobante.listar',
  VER_COMPROBANTE: 'ven.comprobante.ver',
  EMITIR_COMPROBANTE: 'ven.comprobante.emitir',
  ANULAR_COMPROBANTE: 'ven.comprobante.anular',
  ACTUALIZAR_SUNAT: 'ven.comprobante.sunat',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];
