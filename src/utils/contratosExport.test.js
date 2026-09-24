import { describe, it, expect } from 'vitest';
import { construirModelo, filasEquipos } from './contratosVista.js';
import { celdaFecha, filasExcelEquipos, filasExcelObligaciones, filasExcelUnidades, filasExcelContratos } from './contratosExport.js';

const HOY = new Date(2026, 8, 24);

// Datos mínimos con la forma de las filas ctr_* (sin importes reales)
function datos() {
  return {
    contratos: [
      { id: 1, codigo: 'C01', proveedor_nombre: 'Gruaspuente', proveedor_codigo: '001564', categoria: 'Mantenimiento', vista: 'compras_fabrica', vista_confirmada: true, objeto: 'Revisión puentes grúa', importe: 400, periodicidad: 'anual', importe_anual: 400, inicio: '2026-06-30', inicio_precision: 'dia', fin: '2027-06-29', fin_precision: 'dia', renovacion: 'expresa', preaviso_dias: 30, estado_documental: 'Vigente', vivo: true },
      { id: 3, codigo: 'H01', proveedor_nombre: 'Antiguo', categoria: 'Mantenimiento', vista: 'compras_fabrica', objeto: 'Viejo', importe_anual: 5000, fin: '2025-04-01', fin_precision: 'mes', estado_documental: 'Histórico', vivo: false },
    ],
    grupos: [{ id: 10, nombre: 'Eslingas nave 21', tipo: 'Eslingas', nave: 'Gavilanes 21' }],
    equipos: [
      { id: 100, nombre: 'Grupo de soldadura 072', tipo: 'Grupo de soldadura', estado: 'activo', regimen: 'propio', activo_fijo_bc: null, num_serie: 'SN1', modelo: 'M1' },
      { id: 101, nombre: 'Puente grúa 1', tipo: 'Elevación', estado: 'activo', regimen: 'propio', activo_fijo_bc: 'AF1' },
      { id: 103, nombre: 'Tanque', tipo: 'Instalaciones', estado: 'activo', regimen: 'renting', sin_plan: true },
      { id: 110, grupo_id: 10, nombre: 'Eslinga 1', tipo: 'Eslingas', estado: 'activo', regimen: 'propio', identificacion: 'E-1' },
      { id: 111, grupo_id: 10, nombre: 'Eslinga 2', tipo: 'Eslingas', estado: 'activo', regimen: 'propio' },
    ],
    contratoEquipo: [{ contrato_id: 1, equipo_id: 101 }],
    obligaciones: [
      { id: 1000, equipo_id: 100, tipo: 'Calibración', etiqueta: 'Calibración anual', periodicidad_meses: 12, primera_fecha: '2025-09-04', primera_fecha_precision: 'dia', activa: true, proveedor_nombre: 'Lab X', precio: 90 },
      { id: 1001, equipo_id: 101, contrato_id: 1, tipo: 'Revisión', etiqueta: 'Revisión anual', periodicidad_meses: 12, primera_fecha: '2026-06-01', primera_fecha_precision: 'mes', activa: true },
      { id: 1003, grupo_id: 10, tipo: 'Inspección', etiqueta: 'Inspección semestral', periodicidad_meses: 6, activa: true, pedido_pcp: 'PCP-77' },
    ],
    realizadas: [{ id: 5000, obligacion_id: 1003, fecha: '2026-08-10', resultado: 'no apto', documento_id: 20, anulada: false }],
    realizadaUnidades: [
      { realizada_id: 5000, equipo_id: 110, resultado: 'apto' },
      { realizada_id: 5000, equipo_id: 111, resultado: 'no apto' },
    ],
    documentos: [{ id: 20, tipo: 'certificado', rol: 'cierre', nombre_original: 'cert.pdf', obligacion_id: 1003 }],
    documentoContrato: [],
  };
}

