import { aCentavos, deCentavos } from '../../../common/formato/formato.js';
import type { Prisma } from '../../../generated/prisma/client.js';

export interface DesgloseIgv {
  opGravada: string;
  igv: string;
  total: string;
  porcentajeIgv: string;
}

/**
 * El precio de venta ya incluye IGV, así que la base imponible se obtiene
 * dividiendo entre (1 + tasa). Se calcula en centavos para no arrastrar
 * errores de coma flotante.
 */
export function calcularIgv(monto: Prisma.Decimal | number | string, porcentajeIgv = 18): DesgloseIgv {
  const totalC = aCentavos(monto);
  if (totalC < 0) throw new RangeError('El monto no puede ser negativo');
  if (!Number.isFinite(porcentajeIgv) || porcentajeIgv < 0) {
    throw new RangeError('El porcentaje de IGV no puede ser negativo');
  }

  const factor = 1 + porcentajeIgv / 100;
  const gravadaC = Math.round(totalC / factor);

  return {
    opGravada: deCentavos(gravadaC),
    igv: deCentavos(totalC - gravadaC),
    total: deCentavos(totalC),
    porcentajeIgv: porcentajeIgv.toFixed(2),
  };
}
