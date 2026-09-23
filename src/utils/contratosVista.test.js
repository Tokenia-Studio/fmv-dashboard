import { describe, it, expect } from 'vitest';
import {
  construirModelo,
  calendario,
  resumenProveedores,
  importeAnualDe,
  hayDiscrepancia,
  sumaEnTotales,
  componerNombreFichero,
  proveedorCortoPropuesto,
  bloqueFecha,
  slugBloque,
  vistaPropuesta,
  fechaRealizadaValida,
  siguienteCodigo,
  textoFecha,
  filasEquipos,
  codigoProveedorBC,
  fichaDesdePropuesta,
  proveedorDelMaestro,
  equiposDesdePropuesta,
  regimenPorCategoria,
  tipoEquipoPropuesto,
  etiquetaRevision,
  equipoExistente,
} from './contratosVista.js';

const HOY = new Date(2026, 8, 23); // 23/09/2026

// Datos mínimos con la forma de las filas ctr_* (sin importes reales)
function datosBase() {
  return {
    contratos: [
      { id: 1, codigo: 'C01', proveedor_nombre: 'Gruaspuente Electrocranes S.L.', proveedor_codigo: '1564', categoria: 'Mantenimiento', vista: 'compras_fabrica', objeto: 'Revisión puentes grúa', importe: 400, periodicidad: 'anual', importe_anual: 400, inicio: '2026-06-30', inicio_precision: 'dia', fin: '2027-06-29', fin_precision: 'dia', renovacion: 'expresa', preaviso_dias: null, estado_documental: 'Vigente', vivo: true },
      { id: 2, codigo: 'C06', proveedor_nombre: 'Nippon Gases', proveedor_codigo: null, categoria: 'Renting', vista: 'administracion', objeto: 'Tanque', importe: 1200, periodicidad: 'anual', importe_anual: 1200, importe_declarado: 999, inicio: '2020-10-15', inicio_precision: 'dia', fin: null, renovacion: 'tácita', preaviso_dias: 30, estado_documental: 'Por confirmar', vivo: true },
      { id: 3, codigo: 'H01', proveedor_nombre: 'Antiguo', proveedor_codigo: null, categoria: 'Mantenimiento', vista: 'compras_fabrica', objeto: 'Viejo', importe_anual: 5000, estado_documental: 'Histórico', vivo: false },
      { id: 4, codigo: 'C20', proveedor_nombre: 'Telefónica', proveedor_codigo: '9', categoria: 'Telecomunicaciones', vista: 'administracion', objeto: 'Líneas', importe_anual: 3000, fin: '2026-06-30', fin_precision: 'dia', renovacion: 'tácita', preaviso_dias: 30, estado_documental: 'Vigente', vivo: true },
    ],
    grupos: [{ id: 10, nombre: 'Eslingas nave 21', tipo: 'Eslingas', nave: 'Gavilanes 21' }],
    equipos: [
      { id: 100, nombre: 'Grupo de soldadura 072', tipo: 'Grupo de soldadura', estado: 'activo', regimen: 'propio', activo_fijo_bc: null, sin_plan: false, num_serie: 'SN1' },
      { id: 101, nombre: 'Puente grúa 1', tipo: 'Elevación', estado: 'activo', regimen: 'propio', activo_fijo_bc: 'AF1', sin_plan: false },
      { id: 102, nombre: 'Soldadura 099 (baja)', tipo: 'Grupo de soldadura', estado: 'baja', regimen: 'propio', activo_fijo_bc: null, sin_plan: false },
      { id: 103, nombre: 'Tanque Nippon', tipo: 'Instalaciones', estado: 'activo', regimen: 'renting', activo_fijo_bc: null, sin_plan: true },
      { id: 110, grupo_id: 10, nombre: 'Eslinga 1', tipo: 'Eslingas', estado: 'activo', regimen: 'propio', activo_fijo_bc: 'X', sin_plan: false },
      { id: 111, grupo_id: 10, nombre: 'Eslinga 2', tipo: 'Eslingas', estado: 'activo', regimen: 'propio', activo_fijo_bc: 'X', sin_plan: false },
      { id: 112, grupo_id: 10, nombre: 'Eslinga 3', tipo: 'Eslingas', estado: 'baja', regimen: 'propio', activo_fijo_bc: 'X', sin_plan: false },
    ],
    contratoEquipo: [
      { contrato_id: 1, equipo_id: 101 },
      { contrato_id: 2, equipo_id: 103 },
    ],
    obligaciones: [
      // Calibración anual por pedido, última 04/09/2025 → toca 04/09/2026: fuera de plazo
      { id: 1000, equipo_id: 100, tipo: 'Calibración', etiqueta: 'Calibración anual', periodicidad_meses: 12, primera_fecha: '2025-09-04', primera_fecha_precision: 'dia', activa: true },
      // Revisión del puente grúa cubierta por el contrato C01
      { id: 1001, equipo_id: 101, contrato_id: 1, tipo: 'Revisión', etiqueta: 'Revisión anual', periodicidad_meses: 12, primera_fecha: '2026-06-30', primera_fecha_precision: 'dia', activa: true },
      // Equipo de baja: no genera nada
      { id: 1002, equipo_id: 102, tipo: 'Calibración', etiqueta: 'Calibración anual', periodicidad_meses: 12, primera_fecha: '2024-01-01', primera_fecha_precision: 'dia', activa: true },
      // Grupo: inspección semestral, realizada con resultado por unidad
      { id: 1003, grupo_id: 10, tipo: 'Inspección', etiqueta: 'Inspección semestral', periodicidad_meses: 6, activa: true, pedido_pcp: 'PCP-77' },
      // Sin fecha: solo texto de periodicidad
      { id: 1004, equipo_id: 101, tipo: 'Inspección', etiqueta: 'Inspección OCA', periodicidad_meses: null, activa: true },
    ],
    realizadas: [
      { id: 5000, obligacion_id: 1003, fecha: '2026-08-10', resultado: 'no apto', documento_id: 20, anulada: false },
      { id: 5001, obligacion_id: 1001, fecha: '2026-07-01', resultado: 'apto', documento_id: null, anulada: true },
    ],
    realizadaUnidades: [
      { realizada_id: 5000, equipo_id: 110, resultado: 'apto' },
      { realizada_id: 5000, equipo_id: 111, resultado: 'no apto' },
      { realizada_id: 5000, equipo_id: 112, resultado: 'no apto' },
    ],
    hitos: [{ id: 1, contrato_id: 2, tipo: 'Pago', descripcion: 'Segundo pago', fecha: '2026-12-15', aviso_dias: 30, cerrado: false }],
    documentos: [
      { id: 20, ruta: 'x/cert.pdf', nombre_original: 'cert.pdf', tipo: 'certificado', rol: 'cierre', fecha: '2026-08-10', obligacion_id: 1003 },
      { id: 21, ruta: 'x/contrato.pdf', nombre_original: 'contrato.pdf', tipo: 'contrato', rol: 'origen', fecha: '2026-06-30' },
      { id: 22, ruta: 'x/sinfecha.pdf', nombre_original: 'sinfecha.pdf', tipo: 'otro', rol: 'otro', fecha: null, equipo_id: 101 },
    ],
    documentoContrato: [{ documento_id: 21, contrato_id: 1 }],
    tareas: [],
    tareasNotas: [],
  };
}

