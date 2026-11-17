import { aCentavos, deCentavos } from '../formato/formato.js';

export class ErrorCronograma extends Error {}

export type TipoCuotaCronograma = 'SEPARACION' | 'INICIAL' | 'MENSUAL';

export interface CuotaCronograma {
  numero: number;
  tipo: TipoCuotaCronograma;
  fechaVencimiento: string;
  monto: string;
}

export interface Cronograma {
  montoFinal: string;
  montoInicial: string;
  montoFinanciado: string;
  cuotas: CuotaCronograma[];
}

export interface ParametrosCronograma {
  montoFinal: number | string;
  montoInicial: number | string;
  numeroCuotas: number;
  /** Vencimiento de la primera cuota MENSUAL. */
  fechaPrimeraCuota: string;
  /** Cuota de separación ya creada: cuenta dentro de la inicial. */
  montoSeparacion?: number | string;
  /** Vencimiento de la cuota INICIAL (por defecto, hoy). */
  fechaInicial?: string;
  /** Número que tendrá la primera cuota generada (continúa el cronograma). */
  numeroDesde?: number;
}

/**
 * G  enera las cuotas INICIAL y MENSUAL de una venta.
 * La separación, si existe, ya está guardada y se descuenta de la inicial.
 * Este cálculo lo hace la API porque la base solo guarda el resultado.
 */
export function calcularCronograma(p: ParametrosCronograma): Cronograma {
  const finalC = aCentavos(p.montoFinal);
  const inicialC = aCentavos(p.montoInicial);
  const separacionC = aCentavos(p.montoSeparacion ?? 0);

  if (finalC < 0) throw new ErrorCronograma('El precio final no puede ser negativo');
  if (inicialC < 0) throw new ErrorCronograma('La cuota inicial no puede ser negativa');
  if (inicialC > finalC) throw new ErrorCronograma('La cuota inicial no puede ser mayor que el precio final');
  if (inicialC < separacionC) {
    throw new ErrorCronograma('La cuota inicial no puede ser menor que la separación ya pactada');
  }

  const numeroDesde = p.numeroDesde ?? 1;
  if (!Number.isInteger(numeroDesde) || numeroDesde < 1) {
    throw new ErrorCronograma('El número de la primera cuota debe ser un entero mayor o igual a 1');
  }
  if (!esFechaISO(p.fechaPrimeraCuota)) {
    throw new ErrorCronograma('La fecha de la primera cuota debe tener el formato AAAA-MM-DD');
  }

  const financiadoC = finalC - inicialC;
  if (financiadoC > 0 && p.numeroCuotas < 1) {
    throw new ErrorCronograma('Hay un monto por financiar: indique al menos una cuota');
  }
  if (financiadoC === 0 && p.numeroCuotas > 0) {
    throw new ErrorCronograma('El monto a financiar es 0: indique 0 cuotas');
  }

  const cuotas: CuotaCronograma[] = [];
  let numero = numeroDesde;

  const inicialCuotaC = inicialC - separacionC;
  if (inicialCuotaC > 0) {
    const fechaInicial = p.fechaInicial ?? hoyISO();
    if (!esFechaISO(fechaInicial)) {
      throw new ErrorCronograma('La fecha de la cuota inicial debe tener el formato AAAA-MM-DD');
    }
    cuotas.push({
      numero: numero++,
      tipo: 'INICIAL',
      fechaVencimiento: fechaInicial,
      monto: deCentavos(inicialCuotaC),
    });
  }

  if (financiadoC > 0) {
    // Reparto en centavos: todas iguales salvo la última, que absorbe el resto.
    const base = Math.floor(financiadoC / p.numeroCuotas);
    const resto = financiadoC - base * p.numeroCuotas;

    for (let i = 0; i < p.numeroCuotas; i++) {
      const montoC = i === p.numeroCuotas - 1 ? base + resto : base;
      cuotas.push({
        numero: numero++,
        tipo: 'MENSUAL',
        fechaVencimiento: sumarMeses(p.fechaPrimeraCuota, i),
        monto: deCentavos(montoC),
      });
    }
  }

  return {
    montoFinal: deCentavos(finalC),
    montoInicial: deCentavos(inicialC),
    montoFinanciado: deCentavos(financiadoC),
    cuotas,
  };
}

export interface ParametrosSimulacion {
  precioLista: number | string;
  descuento?: number | string;
  montoInicial: number | string;
  numeroCuotas: number;
  fechaPrimeraCuota?: string;
  montoSeparacion?: number | string;
  /** Si es false, la separación no aparece como cuota (solo descuenta de la inicial). */
  incluirSeparacion?: boolean;
}

export interface SimulacionCronograma {
  montoBruto: string;
  descuento: string;
  montoFinal: string;
  montoInicial: string;
  montoFinanciado: string;
  totalCronograma: string;
  cuotas: CuotaCronograma[];
}

/** Cotización: no escribe en la base, solo calcula. */
export function simularCronograma(p: ParametrosSimulacion): SimulacionCronograma {
  const brutoC = aCentavos(p.precioLista);
  const descuentoC = aCentavos(p.descuento ?? 0);
  if (brutoC < 0) throw new ErrorCronograma('El precio de lista no puede ser negativo');
  if (descuentoC < 0) throw new ErrorCronograma('El descuento no puede ser negativo');

  const finalC = brutoC - descuentoC;
  if (finalC < 0) throw new ErrorCronograma('El descuento no puede ser mayor que el precio de lista');

  const separacionC = aCentavos(p.montoSeparacion ?? 0);
  const incluirSeparacion = p.incluirSeparacion ?? true;
  const fechaPrimeraCuota = p.fechaPrimeraCuota ?? sumarMeses(hoyISO(), 1);

  const cuotas: CuotaCronograma[] = [];
  if (incluirSeparacion && separacionC > 0) {
    cuotas.push({ numero: 1, tipo: 'SEPARACION', fechaVencimiento: hoyISO(), monto: deCentavos(separacionC) });
  }

  const cronograma = calcularCronograma({
    montoFinal: deCentavos(finalC),
    montoInicial: p.montoInicial,
    numeroCuotas: p.numeroCuotas,
    fechaPrimeraCuota,
    montoSeparacion: incluirSeparacion ? deCentavos(separacionC) : 0,
    numeroDesde: cuotas.length + 1,
  });

  const todas = [...cuotas, ...cronograma.cuotas];
  const totalC = todas.reduce((suma, c) => suma + aCentavos(c.monto), 0);

  return {
    montoBruto: deCentavos(brutoC),
    descuento: deCentavos(descuentoC),
    montoFinal: deCentavos(finalC),
    montoInicial: cronograma.montoInicial,
    montoFinanciado: cronograma.montoFinanciado,
    totalCronograma: deCentavos(totalC),
    cuotas: todas,
  };
}

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaISO(valor: string): boolean {
  if (!RE_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/** Hoy en la zona horaria del negocio (America/Lima). */
export function hoyISO(fecha = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

/** Suma meses a una fecha AAAA-MM-DD, recortando el día al último del mes destino. */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  const total = mes - 1 + meses;
  const anioDestino = anio + Math.floor(total / 12);
  const mesDestino = ((total % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);
  return `${anioDestino}-${String(mesDestino + 1).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`;
}