describe('exportación a Excel', () => {
  const m = construirModelo(datos(), HOY);
  const filas = filasEquipos(m);

  it('fechas: día → Date; mes o año → texto; vacío → cadena vacía', () => {
    const d = celdaFecha({ d: new Date(2027, 3, 14), p: 'dia' });
    expect(d).toBeInstanceOf(Date);
    expect(d.getDate()).toBe(14);
    expect(celdaFecha({ d: new Date(2027, 3, 1), p: 'mes' })).toBe('abril de 2027');
    expect(celdaFecha(null)).toBe('');
  });

  it('equipos: una fila por equipo suelto o grupo, con activo fijo pendiente solo si es propio', () => {
    const x = filasExcelEquipos(filas, m);
    expect(x).toHaveLength(4);
    const sold = x.find((f) => f.Equipo === 'Grupo de soldadura 072');
    expect(sold['Activo fijo BC']).toBe('PENDIENTE');
    expect(sold['Nº de serie']).toBe('SN1');
    expect(sold.Situación).toBe('Fuera de plazo');
    expect(x.find((f) => f.Equipo === 'Tanque')['Activo fijo BC']).toBe('No aplica');
    const g = x.find((f) => f.Equipo === 'Eslingas nave 21');
    expect(g.Unidades).toBe(2);
    expect(g['No apto']).toBe('1 no aptas');
    expect(g['Activo fijo BC']).toBe('');
  });

  it('obligaciones: solo las vivas, con proveedor, última realizada y documento de cierre', () => {
    const x = filasExcelObligaciones(filas, m);
    expect(x).toHaveLength(3);
    const cal = x.find((f) => f.Obligación === 'Calibración anual');
    expect(cal.Proveedor).toBe('Lab X');
    expect(cal.Precio).toBe(90);
    expect(cal['Última realizada']).toBeInstanceOf(Date);
    const rev = x.find((f) => f.Obligación === 'Revisión anual');
    expect(rev.Contrato).toBe('C01');
    expect(rev.Proveedor).toBe('Gruaspuente');
    expect(rev['Última realizada']).toBe('junio de 2026');
    const ins = x.find((f) => f.Obligación === 'Inspección semestral');
    expect(ins.Resultado).toBe('no apto');
    expect(ins['Unidades no aptas']).toBe(1);
    expect(ins['Documento de cierre']).toContain('cert.pdf');
  });

  it('respeta el filtro: exportar un subconjunto no arrastra obligaciones de otros equipos', () => {
    const solo = filas.filter((f) => f.nombre === 'Puente grúa 1');
    expect(filasExcelObligaciones(solo, m).map((f) => f.Obligación)).toEqual(['Revisión anual']);
    expect(filasExcelUnidades(solo, m)).toEqual([]);
  });

  it('unidades de grupos con su resultado en la última realizada', () => {
    const x = filasExcelUnidades(filas, m);
    expect(x.map((f) => [f.Unidad, f['Resultado última revisión']])).toEqual([['Eslinga 1', 'apto'], ['Eslinga 2', 'no apto']]);
    expect(x[0].Identificación).toBe('E-1');
  });

  it('contratos: fila por contrato y total solo de los que suman', () => {
    const x = filasExcelContratos(m.contratos);
    expect(x).toHaveLength(3);
    const c01 = x[0];
    expect(c01.Vista).toBe('Equipos y mantenimiento');
    expect(c01['Nº proveedor BC']).toBe('001564');
    expect(c01.Fin).toBeInstanceOf(Date);
    expect(c01['Avisar antes del']).toBeInstanceOf(Date);
    expect(c01['Suma en totales']).toBe('Sí');
    expect(x[1].Fin).toBe('abril de 2025');
    expect(x[1]['Suma en totales']).toBe('No');
    expect(c01['Renovación cada (meses)']).toBe(''); // expresa, con fin
    const tacita = filasExcelContratos([{ ...m.contratos[0], renovacion: 'tácita', fin: null, renovacion_meses: null }]);
    expect(tacita[0]['Renovación cada (meses)']).toBe('12 (supuesto)');
    expect(x[2]['Importe anual']).toBe(400);
  });

  it('lista vacía: sin fila de total', () => {
    expect(filasExcelContratos([])).toEqual([]);
  });
});

describe('libro Excel', () => {
  it('las fechas se escriben con su día exacto (sin el desfase de zona horaria de SheetJS)', async () => {
    const XLSX = await import('xlsx');
    const { hoja, serieExcel } = await import('./contratosExport.js');
    expect(serieExcel(new Date(2027, 5, 29))).toBe(46567);
    const ws = hoja([{ Fin: new Date(2027, 5, 29), 'Importe anual': 1234.5, Vence: 'abril de 2027' }, { Fin: '', 'Importe anual': 400, Vence: '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'C');
    const leida = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), { cellNF: true }).Sheets.C;
    expect(leida.A2.v).toBe(46567);
    expect(leida.A2.w).toBe('29/06/2027');
    expect(leida.B2.z).toBe('#,##0.00');
    expect(leida.C2.v).toBe('abril de 2027');
  });
});