describe('construirModelo · obligaciones', () => {
  const m = construirModelo(datosBase(), HOY);

  it('calcula la próxima fecha y el estado con el motor', () => {
    const o = m.obligacion(1000);
    expect(textoFecha(o.calc.proxima)).toBe('04/09/2026');
    expect(o.calc.estado).toBe('fuera');
    expect(m.obligacion(1001).calc.estado).toBe('ok');
    expect(m.obligacion(1004).calc.estado).toBe('sinfecha');
  });

  it('las realizadas anuladas no cuentan pero se conservan en el historial', () => {
    const o = m.obligacion(1001);
    expect(o.realizadas).toHaveLength(1);
    expect(o.ultimaRealizada).toBeNull();
    expect(textoFecha(o.calc.ultima)).toBe('30/06/2026');
  });

  it('origen: el documento del contrato, el pedido PCP o nada', () => {
    expect(m.obligacion(1001).origen.ok).toBe(true);
    expect(m.obligacion(1003).origen).toEqual({ ok: true, texto: 'Pedido PCP PCP-77' });
    expect(m.obligacion(1000).origen.ok).toBe(false);
  });

  it('cierre de la fecha de partida: vale un documento de cierre del contrato con fecha igual o posterior', () => {
    const d = datosBase();
    d.documentos.push({ id: 23, ruta: 'x/parte.pdf', nombre_original: 'parte.pdf', tipo: 'parte_visita', rol: 'cierre', fecha: '2026-06-30' });
    d.documentoContrato.push({ documento_id: 23, contrato_id: 1 });
    const m2 = construirModelo(d, HOY);
    expect(m2.obligacion(1001).calc.cierreOk).toBe(true); // primera_fecha 30/06/2026, parte del mismo día
    const d3 = datosBase();
    d3.documentos.push({ id: 23, ruta: 'x/parte.pdf', nombre_original: 'parte.pdf', tipo: 'parte_visita', rol: 'cierre', fecha: '2025-06-30' });
    d3.documentoContrato.push({ documento_id: 23, contrato_id: 1 });
    expect(construirModelo(d3, HOY).obligacion(1001).calc.cierreOk).toBe(false); // parte anterior: no prueba la última
  });

  it('cierre: la última realizada con documento lo resuelve', () => {
    expect(m.obligacion(1003).calc.cierreOk).toBe(true);
    expect(m.obligacion(1000).calc.cierreOk).toBe(false);
  });

  it('un equipo de baja no genera obligaciones vivas', () => {
    expect(m.obligacion(1002).viva).toBe(false);
    expect(m.equipo(102).principal).toBeNull();
  });

  it('vista: la de un equipo o grupo es siempre compras_fabrica', () => {
    expect(m.obligacion(1003).vista).toBe('compras_fabrica');
    expect(m.obligacion(1001).vista).toBe('compras_fabrica');
  });
});

