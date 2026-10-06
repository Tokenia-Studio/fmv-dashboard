import { describe, it, expect } from 'vitest';
import { construirModelo } from './contratosVista.js';
import { encajar, mapaEquipos, mapaContratos } from './contratosMapa.js';

const HOY = new Date(2026, 9, 5); // 05/10/2026

describe('encajar: piezas de área proporcional al valor', () => {
  const piezas = [
    { clave: 'a', valor: 63 }, { clave: 'b', valor: 49 }, { clave: 'c', valor: 40 }, { clave: 'd', valor: 31 },
    { clave: 'e', valor: 9 }, { clave: 'f', valor: 8 }, { clave: 'g', valor: 4 }, { clave: 'h', valor: 2 }, { clave: 'i', valor: 1 },
  ];
  const total = piezas.reduce((s, p) => s + p.valor, 0);

  it('cada pieza ocupa su parte exacta de la chapa y entre todas la llenan', () => {
    const r = encajar(piezas, 10, 20, 1000, 300);
    expect(r).toHaveLength(9);
    for (const p of r) expect((p.w * p.h) / (1000 * 300)).toBeCloseTo(p.valor / total, 9);
    expect(r.reduce((s, p) => s + p.w * p.h, 0)).toBeCloseTo(1000 * 300, 6);
  });

  it('ninguna se sale de la chapa ni pisa a otra', () => {
    const r = encajar(piezas, 10, 20, 1000, 300);
    const e = 1e-6;
    for (const p of r) {
      expect(p.x).toBeGreaterThanOrEqual(10 - e);
      expect(p.y).toBeGreaterThanOrEqual(20 - e);
      expect(p.x + p.w).toBeLessThanOrEqual(1010 + e);
      expect(p.y + p.h).toBeLessThanOrEqual(320 + e);
    }
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      const solapeX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const solapeY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      expect(solapeX > e && solapeY > e, `${a.clave} pisa a ${b.clave}`).toBe(false);
    }
  });

  it('no deja tiras finas: la más alargada de un reparto parejo no pasa de 3 a 1', () => {
    const parejas = Array.from({ length: 7 }, (_, i) => ({ clave: `p${i}`, valor: 10 }));
    for (const p of encajar(parejas, 0, 0, 900, 300)) expect(Math.max(p.w / p.h, p.h / p.w)).toBeLessThan(3);
  });

  it('lo que vale 0 no ocupa sitio, y sin sitio o sin piezas no hay nada que encajar', () => {
    expect(encajar([{ clave: 'a', valor: 5 }, { clave: 'b', valor: 0 }], 0, 0, 100, 50)).toEqual([{ clave: 'a', valor: 5, x: 0, y: 0, w: 100, h: 50 }]);
    expect(encajar([], 0, 0, 100, 50)).toEqual([]);
    expect(encajar([{ clave: 'a', valor: 5 }], 0, 0, 0, 50)).toEqual([]);
  });

  it('conserva los datos de cada elemento y no altera la lista que recibe', () => {
    const entrada = [{ clave: 'x', valor: 1, nombre: 'Pequeña' }, { clave: 'y', valor: 3, nombre: 'Grande' }];
    const r = encajar(entrada, 0, 0, 40, 10);
    expect(r.map((p) => p.nombre)).toEqual(['Grande', 'Pequeña']);
    expect(entrada.map((p) => p.clave)).toEqual(['x', 'y']);
  });
});

