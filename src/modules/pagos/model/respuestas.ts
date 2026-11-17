import type { OpcionRespuesta } from '../../../common/opciones/opciones.js';

export interface ClientePagoRespuesta {
  id: number;
  nombreCompleto: string;
  documento: string;
}

export interface AplicacionPagoRespuesta {
  id: number;
  cuota: {
    id: number;
    numero: number;
    fechaVencimiento: string;
    monto: string;
    montoPagado: string;
  };
  monto: string;
  aplicaA: OpcionRespuesta;
}

export interface PagoRespuesta {
  id: number;
  fechaPago: string;
  monto: string;
  tipoCambio: string | null;
  numeroOperacion: string | null;
  ruta: string | null;
  motivoAnulacion: string | null;
  estado: OpcionRespuesta;
  moneda: OpcionRespuesta;
  medioPago: OpcionRespuesta;
  cuentaBancaria: { id: number; banco: string; numeroCuenta: string } | null;
  venta: { id: number; codigo: string };
  cliente: ClientePagoRespuesta;
  /** Suma de lo repartido entre cuotas. */
  aplicado: string;
  /** Parte del pago que aún no se aplicó a ninguna cuota. */
  sinAplicar: string;
}

export interface PagoDetalleRespuesta extends PagoRespuesta {
  fechaCreacion: string;
  aplicaciones: AplicacionPagoRespuesta[];
}