describe('construirModelo · equipos y grupos', () => {
  const m = construirModelo(datosBase(), HOY);

  it('la obligación principal de un equipo es la peor (fuera > sin fecha > próxima > en plazo)', () => {
    expect(m.equipo(101).principal.id).toBe(1004);
    expect(m.equipo(100).principal.id).toBe(1000);
  });

  it('las unidades de un grupo heredan la obligación del grupo', () => {
    expect(m.equipo(110).obligaciones.map((o) => o.id)).toEqual([1003]);
  });

  it('no apto unidad a unidad; una unidad de baja deja de señalarse', () => {
    expect(m.obligacion(1003).noAptoUnidades).toEqual([111]);
    expect(m.equipo(111).noApto).toBe(true);
    expect(m.equipo(110).noApto).toBe(false);
    expect(m.equipo(112).noApto).toBe(false);
  });

  it('un equipo de renting enlaza con su contrato (aunque sea de administración)', () => {
    expect(m.equipo(103).contratosIds).toEqual([2]);
    expect(m.contrato(2).equiposIds).toEqual([103]);
  });

  it('una realizada posterior apta retira el no apto', () => {
    const d = datosBase();
    d.realizadas.push({ id: 5002, obligacion_id: 1003, fecha: '2026-09-01', resultado: 'apto', anulada: false });
    d.realizadaUnidades.push({ realizada_id: 5002, equipo_id: 111, resultado: 'apto' });
    const m2 = construirModelo(d, HOY);
    expect(m2.equipo(111).noApto).toBe(false);
  });
});

describe('construirModelo · contratos', () => {
  const m = construirModelo(datosBase(), HOY);

  it('prórroga tácita anual sin fin: vence en el próximo aniversario del inicio', () => {
    expect(textoFecha(m.contrato(2).calc.vence)).toBe('15/10/2026');
    expect(m.contrato(2).calc.estado).toBe('avisar'); // aviso desde el 15/09
  });

  it('vencido sin cerrar y histórico', () => {
    expect(m.contrato(4).calc.estado).toBe('vencido');
    expect(m.contrato(3).calc.estado).toBe('historico');
  });

  it('los hitos cuelgan del contrato con su estado', () => {
    expect(m.contrato(2).hitos[0].calc.estado).toBe('ok');
  });
});

