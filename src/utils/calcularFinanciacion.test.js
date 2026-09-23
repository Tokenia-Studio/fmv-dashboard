// npm test   (vitest)
// Las barras de confirming / financiación de impuestos deben seguir el tipo que se
// elige en el desplegable de "Deuda viva por préstamo" (tabla tipos_financiacion),
// no solo el mapa fijo de constants. Movimientos inventados, sin datos de FMV.
import { describe, test, expect } from 'vitest';
import { calcularFinanciacion } from './calculations.js';

const mov = (cuenta, mes, debe, haber) => ({ cuenta, mes, debe, haber, grupo: cuenta.substring(0, 2) });
const MOVS = [
  mov('520000001', '2025-12', 0, 1000), // confirming por defecto (constants), arrastre
  mov('520000001', '2026-02', 0, 500),
  mov('520000009', '2026-03', 0, 300),  // línea 52x sin tipo por defecto
];
const final = (r, campo) => r.meses[11][campo];

describe('calcularFinanciacion · tipos de línea', () => {
  test('sin tipos guardados usa el mapa por defecto', () => {
    const r = calcularFinanciacion(MOVS, {}, 2026);
    expect(final(r, 'confirming')).toBe(1500);
    expect(final(r, 'finImpuestos')).toBe(0);
  });

  test('una línea reclasificada a confirming entra en la barra', () => {
    const r = calcularFinanciacion(MOVS, {}, 2026, { '520000009': 'Confirming proveedores' });
    expect(final(r, 'confirming')).toBe(1800);
    expect(r.meses[1].confirming).toBe(1500); // antes de marzo no suma
  });

  test('lo guardado manda sobre el mapa por defecto', () => {
    const r = calcularFinanciacion(MOVS, {}, 2026, { '520000001': 'Financiación impuestos' });
    expect(final(r, 'confirming')).toBe(0);
    expect(final(r, 'finImpuestos')).toBe(1500);
  });

  test('sacar una línea de confirming la quita de la barra', () => {
    const r = calcularFinanciacion(MOVS, {}, 2026, { '520000001': 'Póliza de crédito' });
    expect(final(r, 'confirming')).toBe(0);
  });
});