// Datos inventados con la forma de las filas ctr_*
function datos() {
  const contrato = (id, extra) => ({ id, codigo: `C${String(id).padStart(2, '0')}`, estado_documental: 'Vigente', vivo: true, renovacion: 'tácita', preaviso_dias: 30, inicio_precision: 'dia', fin_precision: 'dia', ...extra });
  return {
    contratos: [
      contrato(1, { proveedor_nombre: 'Calibra S.L.', proveedor_codigo: '100', categoria: 'Calibración', vista: 'compras_fabrica', objeto: 'Calibración de grupos', importe_anual: 900, inicio: '2026-01-01', fin: '2026-12-31' }),
      contrato(2, { proveedor_nombre: 'Grúas Norte', proveedor_codigo: '200', categoria: 'Mantenimiento', vista: 'compras_fabrica', objeto: 'Puentes grúa', importe_anual: 400, inicio: '2025-06-01', fin: '2026-05-31' }), // vencido
      contrato(3, { proveedor_nombre: 'Plagas Sur', proveedor_codigo: null, categoria: 'Mantenimiento', vista: 'compras_fabrica', objeto: 'Control de plagas', importe_anual: null }), // sin importe ni vencimiento
      contrato(4, { proveedor_nombre: 'Seguros Uno', proveedor_codigo: '300', categoria: 'Seguro', vista: 'administracion', objeto: 'Multirriesgo', importe_anual: 3000, inicio: '2026-03-01', fin: '2027-03-01' }),
      contrato(5, { proveedor_nombre: 'SEGUROS UNO, S.A.', proveedor_codigo: '300', categoria: 'Seguro', vista: 'administracion', objeto: 'Flota', importe_anual: 1000.5, inicio: '2026-03-01', fin: '2027-03-01' }),
      contrato(6, { proveedor_nombre: 'Antiguo', categoria: 'Seguro', vista: 'administracion', objeto: 'Póliza vieja', importe_anual: 9999, estado_documental: 'Histórico', vivo: false }),
    ],
    grupos: [{ id: 10, nombre: 'Eslingas', tipo: 'Elevación', nave: 'Gavilanes 21' }],
    equipos: [
      { id: 1, nombre: 'Grupo de soldadura 001', tipo: 'Grupo de soldadura', estado: 'activo', regimen: 'propio' },
      { id: 2, nombre: 'Grupo de soldadura 002', tipo: 'Grupo de soldadura', estado: 'activo', regimen: 'propio' },
      { id: 3, nombre: 'Grupo de soldadura 003', tipo: 'Grupo de soldadura', estado: 'baja', regimen: 'propio' },
      { id: 4, nombre: 'Puente grúa', tipo: 'Elevación', estado: 'activo', regimen: 'propio' },
      { id: 5, nombre: 'Radial', tipo: 'Herramienta en renting', estado: 'activo', regimen: 'renting', sin_plan: true },
      { id: 11, grupo_id: 10, nombre: 'Eslinga 01', tipo: 'Elevación', estado: 'activo', regimen: 'propio' },
      { id: 12, grupo_id: 10, nombre: 'Eslinga 02', tipo: 'Elevación', estado: 'activo', regimen: 'propio' },
      { id: 13, grupo_id: 10, nombre: 'Eslinga 03', tipo: 'Elevación', estado: 'baja', regimen: 'propio' },
    ],
    contratoEquipo: [{ contrato_id: 2, equipo_id: 4 }],
    obligaciones: [
      { id: 1, equipo_id: 1, contrato_id: 1, tipo: 'Calibración', etiqueta: 'Calibración anual', periodicidad_meses: 12, proveedor_nombre: 'Calibra', primera_fecha: '2025-09-01', primera_fecha_precision: 'dia', activa: true }, // fuera de plazo
      { id: 2, equipo_id: 2, contrato_id: 1, tipo: 'Calibración', etiqueta: 'Calibración anual', periodicidad_meses: 12, proveedor_nombre: 'Calibra', primera_fecha: '2026-06-01', primera_fecha_precision: 'dia', activa: true }, // en plazo
      { id: 3, equipo_id: 4, contrato_id: 2, tipo: 'Revisión', etiqueta: 'Revisión anual', periodicidad_meses: 12, proveedor_nombre: 'Grúas', primera_fecha: '2026-06-01', primera_fecha_precision: 'dia', activa: true },
      { id: 4, grupo_id: 10, contrato_id: null, tipo: 'Inspección', etiqueta: 'Inspección semestral', periodicidad_meses: 6, proveedor_nombre: 'Cables del Centro', primera_fecha: null, activa: true }, // sin fecha, por pedido
    ],
  };
}

