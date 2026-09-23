// npm test   (vitest)
// Los 11 primeros casos son los de la POC del 21/09/2026, que se validaron contra el
// Excel del inventario; el fixture lleva solo fechas y periodicidades (sin importes ni
// proveedores). El resto cubre los adaptadores a filas de Supabase, los hitos y los grupos.
import { describe, test, expect } from 'vitest';
import * as M from './contratosMotor.js';
import D from './__fixtures__/contratosMotor.inventario.json';

const HOY = new Date(2026, 8, 21); // 21/09/2026, el día del inventario que fija las cifras del fixture
const iso = M.iso;
const ob = (extra) => ({
  ultima: null, pistaProxima: null, mesHabitual: null, periodicidadMeses: null,
  cierre: { ok: false, texto: 'x' }, ...extra,
});
const contrato = (id) => D.contratos.find((x) => x.id === id);

describe('obligaciones (POC)', () => {
  test('última + periodicidad genera la próxima', () => {
    const r = M.calcularObligacion(ob({ ultima: '2025-09-04', periodicidadMeses: 12 }), [], HOY);
    expect(iso(r.proxima.d)).toBe('2026-09-04');
    expect(r.estado).toBe('fuera');
  });

  test('al registrar una realizada, la siguiente se genera sola y el cierre depende del documento', () => {
    const o = ob({ ultima: '2025-09-04', periodicidadMeses: 12 });
    const con = M.calcularObligacion(o, [{ fecha: '2026-09-18', documento: 'Certificado 072.pdf' }], HOY);
    expect(iso(con.proxima.d)).toBe('2027-09-18');
    expect(con.estado).toBe('ok');
    expect(con.cierreOk).toBe(true);
    const sin = M.calcularObligacion(o, [{ fecha: '2026-09-18', documento: '' }], HOY);
    expect(sin.cierreOk).toBe(false);
    expect(sin.cierreTexto).toMatch(/reclamarlo/);
  });

  test('sin última ni pista no se inventa fecha', () => {
    const r = M.calcularObligacion(ob({ periodicidadMeses: 12 }), [], HOY);
    expect(r.proxima).toBeNull();
    expect(r.estado).toBe('sinfecha');
    expect(r.dias).toBeNull();
  });

  test('mes habitual: salta al año siguiente si la última ya cubre el de este año', () => {
    const abril = M.calcularObligacion(ob({ ultima: '2026-04-23', mesHabitual: 4, periodicidadMeses: 12 }), [], HOY);
    expect(iso(abril.proxima.d)).toBe('2027-04-01');
    const octubre = M.calcularObligacion(ob({ ultima: '2025-10-14', mesHabitual: 10, periodicidadMeses: 12 }), [], HOY);
    expect(iso(octubre.proxima.d)).toBe('2026-10-01');
    expect(octubre.estado).toBe('proxima');
  });

  test('una fecha con precisión de mes no vence hasta fin de mes', () => {
    const r = M.calcularObligacion(ob({ pistaProxima: '2026-09' }), [], HOY);
    expect(r.estado).toBe('proxima');
    expect(iso(M.finPeriodo(r.proxima))).toBe('2026-09-30');
  });

  test('la pista anunciada se ignora si ya se ha realizado después', () => {
    const r = M.calcularObligacion(
      ob({ pistaProxima: '2026-09-16', periodicidadMeses: 12 }),
      [{ fecha: '2026-09-16', documento: 'Parte.pdf' }],
      HOY,
    );
    expect(iso(r.proxima.d)).toBe('2027-09-16');
  });

  test('el calendario generado reproduce las calibraciones de la hoja Vencimientos', () => {
    const porMes = {};
    for (const o of D.obligaciones.filter((x) => x.tipo === 'Calibración')) {
      const r = M.calcularObligacion(ob(o), [], HOY);
      if (r.proxima) {
        const k = iso(r.proxima.d).slice(0, 7);
        porMes[k] = (porMes[k] || 0) + 1;
      }
    }
    for (const v of D.vencimientosHoja) {
      expect(porMes[v.fecha.slice(0, 7)], `calibraciones de ${v.fecha.slice(0, 7)}`).toBe(v.grupos);
    }
  });
});