describe('tareas automáticas', () => {
  const m = construirModelo(datosBase(), HOY);
  const claves = m.tareasAutomaticas.map((t) => t.clave);

  it('genera las de obligaciones: origen, cierre, fecha, plazo, no apto', () => {
    expect(claves).toContain('origen:obligacion:1000');
    expect(claves).toContain('cierre:obligacion:1000');
    expect(claves).toContain('plazo:obligacion:1000');
    expect(claves).toContain('fecha:obligacion:1004');
    expect(claves).toContain('noapto:obligacion:1003');
  });

  it('no genera nada de un equipo de baja ni de un contrato histórico', () => {
    expect(claves.some((k) => k.endsWith(':1002'))).toBe(false);
    expect(claves.some((k) => k.endsWith('contrato:3'))).toBe(false);
  });

  it('las unidades de un grupo no piden código de activo fijo una a una', () => {
    const d = datosBase();
    d.equipos = d.equipos.map((e) => (e.grupo_id ? { ...e, activo_fijo_bc: null } : e));
    const claves2 = construirModelo(d, HOY).tareasAutomaticas.map((t) => t.clave);
    expect(claves2.some((k) => /^activobc:equipo:11\d$/.test(k))).toBe(false);
  });

  it('equipo propio sin activo fijo BC; el de renting no lo necesita', () => {
    expect(claves).toContain('activobc:equipo:100');
    expect(claves).not.toContain('activobc:equipo:103');
  });

  it('contratos: vencido, preaviso, origen y proveedor sin nº BC; con la vista del contrato', () => {
    expect(claves).toContain('vencido:contrato:4');
    expect(claves).not.toContain('preaviso:contrato:1'); // renovación expresa: no hay preaviso que confirmar
    expect(claves).toContain('origen:contrato:2');
    const t = m.tareasAutomaticas.find((x) => x.clave === 'proveedorbc:contrato:2');
    expect(t.vista).toBe('administracion');
  });

  it('documento sin fecha', () => {
    expect(claves).toContain('fechadoc:documento:22');
  });

  it('una nota con «pospuesta hasta» futura marca la tarea como pospuesta', () => {
    const d = datosBase();
    d.tareasNotas = [{ clave: 'plazo:obligacion:1000', responsable: 'Sachi', pospuesta_hasta: '2026-10-01' }];
    const t = construirModelo(d, HOY).tareasAutomaticas.find((x) => x.clave === 'plazo:obligacion:1000');
    expect(t.pospuesta).toBe(true);
    expect(t.nota.responsable).toBe('Sachi');
  });

  it('desaparece sola al resolverse la causa', () => {
    const d = datosBase();
    d.realizadas.push({ id: 6000, obligacion_id: 1000, fecha: '2026-09-15', resultado: 'apto', documento_id: 20, anulada: false });
    const c2 = construirModelo(d, HOY).tareasAutomaticas.map((t) => t.clave);
    expect(c2).not.toContain('plazo:obligacion:1000');
    expect(c2).not.toContain('cierre:obligacion:1000');
  });
});

describe('calendario', () => {
  const m = construirModelo(datosBase(), HOY);

  it('compras_fabrica: atrasados, meses y sin fecha; sin nada de administración', () => {
    const cal = calendario(m, 'compras_fabrica');
    expect(cal.atrasados.map((e) => e.clave)).toEqual(['o1000']);
    expect(cal.sinFecha.map((e) => e.clave)).toEqual(['o1004']);
    expect(cal.meses).toHaveLength(13);
    const todos = cal.meses.flatMap((x) => x.eventos).map((e) => e.clave);
    expect(todos).toContain('o1003'); // 10/08 + 6 meses = febrero 2027
    expect(todos).not.toContain('v2');
  });

  it('administración: el vencimiento, la fecha de aviso y los hitos como eventos propios', () => {
    const cal = calendario(m, 'administracion');
    const todos = cal.meses.flatMap((x) => x.eventos).map((e) => e.clave);
    expect(todos).toContain('v2');
    expect(todos).not.toContain('a2'); // el aviso (15/09) ya pasó: el contrato está en plazo de aviso
    expect(todos).toContain('h1');
    expect(cal.atrasados.map((e) => e.clave)).toEqual(['v4']);
  });

  it('agrupa las calibraciones de grupos de soldadura', () => {
    const cal = calendario(m, 'compras_fabrica');
    expect(cal.atrasados[0].agrupar).toBe('Calibración de grupos de soldadura');
  });
});