describe('mapaEquipos: la chapa de lo que se mantiene', () => {
  const mapa = mapaEquipos(construirModelo(datos(), HOY));
  const pieza = (nombre) => mapa.piezas.find((p) => p.nombre === nombre);

  it('mide en unidades en servicio: un grupo pesa sus unidades y las bajas no cuentan', () => {
    expect(mapa.total).toBe(6); // 2 soldadura + puente grúa + 2 eslingas + radial
    expect(pieza('Elevación')).toMatchObject({ valor: 3, filas: 2 });
    expect(pieza('Grupo de soldadura')).toMatchObject({ valor: 2, filas: 2 });
    expect(mapa.piezas.map((p) => p.nombre)).toEqual(['Elevación', 'Grupo de soldadura', 'Herramienta en renting']); // de mayor a menor
  });

  it('el estado de cada tipo suma lo mismo que sus unidades', () => {
    expect(pieza('Grupo de soldadura').estados).toEqual({ rojo: 1, ambar: 0, verde: 1, gris: 0 });
    expect(pieza('Elevación').estados).toEqual({ rojo: 0, ambar: 0, verde: 1, gris: 2 }); // las 2 eslingas, sin fecha
    expect(pieza('Herramienta en renting').estados).toEqual({ rojo: 0, ambar: 0, verde: 0, gris: 1 }); // sin plan
    for (const p of mapa.piezas) expect(Object.values(p.estados).reduce((a, b) => a + b, 0)).toBe(p.valor);
  });

  it('dentro de cada tipo, quién lo mantiene: el del contrato, el del pedido o nadie', () => {
    expect(pieza('Grupo de soldadura').partes.map((x) => [x.nombre, x.valor])).toEqual([['Calibra S.L.', 2]]);
    expect(pieza('Elevación').partes.map((x) => [x.nombre, x.valor])).toEqual([['Cables del Centro', 2], ['Grúas Norte', 1]]);
    expect(pieza('Herramienta en renting').partes).toMatchObject([{ nombre: 'Sin mantenedor', sinNombre: true, valor: 1 }]);
    for (const p of mapa.piezas) expect(p.partes.reduce((s, x) => s + x.valor, 0)).toBe(p.valor);
  });
});

describe('mapaContratos: la chapa de lo que se paga', () => {
  const modelo = construirModelo(datos(), HOY);
  const todo = mapaContratos(modelo, ['compras_fabrica', 'administracion']);
  const region = (vista) => todo.regiones.find((r) => r.vista === vista);

  it('mide en importe anual de los contratos vivos; los históricos no entran', () => {
    expect(todo.total).toBe(5300.5);
    expect(todo.n).toBe(5);
    expect(region('administracion')).toMatchObject({ nombre: 'Servicios y arrendamientos', valor: 4000.5, n: 2 });
    expect(region('compras_fabrica')).toMatchObject({ valor: 1300, n: 3, sinImporte: 1 });
  });

  it('un contrato sin importe cuenta, pero no tiene tamaño', () => {
    const mant = region('compras_fabrica').piezas.find((p) => p.nombre === 'Mantenimiento');
    expect(mant).toMatchObject({ valor: 400, n: 2, sinImporte: 1 });
    expect(mant.partes.map((x) => [x.nombre, x.valor, x.sinImporte])).toEqual([['Grúas Norte', 400, 0], ['Plagas Sur', 0, 1]]);
  });

  it('el mismo nº de proveedor es el mismo proveedor aunque el nombre venga distinto', () => {
    const seguro = region('administracion').piezas.find((p) => p.nombre === 'Seguro');
    expect(seguro.partes).toHaveLength(1);
    expect(seguro.partes[0]).toMatchObject({ nombre: 'Seguros Uno', valor: 4000.5, n: 2, contratos: [4, 5] });
  });

  it('el estado va en euros para la pieza y en número de contratos para la lista', () => {
    const mant = region('compras_fabrica').piezas.find((p) => p.nombre === 'Mantenimiento');
    expect(mant.estados).toEqual({ rojo: 400, ambar: 0, verde: 0, gris: 0 }); // el vencido; el que no tiene importe no pinta
    expect(mant.estadosN).toEqual({ rojo: 1, ambar: 0, verde: 0, gris: 1 });
    for (const r of todo.regiones) for (const p of r.piezas) {
      expect(Object.values(p.estados).reduce((a, b) => a + b, 0)).toBeCloseTo(p.valor, 2);
      expect(Object.values(p.estadosN).reduce((a, b) => a + b, 0)).toBe(p.n);
    }
  });

  it('compras solo recibe su vista: ni una categoría ni un euro de Administración', () => {
    const suyo = mapaContratos(modelo, ['compras_fabrica']);
    expect(suyo.regiones.map((r) => r.vista)).toEqual(['compras_fabrica']);
    expect(suyo.total).toBe(1300);
    expect(JSON.stringify(suyo)).not.toMatch(/Seguro/);
  });
});