describe('contratos (POC)', () => {
  test('fecha límite de aviso = fin − preaviso', () => {
    const r = M.calcularContrato(contrato('C17'), HOY); // Grenke 5 radiales: fin 30/11/2026, 30 días
    expect(iso(r.vence.d)).toBe('2026-11-30');
    expect(iso(r.avisar)).toBe('2026-10-31');
    expect(r.estado).toBe('proximo');
  });

  test('prórroga tácita sin fecha fin vence en el aniversario', () => {
    const r = M.calcularContrato(contrato('C05'), HOY); // inicio 01/04/2026, 90 días
    expect(iso(r.vence.d)).toBe('2027-04-01');
    expect(iso(r.avisar)).toBe('2027-01-01');
    expect(r.como).toBe('Prórroga tácita anual');
  });

  test('contrato vencido sin cerrar', () => {
    expect(M.calcularContrato(contrato('C36'), HOY).estado).toBe('vencido');
  });

  test('el aviso coincide con la columna "Avisar antes de" calculada a mano en el Excel', () => {
    const distintos = [];
    for (const c of D.contratos) {
      if (!c.avisarAntes || c.avisarAntes.length !== 10) continue;
      const r = M.calcularContrato(c, HOY);
      if (!r.avisar || iso(r.avisar) !== c.avisarAntes) {
        distintos.push(`${c.id}: Excel ${c.avisarAntes} · motor ${r.avisar && iso(r.avisar)}`);
      }
    }
    expect(distintos).toEqual([]);
  });

  test('un contrato histórico nunca avisa', () => {
    const r = M.calcularContrato({ fin: '2026-09-30', preaviso: 30, vivo: false }, HOY);
    expect(r.estado).toBe('historico');
  });

  test('sin fecha fin ni prórroga tácita anual: sin vencimiento', () => {
    expect(M.calcularContrato({ inicio: '2025-01-01', renovacion: 'expresa', periodicidad: 'anual', vivo: true }, HOY).estado).toBe('sinvenc');
    expect(M.calcularContrato({ inicio: '2025-01-01', renovacion: 'tácita', periodicidad: 'mes', vivo: true }, HOY).estado).toBe('sinvenc');
  });

  test('dentro del preaviso pasa a «avisar»', () => {
    const r = M.calcularContrato({ fin: '2026-10-10', preaviso: 30, vivo: true }, HOY);
    expect(iso(r.avisar)).toBe('2026-09-10');
    expect(r.estado).toBe('avisar');
  });
});