describe('importes', () => {
  it('normaliza a 12 meses', () => {
    expect(importeAnualDe(100, 'mes')).toBe(1200);
    expect(importeAnualDe(300, 'trimestre')).toBe(1200);
    expect(importeAnualDe(400, 'anual')).toBe(400);
    expect(importeAnualDe(400, 'único')).toBeNull();
    expect(importeAnualDe(null, 'mes')).toBeNull();
    expect(importeAnualDe(400, 'por visita trimestral')).toBeNull(); // texto del inventario: no se inventa
  });

  it('discrepancia solo si lo declarado no coincide ni con la cuota ni con el anual', () => {
    expect(hayDiscrepancia({ importe_declarado: 100, importe: 100, importe_anual: 1200 })).toBe(false);
    expect(hayDiscrepancia({ importe_declarado: 1200, importe: 100, importe_anual: 1200 })).toBe(false);
    expect(hayDiscrepancia({ importe_declarado: 999, importe: 100, importe_anual: 1200 })).toBe(true);
    expect(hayDiscrepancia({ importe_declarado: null, importe_anual: 1200 })).toBe(false);
  });

  it('los históricos, sustituidos y puntuales no suman', () => {
    expect(sumaEnTotales({ vivo: true, estado_documental: 'Vigente' })).toBe(true);
    expect(sumaEnTotales({ vivo: true, estado_documental: 'Puntual' })).toBe(false);
    expect(sumaEnTotales({ vivo: false, estado_documental: 'Vigente' })).toBe(false);
  });
});

describe('proveedores', () => {
  it('nº de proveedor en formato BC: 6 dígitos con ceros', () => {
    expect(codigoProveedorBC('1438')).toBe('001438');
    expect(codigoProveedorBC('001438')).toBe('001438');
    expect(codigoProveedorBC(' 587 ')).toBe('000587');
    expect(codigoProveedorBC('')).toBeNull();
    expect(codigoProveedorBC('PRV-12')).toBe('PRV-12');
  });

  it('agrupa por nº BC, suma solo lo vivo y usa el nombre del maestro (el inventario trae el nº sin ceros)', () => {
    const m = construirModelo(datosBase(), HOY);
    const r = resumenProveedores(m.contratos, { '001564': 'GRUASPUENTE ELECTROCRANES' });
    const g = r.find((x) => x.codigo === '001564');
    expect(g.nombre).toBe('GRUASPUENTE ELECTROCRANES');
    expect(g.enMaestro).toBe(true);
    const antiguo = r.find((x) => x.nombre === 'Antiguo');
    expect(antiguo.importeAnual).toBe(0);
    expect(antiguo.conImporte).toBe(false);
  });
});

describe('nombres de fichero (convención 22/09/2026)', () => {
  it('compone el nombre con la tabla de correspondencia de tipos', () => {
    expect(componerNombreFichero({ fecha: '2026-06-30', precision: 'dia', proveedorCorto: 'Gruaspuente', tipo: 'contrato', objeto: 'Revisión puentes grúa G21' }))
      .toBe('2026-06-30_Gruaspuente_Contrato_Revision-puentes-grua-G21.pdf');
    expect(componerNombreFichero({ fecha: '2026-05-01', precision: 'mes', proveedorCorto: 'Chubb', tipo: 'renovacion', objeto: 'RIPCI G19', referencia: '185283' }))
      .toBe('2026-05-00_Chubb_Contrato_RIPCI-G19_185283.pdf');
    expect(componerNombreFichero({ fecha: null, proveedorCorto: 'Castolin', tipo: 'certificado', objeto: 'Calibración', referencia: 'SN 4471' }))
      .toBe('0000-00-00_Castolin_Certificado_Calibracion_SN-4471.pdf');
    expect(componerNombreFichero({ fecha: '2026-04-08', proveedorCorto: 'Coessegur', tipo: 'parte_visita', objeto: 'Revisión extintores G21' }))
      .toBe('2026-04-08_Coessegur_Parte_Revision-extintores-G21.pdf');
  });

  it('bloques: sin acentos, ñ ni espacios; objeto recortado a cinco palabras', () => {
    expect(slugBloque('Año señal / grúa')).toBe('Ano-senal-grua');
    expect(componerNombreFichero({ fecha: '2026-01-01', proveedorCorto: 'X', tipo: 'otro', objeto: 'uno dos tres cuatro cinco seis' }))
      .toBe('2026-01-01_X_Otro_uno-dos-tres-cuatro-cinco.pdf');
    expect(bloqueFecha('2026-03-01', 'año')).toBe('2026-00-00');
  });

  it('propone un nombre corto de proveedor sin forma jurídica', () => {
    expect(proveedorCortoPropuesto('Gruaspuente Electrocranes S.L.')).toBe('Gruaspuente');
    expect(proveedorCortoPropuesto('Chubb Iberia S.L.')).toBe('Chubb');
    expect(proveedorCortoPropuesto('Castolin / Fronius-Praxair')).toBe('Castolin');
  });
});

