import { describe, expect, it } from 'vitest';
import {
  ErrorCronograma,
  calcularCronograma,
  hoyISO,
  simularCronograma,
  sumarMeses,
} from './cronograma.js';

describe('calcularCronograma', () => {
  it('reparte el financiado en cuotas iguales', () => {
    const r = calcularCronograma({
      montoFinal: 3000,
      montoInicial: 0,
      numeroCuotas: 3,
      fechaPrimeraCuota: '2026-01-15',
    });

    expect(r.montoFinanciado).toBe('3000.00');
    expect(r.cuotas).toEqual([
      { numero: 1, tipo: 'MENSUAL', fechaVencimiento: '2026-01-15', monto: '1000.00' },
      { numero: 2, tipo: 'MENSUAL', fechaVencimiento: '2026-02-15', monto: '1000.00' },
      { numero: 3, tipo: 'MENSUAL', fechaVencimiento: '2026-03-15', monto: '1000.00' },
    ]);
  });

  it('ajusta los centavos en la última cuota', () => {
    const r = calcularCronograma({
      montoFinal: 1000,
      montoInicial: 0,
      numeroCuotas: 3,
      fechaPrimeraCuota: '2026-01-15',
    });

    expect(r.cuotas.map((c) => c.monto)).toEqual(['333.33', '333.33', '333.34']);
  });

  it('descuenta la separación de la cuota inicial y continúa la numeración', () => {
    const r = calcularCronograma({
      montoFinal: 1500,
      montoInicial: 500,
      montoSeparacion: 200,
      numeroCuotas: 2,
      fechaPrimeraCuota: '2026-02-10',
      fechaInicial: '2026-01-20',
      numeroDesde: 2,
    });

    expect(r.cuotas).toEqual([
      { numero: 2, tipo: 'INICIAL', fechaVencimiento: '2026-01-20', monto: '300.00' },
      { numero: 3, tipo: 'MENSUAL', fechaVencimiento: '2026-02-10', monto: '500.00' },
      { numero: 4, tipo: 'MENSUAL', fechaVencimiento: '2026-03-10', monto: '500.00' },
    ]);
  });

  it('no genera cuota inicial si la separación cubre toda la inicial', () => {
    const r = calcularCronograma({
      montoFinal: 1000,
      montoInicial: 200,
      montoSeparacion: 200,
      numeroCuotas: 1,
      fechaPrimeraCuota: '2026-02-01',
    });

    expect(r.cuotas.map((c) => c.tipo)).toEqual(['MENSUAL']);
  });

  it('rechaza una inicial mayor que el precio final', () => {
    expect(() =>
      calcularCronograma({ montoFinal: 1000, montoInicial: 1200, numeroCuotas: 1, fechaPrimeraCuota: '2026-01-01' }),
    ).toThrow(ErrorCronograma);
  });

  it('rechaza un monto financiado sin cuotas', () => {
    expect(() =>
      calcularCronograma({ montoFinal: 1000, montoInicial: 100, numeroCuotas: 0, fechaPrimeraCuota: '2026-01-01' }),
    ).toThrow('Hay un monto por financiar: indique al menos una cuota');
  });

  it('rechaza cuotas cuando no hay nada que financiar', () => {
    expect(() =>
      calcularCronograma({ montoFinal: 1000, montoInicial: 1000, numeroCuotas: 2, fechaPrimeraCuota: '2026-01-01' }),
    ).toThrow('El monto a financiar es 0: indique 0 cuotas');
  });

  it('rechaza una inicial menor que la separación', () => {
    expect(() =>
      calcularCronograma({
        montoFinal: 1000,
        montoInicial: 100,
        montoSeparacion: 200,
        numeroCuotas: 1,
        fechaPrimeraCuota: '2026-01-01',
      }),
    ).toThrow('La cuota inicial no puede ser menor que la separación ya pactada');
  });
});

describe('simularCronograma', () => {
  it('incluye la separación y cuadra el total con el precio final', () => {
    const r = simularCronograma({
      precioLista: 10000,
      descuento: 1000,
      montoInicial: 2000,
      montoSeparacion: 500,
      numeroCuotas: 2,
      fechaPrimeraCuota: '2026-03-01',
    });

    expect(r.montoBruto).toBe('10000.00');
    expect(r.montoFinal).toBe('9000.00');
    expect(r.totalCronograma).toBe('9000.00');
    expect(r.cuotas[0]).toMatchObject({ tipo: 'SEPARACION', monto: '500.00' });
    expect(r.cuotas[1]).toMatchObject({ tipo: 'INICIAL', monto: '1500.00' });
  });

  it('rechaza un descuento mayor que el precio', () => {
    expect(() =>
      simularCronograma({ precioLista: 100, descuento: 150, montoInicial: 0, numeroCuotas: 1 }),
    ).toThrow('El descuento no puede ser mayor que el precio de lista');
  });
});

describe('sumarMeses', () => {
  it('recorta al último día del mes destino', () => {
    expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(sumarMeses('2026-01-31', 2)).toBe('2026-03-31');
    expect(sumarMeses('2024-02-29', 12)).toBe('2025-02-28');
  });
});

describe('hoyISO', () => {
  it('devuelve una fecha AAAA-MM-DD', () => {
    expect(hoyISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