describe('fechas', () => {
  test('sumar meses conserva el día y recorta a fin de mes', () => {
    expect(iso(M.sumarMeses(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(iso(M.sumarMeses(new Date(2026, 2, 15), 12))).toBe('2027-03-15');
  });

  test('parseFecha deduce la precisión de la longitud', () => {
    expect(M.parseFecha('2026').p).toBe('año');
    expect(M.parseFecha('2026-05').p).toBe('mes');
    expect(M.parseFecha('2026-05-07').p).toBe('dia');
    expect(M.parseFecha('mayo 2026')).toBeNull();
    expect(M.parseFecha(null)).toBeNull();
  });

  test('aTexto convierte fecha + precisión de Supabase al texto del motor', () => {
    expect(M.aTexto('2026-05-07', 'dia')).toBe('2026-05-07');
    expect(M.aTexto('2026-05-07', 'mes')).toBe('2026-05');
    expect(M.aTexto('2026-05-07', 'año')).toBe('2026');
    expect(M.aTexto('2026-05-07', null)).toBe('2026-05-07');
    expect(M.aTexto(null, 'dia')).toBeNull();
  });
});

describe('adaptadores desde filas de Supabase', () => {
  test('historialDesdeRealizadas descarta anuladas y ordena por fecha', () => {
    const h = M.historialDesdeRealizadas([
      { id: 3, fecha: '2026-09-18', documento_id: 7, anulada: false },
      { id: 1, fecha: '2024-09-01', documento_id: null, anulada: false },
      { id: 2, fecha: '2025-09-04', documento_id: null, anulada: true },
      { id: 4, fecha: '2025-09-05', documento_nombre: 'Certificado.pdf', anulada: false },
    ]);
    expect(h.map((x) => x.id)).toEqual([1, 4, 3]);
    expect(h[2].documento).toBe(7);
    expect(h[1].documento).toBe('Certificado.pdf');
  });

  test('una realizada anulada no cuenta: la próxima sale de la anterior', () => {
    const fila = { primera_fecha: '2024-09-01', primera_fecha_precision: 'dia', periodicidad_meses: 12 };
    const hist = M.historialDesdeRealizadas([
      { id: 1, fecha: '2025-09-04', documento_id: 5, anulada: false },
      { id: 2, fecha: '2026-09-10', documento_id: null, anulada: true },
    ]);
    const r = M.calcularObligacion(M.obligacionDesdeFila(fila), hist, HOY);
    expect(iso(r.proxima.d)).toBe('2026-09-04');
    expect(r.estado).toBe('fuera');
  });

  test('obligacionDesdeFila usa primera_fecha como base y la fecha anunciada como pista', () => {
    const o = M.obligacionDesdeFila({
      primera_fecha: '2026-03-01', primera_fecha_precision: 'mes',
      fecha_anunciada: '2027-02-01', fecha_anunciada_precision: 'mes',
      mes_habitual: null, periodicidad_meses: 12,
    });
    expect(o.ultima).toBe('2026-03');
    expect(o.pistaProxima).toBe('2027-02');
    const r = M.calcularObligacion(o, [], HOY);
    expect(iso(r.proxima.d)).toBe('2027-02-01');
    expect(r.como).toBe('Fecha anunciada en la documentación');
  });

  test('contratoDesdeFila traduce columnas y precisiones', () => {
    const c = M.contratoDesdeFila({
      inicio: '2024-11-04', inicio_precision: 'dia', fin: '2026-11-01', fin_precision: 'mes',
      renovacion: 'tácita', periodicidad: 'mes', preaviso_dias: 30, vivo: true,
    });
    const r = M.calcularContrato(c, HOY);
    expect(iso(M.finPeriodo(r.vence))).toBe('2026-11-30');
    expect(iso(r.avisar)).toBe('2026-10-02');
    expect(M.contratoDesdeFila({ vivo: false }).vivo).toBe(false);
    expect(M.contratoDesdeFila({}).vivo).toBe(true);
  });
});

describe('hitos sueltos (US-012)', () => {
  test('aviso = fecha − aviso_dias; cerrado manda sobre todo', () => {
    const h = M.hitoDesdeFila({ fecha: '2026-10-15', aviso_dias: 30, cerrado: false });
    const r = M.calcularHito(h, HOY);
    expect(iso(r.avisar)).toBe('2026-09-15');
    expect(r.estado).toBe('avisar');
    expect(r.dias).toBe(24);
    expect(M.calcularHito({ ...h, cerrado: true }, HOY).estado).toBe('cerrado');
    expect(M.calcularHito({ fecha: '2026-09-01', avisoDias: 30, cerrado: false }, HOY).estado).toBe('vencido');
    expect(M.calcularHito({ fecha: '2027-03-01', avisoDias: 30, cerrado: false }, HOY).estado).toBe('ok');
  });
});

describe('grupos de equipos', () => {
  test('una sola unidad no apta hace no apta la revisión del grupo', () => {
    expect(M.resumenUnidades([{ resultado: 'apto' }, { resultado: 'no apto' }, { resultado: 'apto' }]))
      .toEqual({ total: 3, aptas: 2, noAptas: 1, resultado: 'no apto' });
    expect(M.resumenUnidades([{ resultado: 'apto' }, { resultado: 'apto' }]).resultado).toBe('apto');
    expect(M.resumenUnidades([]).resultado).toBe('sin resultado');
  });

  test('la obligación del grupo se calcula igual que la de un equipo', () => {
    const r = M.calcularObligacion(
      ob({ periodicidadMeses: 12 }),
      M.historialDesdeRealizadas([{ id: 1, fecha: '2026-06-15', documento_nombre: 'Informe eslingas.pdf', anulada: false }]),
      HOY,
    );
    expect(iso(r.proxima.d)).toBe('2027-06-15');
    expect(r.cierreOk).toBe(true);
  });
});