describe('filasEquipos (lista y panel)', () => {
  const m = construirModelo(datosBase(), HOY);
  const filas = filasEquipos(m);
  const fila = (clave) => filas.find((f) => f.clave === clave);

  it('un grupo es una sola fila con sus unidades en servicio', () => {
    expect(filas.filter((f) => f.tipo === 'grupo')).toHaveLength(1);
    expect(filas.some((f) => f.clave === 'e110')).toBe(false);
    expect(fila('g10').unidades).toBe(2);
    expect(fila('g10').noAptas).toBe(1);
  });

  it('situación: la de la obligación principal, sin plan o de baja', () => {
    expect(fila('e100').situacion).toBe('fuera');
    expect(fila('e101').situacion).toBe('sinfecha');
    expect(fila('e102').situacion).toBe('baja');
    expect(fila('e103').situacion).toBe('sinplan');
  });

  it('marca falta de cierre y de origen', () => {
    expect(fila('e100').sinCierre).toBe(true);
    expect(fila('e100').sinOrigen).toBe(true);
    expect(fila('g10').sinCierre).toBe(false);
  });
});

describe('utilidades', () => {
  it('vista propuesta por categoría', () => {
    expect(vistaPropuesta('Mantenimiento')).toBe('compras_fabrica');
    expect(vistaPropuesta('Seguro')).toBe('administracion');
  });

  it('no admite realizadas con fecha futura ni fechas incompletas', () => {
    expect(fechaRealizadaValida('2026-09-23', HOY)).toBe(true);
    expect(fechaRealizadaValida('2026-09-24', HOY)).toBe(false);
    expect(fechaRealizadaValida('2026-09', HOY)).toBe(false);
  });

  it('siguiente código correlativo', () => {
    expect(siguienteCodigo([{ codigo: 'C49' }, { codigo: 'H07' }, { codigo: 'C05' }])).toBe('C50');
    expect(siguienteCodigo([])).toBe('C01');
  });
});

