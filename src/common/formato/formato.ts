import type { Prisma } from '../../generated/prisma/client.js';

/** Convierte un `numeric` de Prisma a string con 2 decimales (nunca a number). */
export function aDinero(valor: Prisma.Decimal | string | number | null | undefined): string | null {
  if (valor === null || valor === undefined) return null;
  return Number(valor).toFixed(2);
}

/** Igual que `aDinero` pero para montos obligatorios: si falta, devuelve "0.00". */
export function dinero(valor: Prisma.Decimal | string | number | null | undefined): string {
  return aDinero(valor) ?? '0.00';
}

/** Fecha `date` (sin hora) → "2026-01-31". */
export function aFecha(valor: Date | string | null | undefined): string | null {
  if (!valor) return null;
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  return fecha.toISOString().slice(0, 10);
}

/** Fecha `timestamptz` → ISO 8601 completo. */
export function aFechaHora(valor: Date | string | null | undefined): string | null {
  if (!valor) return null;
  return (typeof valor === 'string' ? new Date(valor) : valor).toISOString();
}

export interface PersonaNombre {
  nombre: string;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
}

export function nombreCompleto(p: PersonaNombre): string {
  return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
}

/** Trabaja con centavos enteros para no arrastrar errores de coma flotante. */
export function aCentavos(valor: Prisma.Decimal | number | string): number {
  return Math.round(Number(valor) * 100);
}

export function deCentavos(centavos: number): string {
  return (centavos / 100).toFixed(2);
}
