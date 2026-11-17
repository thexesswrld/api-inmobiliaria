import { describe, expect, it } from 'vitest';
import { calcularIgv } from './igv.logic.js';

describe('calcularIgv', () => {
  it('separa la base imponible de un total que ya incluye 18%', () => {
    expect(calcularIgv('1180.00')).toEqual({
      opGravada: '1000.00',
      igv: '180.00',
      total: '1180.00',
      porcentajeIgv: '18.00',
    });
  });

  it('redondea a centavos sin perder el total', () => {
    const r = calcularIgv('100.00');
    expect(r.opGravada).toBe('84.75');
    expect(r.igv).toBe('15.25');
    expect(Number(r.opGravada) + Number(r.igv)).toBeCloseTo(100, 2);
  });

  it('acepta otro porcentaje', () => {
    const r = calcularIgv('110.00', 10);
    expect(r.opGravada).toBe('100.00');
    expect(r.igv).toBe('10.00');
    expect(r.porcentajeIgv).toBe('10.00');
  });

  it('rechaza montos negativos', () => {
    expect(() => calcularIgv('-1')).toThrow(RangeError);
  });
});