describe('lector asistido: de la propuesta a la ficha', () => {
  const maestro = { '001564': 'GRUASPUENTE ELECTROCRANES S.L.', '001438': 'CHUBB IBERIA, S.L.', '000100': 'CHUBB FIRE' };

  it('contrato: pasa los campos, marca dudosos y casa el proveedor en el maestro', () => {
    const r = fichaDesdePropuesta({
      tipo: 'contrato',
      campos: {
        proveedor_nombre: { valor: 'Gruaspuente Electrocranes S.L.', dudoso: false },
        importe: { valor: 400, dudoso: false },
        periodicidad: { valor: 'anual', dudoso: false },
        fin: { valor: '2027-06-01', dudoso: true, precision: 'mes' },
        preaviso_dias: { valor: null, dudoso: false },
      },
      avisos: ['x'],
    }, maestro);
    expect(r.valores.proveedor_codigo).toBe('001564');
    expect(r.valores.proveedor_corto).toBe('Gruaspuente');
    expect(r.valores.fin).toBe('2027-06-01');
    expect(r.valores.fin_precision).toBe('mes');
    expect(r.marcas.fin).toBe('dudoso');
    expect(r.marcas.importe).toBe('propuesto');
    expect('preaviso_dias' in r.valores).toBe(false); // lo que no aparece no se inventa
    expect(r.avisos).toEqual(['x']);
  });

  it('proveedor ambiguo en el maestro: no se propone nº (dos «Chubb»)', () => {
    expect(proveedorDelMaestro('Chubb Iberia S.L.', maestro)).toBeNull();
  });

  it('factura sin contrato: estado «Sin contrato», pago único y periodo cubierto', () => {
    const r = fichaDesdePropuesta({
      tipo: 'factura',
      campos: {
        proveedor_nombre: { valor: 'Calor Industrial S.L.', dudoso: false },
        concepto: { valor: 'Mantenimiento generador 3 años', dudoso: false },
        importe_sin_iva: { valor: 1500, dudoso: false },
        periodo_inicio: { valor: '2026-02-01', dudoso: false, precision: 'dia' },
        periodo_fin: { valor: '2029-01-31', dudoso: false, precision: 'dia' },
        numero_factura: { valor: 'F-77', dudoso: false },
      },
    });
    expect(r.valores).toMatchObject({ estado_documental: 'Sin contrato', periodicidad: 'único', objeto: 'Mantenimiento generador 3 años', importe: 1500, fin: '2029-01-31', referencia: 'F-77' });
  });

  it('equipos mencionados → equipos nuevos con tipo y régimen propuestos', () => {
    const eq = equiposDesdePropuesta({ equipos: [{ descripcion: 'Puente grúa GH 10T', unidades: 2, num_serie: null, modelo: 'GH' }, { descripcion: '  ', unidades: 1 }] }, 'Renting', 'Arrendamiento');
    expect(eq).toEqual([{ nombre: 'Puente grúa GH 10T', tipo: 'Elevación', unidades: 2, num_serie: '', modelo: 'GH', regimen: 'renting' }]);
    expect(regimenPorCategoria('Mantenimiento', 'Alquiler carretilla')).toBe('alquiler');
    expect(regimenPorCategoria('Mantenimiento', 'Revisión compresores')).toBe('propio');
    expect(tipoEquipoPropuesto('Compresor DRC 60')).toBe('Aire comprimido');
    expect(tipoEquipoPropuesto('Cosa rara')).toBe('Instalaciones');
  });

  it('etiqueta de la revisión propuesta', () => {
    expect(etiquetaRevision(12)).toBe('Revisión anual');
    expect(etiquetaRevision(4)).toBe('Revisión cada 4 meses');
    expect(etiquetaRevision(6, 'Inspección')).toBe('Inspección semestral');
  });
});

describe('lector: no duplicar equipos que ya existen', () => {
  const d = datosBase();
  d.grupos.push({ id: 11, nombre: 'Puente grúa GH', tipo: 'Elevación', nave: 'Gavilanes 21' });
  d.equipos.push(
    { id: 120, grupo_id: 11, nombre: 'Puente grúa GH 01', tipo: 'Elevación', estado: 'activo', regimen: 'propio' },
    { id: 121, grupo_id: 11, nombre: 'Puente grúa GH 02', tipo: 'Elevación', estado: 'activo', regimen: 'propio' },
    { id: 130, nombre: 'Compresor DRC 60 VF', tipo: 'Aire comprimido', estado: 'activo', regimen: 'propio', num_serie: 'AB-123' },
  );
  const m = construirModelo(d, HOY);

  it('casa «Puente grúa» ×2 con el grupo «Puente grúa GH» de 2 unidades aunque haya otro puente grúa suelto', () => {
    expect(equipoExistente({ nombre: 'Puente grúa', tipo: 'Elevación', unidades: 2 }, m)).toEqual({ tipo: 'grupo', id: 11, nombre: 'Puente grúa GH' });
  });

  it('ambiguo y sin desempate por unidades: no propone ninguno', () => {
    expect(equipoExistente({ nombre: 'Puente grúa', tipo: 'Elevación', unidades: 1 }, m)).toBeNull();
  });

  it('casa por nº de serie aunque el nombre no se parezca', () => {
    expect(equipoExistente({ nombre: 'Unidad de aire', tipo: 'Aire comprimido', num_serie: 'ab123' }, m)?.id).toBe(130);
  });

  it('distinto tipo o nombre que no encaja: no propone ninguno', () => {
    expect(equipoExistente({ nombre: 'Puente grúa', tipo: 'Maquinaria' }, m)).toBeNull();
    expect(equipoExistente({ nombre: 'Plegadora Amada', tipo: 'Maquinaria' }, m)).toBeNull();
  });
});
