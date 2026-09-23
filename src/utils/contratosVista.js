/**
 * Módulo de contratos y mantenimiento: todo lo que las pantallas calculan a
 * partir de las filas `ctr_*` (bloques 1.4 y 1.5).
 *
 * El motor de fechas (`contratosMotor.js`) sabe calcular una obligación o un
 * contrato sueltos; aquí se cruzan las 12 tablas para responder a las preguntas
 * de cada pantalla: qué obligaciones cuelgan de un equipo, cuál es la peor, qué
 * documento hace de origen, qué tareas automáticas hay abiertas, qué va en cada
 * mes del calendario. Funciones puras, sin React ni Supabase: se prueban con
 * `vitest` (contratosVista.test.js).
 *
 * Reglas del funcional v1.3 que se aplican aquí:
 *   · Ninguna fecha «próxima» ni ninguna tarea automática se guarda: se derivan.
 *   · Un equipo de baja no genera obligaciones ni aparece como pendiente.
 *   · Lo desconocido se muestra como pendiente, nunca se inventa.
 *   · La vista de un equipo es siempre 'compras_fabrica'; la de una obligación,
 *     documento o tarea es la del equipo o contrato del que cuelga.
 */
import {
  calcularObligacion,
  calcularContrato,
  calcularHito,
  historialDesdeRealizadas,
  obligacionDesdeFila,
  contratoDesdeFila,
  hitoDesdeFila,
  parseFecha,
  finPeriodo,
  iso,
} from './contratosMotor.js';

// ── Catálogos ────────────────────────────────────────────────────────────────

export const VISTAS = {
  compras_fabrica: 'Equipos y mantenimiento',
  administracion: 'Servicios y arrendamientos',
};

/** Vista que la app propone para un contrato nuevo según su categoría (funcional §1.1). */
const CATEGORIAS_FABRICA = ['Mantenimiento', 'Inspección', 'Residuos', 'Certificación', 'Calibración', 'Legalización'];
export const CATEGORIAS = [
  'Mantenimiento', 'Calibración', 'Inspección', 'Certificación', 'Legalización', 'Residuos',
  'Renting', 'Seguro', 'Licencia', 'Telecomunicaciones', 'Suministro', 'Seguridad',
  'Consultoría', 'Asociación', 'Servicio', 'Obra',
];
export function vistaPropuesta(categoria) {
  return CATEGORIAS_FABRICA.includes(categoria) ? 'compras_fabrica' : 'administracion';
}

export const ESTADOS_DOCUMENTALES = [
  'Vigente', 'Por confirmar', 'Vencido', 'Sin contrato', 'Histórico', 'Sustituido', 'Terminado', 'Puntual', 'Documentación', 'Otro',
];
/** Estados que se conservan pero no suman en los totales (US-006). */
export const ESTADOS_QUE_NO_SUMAN = ['Histórico', 'Sustituido', 'Terminado', 'Puntual'];

/** Periodicidad del importe → veces al año. `null` = no se normaliza (único, por pedido). */
export const PERIODICIDADES = [
  { valor: 'mes', etiqueta: 'Mensual', veces: 12 },
  { valor: 'trimestre', etiqueta: 'Trimestral', veces: 4 },
  { valor: 'semestre', etiqueta: 'Semestral', veces: 2 },
  { valor: 'anual', etiqueta: 'Anual', veces: 1 },
  { valor: 'único', etiqueta: 'Pago único', veces: null },
  { valor: 'por pedido', etiqueta: 'Por pedido / por visita', veces: null },
];

export const RENOVACIONES = ['tácita', 'expresa', 'no consta'];
export const TIPOS_OBLIGACION = ['Calibración', 'Revisión', 'Inspección', 'Certificación'];
export const ESTADOS_EQUIPO = ['activo', 'en reparación', 'cedido', 'baja'];
export const REGIMENES = ['propio', 'renting', 'alquiler'];
export const TIPOS_EQUIPO = [
  'Grupo de soldadura', 'Elevación', 'Contra incendios', 'Aire comprimido', 'Maquinaria',
  'Carretillas', 'Climatización', 'Herramienta en renting', 'Instalaciones',
];
export const NAVES = ['Gavilanes 21', 'Gavilanes 19', 'Águilas 7-13'];
export const TIPOS_TAREA = ['Falta documento', 'Discrepancia', 'Confirmar', 'Decidir', 'Otro'];
export const ESTADOS_TAREA = ['Abierta', 'En curso', 'Resuelta'];

/**
 * Tipos detallados de documento (los del inventario, que son los que trae la carga
 * inicial) con su rol por defecto y el bloque Tipo del nombre de fichero según la
 * tabla de correspondencia del encargo a Daniel (22/09/2026).
 */
export const TIPOS_DOCUMENTO = [
  { valor: 'contrato', etiqueta: 'Contrato', rol: 'origen', bloque: 'Contrato' },
  { valor: 'presupuesto', etiqueta: 'Oferta / presupuesto', rol: 'origen', bloque: 'Oferta' },
  { valor: 'renovacion', etiqueta: 'Renovación', rol: 'origen', bloque: 'Contrato' },
  { valor: 'anexo', etiqueta: 'Anexo', rol: 'origen', bloque: 'Contrato' },
  { valor: 'domiciliacion', etiqueta: 'Domiciliación', rol: 'origen', bloque: 'Contrato' },
  { valor: 'poliza', etiqueta: 'Póliza', rol: 'origen', bloque: 'Poliza' },
  { valor: 'pedido', etiqueta: 'Pedido', rol: 'origen', bloque: 'Otro' },
  { valor: 'factura', etiqueta: 'Factura (cuando no hay contrato)', rol: 'origen', bloque: 'Factura' },
  { valor: 'parte_visita', etiqueta: 'Parte de visita', rol: 'cierre', bloque: 'Parte' },
  { valor: 'informe_revision', etiqueta: 'Informe de revisión', rol: 'cierre', bloque: 'Informe' },
  { valor: 'certificado', etiqueta: 'Certificado', rol: 'cierre', bloque: 'Certificado' },
  { valor: 'manual', etiqueta: 'Manual', rol: 'otro', bloque: 'Manual' },
  { valor: 'legalizacion', etiqueta: 'Legalización', rol: 'otro', bloque: 'Otro' },
  { valor: 'otro', etiqueta: 'Otro', rol: 'otro', bloque: 'Otro' },
];
const TIPO_DOC = Object.fromEntries(TIPOS_DOCUMENTO.map((t) => [t.valor, t]));
export const etiquetaTipoDocumento = (valor) => TIPO_DOC[valor]?.etiqueta || String(valor || '').replace(/_/g, ' ');

// ── Importes ─────────────────────────────────────────────────────────────────

/** Importe anual normalizado a 12 meses. `null` si la periodicidad no se puede normalizar. */
export function importeAnualDe(importe, periodicidad) {
  if (importe == null || importe === '' || isNaN(Number(importe))) return null;
  const p = PERIODICIDADES.find((x) => x.valor === periodicidad);
  if (!p || p.veces == null) return null;
  return Math.round(Number(importe) * p.veces * 100) / 100;
}

/** ¿Suma en los totales de gasto? Solo los contratos vivos con un estado que no sea histórico. */
export function sumaEnTotales(c) {
  return c.vivo !== false && !ESTADOS_QUE_NO_SUMAN.includes(c.estado_documental);
}

/**
 * Discrepancia entre lo declarado por compras y el contrato (US-006). Compras puede
 * haber declarado la cuota o el total anual: solo hay discrepancia si no coincide con ninguno.
 */
export function hayDiscrepancia(c) {
  if (c.importe_declarado == null) return false;
  const d = Number(c.importe_declarado);
  const candidatos = [c.importe_anual, c.importe].filter((x) => x != null).map(Number);
  if (!candidatos.length) return false;
  return candidatos.every((x) => Math.abs(x - d) > 0.01);
}

// ── Nombres de fichero (convención del 22/09/2026) ───────────────────────────

/** Texto → bloque del nombre: sin acentos, sin ñ, sin espacios ni signos; palabras con «-». */
export function slugBloque(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const FORMAS_JURIDICAS = /\b(s\.?\s?l\.?\s?u\.?|s\.?\s?l\.?|s\.?\s?a\.?\s?u\.?|s\.?\s?a\.?|s\.?\s?coop\.?|c\.?\s?b\.?)(?=\s|$|,)/gi;

/**
 * Nombre corto de proveedor propuesto cuando aún no hay uno fijado: la primera
 * palabra significativa, sin forma jurídica. La persona puede corregirlo antes de subir.
 */
export function proveedorCortoPropuesto(nombre) {
  const limpio = String(nombre || '').replace(FORMAS_JURIDICAS, ' ').split(/[/(,]/)[0].trim();
  const primera = limpio.split(/\s+/).find((w) => slugBloque(w).length > 1) || limpio;
  return slugBloque(primera);
}

/** Fecha + precisión → bloque fecha: 'AAAA-MM-DD', 'AAAA-MM-00', 'AAAA-00-00' o '0000-00-00'. */
export function bloqueFecha(fecha, precision) {
  if (!fecha) return '0000-00-00';
  const s = String(fecha).slice(0, 10);
  if (precision === 'año') return `${s.slice(0, 4)}-00-00`;
  if (precision === 'mes') return `${s.slice(0, 7)}-00`;
  return s;
}

/**
 * `AAAA-MM-DD_Proveedor_Tipo_Objeto[_Ref].pdf` (US-009). El objeto se recorta a
 * cinco palabras, como pide la convención.
 */
export function componerNombreFichero({ fecha, precision, proveedorCorto, tipo, objeto, referencia }) {
  const bloques = [
    bloqueFecha(fecha, precision),
    slugBloque(proveedorCorto) || 'Proveedor',
    TIPO_DOC[tipo]?.bloque || 'Otro',
    slugBloque(objeto).split('-').filter(Boolean).slice(0, 5).join('-') || 'Documento',
  ];
  const ref = slugBloque(referencia);
  if (ref) bloques.push(ref);
  return bloques.join('_') + '.pdf';
}

// ── Modelo: las tablas cruzadas ──────────────────────────────────────────────

const ORDEN_ESTADO_OBLIGACION = { fuera: 0, sinfecha: 1, proxima: 2, ok: 3 };

function agrupar(filas, clave) {
  const m = new Map();
  for (const f of filas || []) {
    const k = f[clave];
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(f);
  }
  return m;
}

/**
 * Cruza las filas de las tablas `ctr_*` (ya filtradas por RLS) y calcula todo lo derivado.
 *
 * @param {object} datos  { contratos, grupos, equipos, contratoEquipo, obligaciones, realizadas,
 *                          realizadaUnidades, hitos, documentos, documentoContrato, tareas, tareasNotas }
 * @param {Date}   hoy    a las 00:00 en hora local
 */
export function construirModelo(datos, hoy) {
  const d = {
    contratos: [], grupos: [], equipos: [], contratoEquipo: [], obligaciones: [], realizadas: [],
    realizadaUnidades: [], hitos: [], documentos: [], documentoContrato: [], tareas: [], tareasNotas: [],
    ...datos,
  };

  const contratoEquipoPorContrato = agrupar(d.contratoEquipo, 'contrato_id');
  const contratoEquipoPorEquipo = agrupar(d.contratoEquipo, 'equipo_id');
  const docContratoPorDoc = agrupar(d.documentoContrato, 'documento_id');
  const docContratoPorContrato = agrupar(d.documentoContrato, 'contrato_id');
  const realizadasPorOb = agrupar(d.realizadas, 'obligacion_id');
  const unidadesPorRealizada = agrupar(d.realizadaUnidades, 'realizada_id');
  const equiposPorGrupo = agrupar(d.equipos, 'grupo_id');
  const hitosPorContrato = agrupar(d.hitos, 'contrato_id');

  // Documentos
  const documentos = d.documentos.map((doc) => ({
    ...doc,
    contratosIds: (docContratoPorDoc.get(doc.id) || []).map((x) => x.contrato_id),
  }));
  const documentoPorId = new Map(documentos.map((x) => [x.id, x]));
  const docsPorObligacion = agrupar(documentos, 'obligacion_id');
  const docsPorEquipo = agrupar(documentos, 'equipo_id');
  const docsDeContrato = (id) => (docContratoPorContrato.get(id) || []).map((x) => documentoPorId.get(x.documento_id)).filter(Boolean);

  // Contratos
  const contratos = d.contratos.map((c) => {
    const docs = docsDeContrato(c.id);
    return {
      ...c,
      calc: calcularContrato(contratoDesdeFila(c), hoy),
      equiposIds: (contratoEquipoPorContrato.get(c.id) || []).map((x) => x.equipo_id),
      docs,
      origenOk: docs.some((x) => x.rol === 'origen'),
      hitos: (hitosPorContrato.get(c.id) || []).map((h) => ({ ...h, calc: calcularHito(hitoDesdeFila(h), hoy) })),
    };
  });
  const contratoPorId = new Map(contratos.map((c) => [c.id, c]));

  // Grupos y equipos (sin obligaciones todavía)
  const grupoPorId = new Map(d.grupos.map((g) => [g.id, { ...g, unidades: equiposPorGrupo.get(g.id) || [] }]));
  const equipoPorId = new Map(d.equipos.map((e) => [e.id, e]));

  // Obligaciones
  const obligaciones = d.obligaciones.map((o) => {
    const todas = (realizadasPorOb.get(o.id) || [])
      .map((r) => ({
        ...r,
        documento: r.documento_id ? documentoPorId.get(r.documento_id) || null : null,
        unidades: unidadesPorRealizada.get(r.id) || [],
      }))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id));
    const vigentes = todas.filter((r) => !r.anulada);
    const historial = historialDesdeRealizadas(
      vigentes.map((r) => ({ ...r, documento_nombre: r.documento?.nombre_original || (r.documento_id ? `documento ${r.documento_id}` : null) })),
    );

    const docs = docsPorObligacion.get(o.id) || [];
    // Documento de cierre de la fecha de partida: el propio de la obligación o, si no lo
    // tiene, uno de cierre del contrato que la cubre con fecha igual o posterior (la carga
    // inicial toma la última realizada del parte o informe más reciente del contrato).
    const primera = String(o.primera_fecha || '').slice(0, 10);
    const docCierre =
      docs.find((x) => x.rol === 'cierre') ||
      (primera && o.contrato_id
        ? contratoPorId.get(o.contrato_id)?.docs.find((x) => x.rol === 'cierre' && x.fecha && String(x.fecha).slice(0, 10) >= primera)
        : null);
    const cierreInventario = docCierre
      ? { ok: true, texto: 'Documento de cierre: ' + docCierre.nombre_original }
      : { ok: false, texto: o.primera_fecha ? 'Falta el documento que prueba la última realizada' : 'Sin realizada registrada' };
    const calc = calcularObligacion(obligacionDesdeFila(o, cierreInventario), historial, hoy);

    // Documento de origen (D4): pedido PCP anotado, documento de origen propio o el del contrato
    const contrato = o.contrato_id ? contratoPorId.get(o.contrato_id) : null;
    const docOrigen = docs.find((x) => x.rol === 'origen');
    let origen;
    if (docOrigen) origen = { ok: true, texto: `${etiquetaTipoDocumento(docOrigen.tipo)}: ${docOrigen.nombre_original}` };
    else if (contrato?.origenOk) origen = { ok: true, texto: `Contrato ${contrato.codigo || ''} ${contrato.proveedor_nombre}`.replace(/\s+/g, ' ') };
    else if (o.pedido_pcp) origen = { ok: true, texto: `Pedido PCP ${o.pedido_pcp}` };
    else if (contrato) origen = { ok: false, texto: `El contrato ${contrato.codigo || contrato.proveedor_nombre} no tiene el documento subido` };
    else origen = { ok: false, texto: 'Sin contrato, pedido PCP ni factura de origen' };

    // De qué cuelga
    const equipo = o.equipo_id ? equipoPorId.get(o.equipo_id) : null;
    const grupo = o.grupo_id ? grupoPorId.get(o.grupo_id) : null;
    let sujeto;
    if (equipo) sujeto = { tipo: 'equipo', id: equipo.id, nombre: equipo.nombre };
    else if (grupo) sujeto = { tipo: 'grupo', id: grupo.id, nombre: grupo.nombre };
    else if (contrato) sujeto = { tipo: 'contrato', id: contrato.id, nombre: `${contrato.proveedor_nombre} · ${contrato.objeto}` };
    else sujeto = { tipo: 'contrato', id: o.contrato_id, nombre: 'Contrato no visible' };

    // Viva: activa y con su sujeto en servicio (un equipo de baja no genera obligaciones)
    let viva = o.activa !== false;
    if (equipo) viva = viva && equipo.estado !== 'baja';
    else if (grupo) viva = viva && (grupo.unidades.length === 0 || grupo.unidades.some((u) => u.estado !== 'baja'));
    else if (contrato) viva = viva && contrato.vivo !== false;

    // Resultado no apto de la última realizada (US-003): el equipo o las unidades quedan señalados
    const ultima = vigentes[0] || null;
    let noAptoEquipo = false;
    let noAptoUnidades = [];
    if (ultima) {
      if (grupo) {
        noAptoUnidades = ultima.unidades
          .filter((u) => u.resultado === 'no apto' && equipoPorId.get(u.equipo_id)?.estado !== 'baja')
          .map((u) => u.equipo_id);
      } else if (ultima.resultado === 'no apto') {
        noAptoEquipo = true;
      }
    }

    return {
      ...o,
      calc,
      realizadas: todas,
      ultimaRealizada: ultima,
      origen,
      sujeto,
      vista: equipo || grupo ? 'compras_fabrica' : contrato?.vista || 'compras_fabrica',
      viva,
      noAptoEquipo,
      noAptoUnidades,
      docs,
    };
  });
  const obligacionPorId = new Map(obligaciones.map((o) => [o.id, o]));
  const obsPorEquipo = agrupar(obligaciones, 'equipo_id');
  const obsPorGrupo = agrupar(obligaciones, 'grupo_id');
  const obsPorContrato = agrupar(obligaciones, 'contrato_id');

  const peor = (lista) =>
    [...lista].sort(
      (x, y) =>
        ORDEN_ESTADO_OBLIGACION[x.calc.estado] - ORDEN_ESTADO_OBLIGACION[y.calc.estado] ||
        (x.calc.proxima ? x.calc.proxima.d : 0) - (y.calc.proxima ? y.calc.proxima.d : 0),
    )[0] || null;

  const grupos = [...grupoPorId.values()].map((g) => {
    const obs = obsPorGrupo.get(g.id) || [];
    return { ...g, obligaciones: obs, principal: peor(obs.filter((o) => o.viva)) };
  });
  const grupoFinal = new Map(grupos.map((g) => [g.id, g]));

  const equipos = d.equipos.map((e) => {
    const propias = obsPorEquipo.get(e.id) || [];
    const delGrupo = e.grupo_id ? obsPorGrupo.get(e.grupo_id) || [] : [];
    const todas = [...propias, ...delGrupo];
    const vivas = e.estado === 'baja' ? [] : todas.filter((o) => o.viva);
    const noApto =
      e.estado !== 'baja' &&
      (propias.some((o) => o.viva && o.noAptoEquipo) || delGrupo.some((o) => o.viva && o.noAptoUnidades.includes(e.id)));
    return {
      ...e,
      grupo: e.grupo_id ? grupoFinal.get(e.grupo_id) || null : null,
      contratosIds: (contratoEquipoPorEquipo.get(e.id) || []).map((x) => x.contrato_id),
      obligaciones: todas,
      principal: peor(vivas),
      noApto,
      docs: docsPorEquipo.get(e.id) || [],
    };
  });

  const contratosFinal = contratos.map((c) => ({ ...c, obligacionesPropias: (obsPorContrato.get(c.id) || []).filter((o) => !o.equipo_id && !o.grupo_id) }));

  const notas = new Map((d.tareasNotas || []).map((n) => [n.clave, n]));

  const modelo = {
    hoy,
    contratos: contratosFinal,
    contrato: (id) => contratosFinal.find((c) => c.id === id) || null,
    equipos,
    equipo: (id) => equipos.find((e) => e.id === id) || null,
    grupos,
    grupo: (id) => grupoFinal.get(id) || null,
    obligaciones,
    obligacion: (id) => obligacionPorId.get(id) || null,
    documentos,
    documento: (id) => documentoPorId.get(id) || null,
    tareas: d.tareas,
    notas,
  };
  modelo.tareasAutomaticas = derivarTareasAutomaticas(modelo);
  return modelo;
}

// ── Tareas automáticas (US-010): se derivan, no se guardan ───────────────────

/**
 * Cada tarea lleva una `clave` estable (tipo:entidad:id) con la que se guardan en
 * `ctr_tareas_notas` el responsable, la nota y el «posponer hasta» que añada una persona.
 * Desaparecen solas cuando se resuelve la causa.
 */
export function derivarTareasAutomaticas(m) {
  const out = [];
  const push = (clave, tipo, texto, sujeto, vista) => {
    const nota = m.notas.get(clave) || null;
    const pospuesta = !!(nota?.pospuesta_hasta && parseFecha(String(nota.pospuesta_hasta).slice(0, 10))?.d > m.hoy);
    out.push({ clave, tipo, texto, sujeto, vista, nota, pospuesta });
  };
  const fmt = (f) => (f ? textoFecha(f) : '');

  for (const o of m.obligaciones) {
    if (!o.viva) continue;
    const s = o.sujeto;
    if (!o.origen.ok) push(`origen:obligacion:${o.id}`, 'Falta documento de origen', `${o.etiqueta}: ${o.origen.texto}`, s, o.vista);
    const huboRealizada = o.realizadas.some((r) => !r.anulada) || !!o.primera_fecha;
    if (huboRealizada && !o.calc.cierreOk) push(`cierre:obligacion:${o.id}`, 'Falta documento de cierre', `${o.etiqueta}: ${o.calc.cierreTexto}`, s, o.vista);
    if (o.calc.estado === 'sinfecha') push(`fecha:obligacion:${o.id}`, 'Fijar primera fecha', `${o.etiqueta}: no hay última realizada ni fecha prevista`, s, o.vista);
    if (o.calc.estado === 'fuera') push(`plazo:obligacion:${o.id}`, 'Fuera de plazo', `${o.etiqueta}: tocaba en ${fmt(o.calc.proxima)}`, s, o.vista);
    if (o.noAptoEquipo || o.noAptoUnidades.length) {
      const n = o.noAptoUnidades.length;
      push(`noapto:obligacion:${o.id}`, 'Resultado no apto', n ? `${o.etiqueta}: ${n} unidad${n > 1 ? 'es' : ''} no apta${n > 1 ? 's' : ''}` : `${o.etiqueta}: última realizada no apta`, s, o.vista);
    }
  }

  for (const e of m.equipos) {
    if (e.estado === 'baja') continue;
    const s = { tipo: 'equipo', id: e.id, nombre: e.nombre };
    // Las unidades de un grupo (eslingas, extintores) no llevan código propio: no se pide uno por unidad
    if (e.regimen === 'propio' && !e.activo_fijo_bc && !e.grupo_id) push(`activobc:equipo:${e.id}`, 'Falta código de activo fijo BC', 'Equipo propio sin código de activo fijo en Business Central', s, 'compras_fabrica');
    if (!e.sin_plan && e.obligaciones.filter((o) => o.viva).length === 0 && !e.grupo_id)
      push(`plan:equipo:${e.id}`, 'Sin obligaciones definidas', 'Definir qué hay que hacerle y cada cuánto, o marcarlo «sin plan»', s, 'compras_fabrica');
  }

  for (const c of m.contratos) {
    if (c.calc.estado === 'historico' || !sumaEnTotales(c)) continue;
    const s = { tipo: 'contrato', id: c.id, nombre: `${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}` };
    if (c.calc.estado === 'vencido') push(`vencido:contrato:${c.id}`, 'Vencido sin cerrar', `Venció en ${fmt(c.calc.vence)} sin decisión registrada`, s, c.vista);
    if (c.calc.estado === 'sinvenc') push(`vencimiento:contrato:${c.id}`, 'Sin vencimiento conocido', 'Falta la fecha fin (o el inicio de una prórroga tácita anual)', s, c.vista);
    if (c.preaviso_dias == null && c.renovacion !== 'expresa' && c.estado_documental !== 'Sin contrato')
      push(`preaviso:contrato:${c.id}`, 'Confirmar preaviso', 'No consta el preaviso: se avisa a 90 días del vencimiento', s, c.vista);
    if (!c.origenOk) push(`origen:contrato:${c.id}`, 'Falta documento de origen', c.estado_documental === 'Sin contrato' ? 'Sin contrato: subir la factura que hace de documento de origen' : 'No hay contrato, oferta ni póliza subidos', s, c.vista);
    if (!c.proveedor_codigo) push(`proveedorbc:contrato:${c.id}`, 'Proveedor sin nº BC', `${c.proveedor_nombre}: falta el nº de proveedor de Business Central`, s, c.vista);
  }

  for (const doc of m.documentos) {
    if (doc.fecha) continue;
    const c = doc.contratosIds.map((id) => m.contrato(id)).find(Boolean);
    const e = doc.equipo_id ? m.equipo(doc.equipo_id) : null;
    const o = doc.obligacion_id ? m.obligacion(doc.obligacion_id) : null;
    const vista = e || (o && o.vista === 'compras_fabrica') ? 'compras_fabrica' : c?.vista || o?.vista || 'compras_fabrica';
    const s = e ? { tipo: 'equipo', id: e.id, nombre: e.nombre } : c ? { tipo: 'contrato', id: c.id, nombre: c.proveedor_nombre } : o ? o.sujeto : { tipo: 'documento', id: doc.id, nombre: doc.nombre_original };
    push(`fechadoc:documento:${doc.id}`, 'Documento sin fecha', `${doc.nombre_original}: indicar la fecha del documento`, s, vista);
  }
  return out;
}

// ── Calendario generado (US-008) ─────────────────────────────────────────────

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dd = (n) => String(n).padStart(2, '0');
const claveMes = (d) => `${d.getFullYear()}-${dd(d.getMonth() + 1)}`;

/** { d, p } del motor → «14/03/2027», «abril de 2027» o «2027». */
export function textoFecha(f) {
  if (!f) return '';
  if (f.p === 'dia') return `${dd(f.d.getDate())}/${dd(f.d.getMonth() + 1)}/${f.d.getFullYear()}`;
  if (f.p === 'mes') return `${MESES[f.d.getMonth()]} de ${f.d.getFullYear()}`;
  return String(f.d.getFullYear());
}
export const textoDia = (d) => (d ? textoFecha({ d, p: 'dia' }) : '');
export const nombreMes = (d) => `${MESES[d.getMonth()]} ${d.getFullYear()}`;

/**
 * Eventos de una vista para los próximos 13 meses, más lo atrasado y lo que no
 * tiene fecha. Nadie introduce datos en el calendario: todo sale de contratos,
 * obligaciones e hitos.
 */
export function calendario(m, vista) {
  const hoy = m.hoy;
  const eventos = [];
  const sinFecha = [];

  for (const c of m.contratos) {
    if (c.vista !== vista || c.calc.estado === 'historico' || !c.calc.vence) continue;
    const base = {
      enlace: { tipo: 'contrato', id: c.id },
      sec: `${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}`,
      importe: c.importe_anual,
    };
    eventos.push({ ...base, clave: `v${c.id}`, fecha: c.calc.vence, titulo: `${c.calc.como}: ${c.objeto}`, tipo: 'Vencimiento', atrasado: c.calc.estado === 'vencido' });
    if (c.calc.avisar && c.calc.estado !== 'vencido' && c.calc.avisar >= hoy)
      eventos.push({ ...base, clave: `a${c.id}`, fecha: { d: c.calc.avisar, p: 'dia' }, titulo: `Fecha límite de aviso (${c.preaviso_dias} días): ${c.objeto}`, tipo: 'Preaviso', aviso: true, atrasado: false });
    for (const h of c.hitos) {
      if (h.calc.estado === 'cerrado' || !h.calc.fecha) continue;
      eventos.push({ ...base, clave: `h${h.id}`, fecha: h.calc.fecha, titulo: `${h.tipo}: ${h.descripcion}`, tipo: 'Hito', atrasado: h.calc.estado === 'vencido', importe: h.importe });
    }
  }

  for (const o of m.obligaciones) {
    if (!o.viva || o.vista !== vista) continue;
    const eq = o.sujeto.tipo === 'equipo' ? m.equipo(o.sujeto.id) : null;
    const item = {
      clave: `o${o.id}`,
      fecha: o.calc.proxima,
      titulo: `${o.tipo}: ${o.sujeto.nombre}`,
      sec: [o.proveedor_nombre, eq?.asignado_a || eq?.nave].filter(Boolean).join(' · '),
      enlace: { tipo: o.sujeto.tipo, id: o.sujeto.id },
      tipo: o.tipo,
      atrasado: o.calc.estado === 'fuera',
      agrupar: eq?.tipo === 'Grupo de soldadura' ? 'Calibración de grupos de soldadura' : null,
      obligacionId: o.id,
    };
    (o.calc.proxima ? eventos : sinFecha).push(item);
  }

  const porFecha = (a, b) => a.fecha.d - b.fecha.d;
  const atrasados = eventos.filter((e) => e.atrasado).sort(porFecha);
  const meses = [];
  for (let i = 0; i < 13; i++) {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    meses.push({ inicio, eventos: eventos.filter((e) => !e.atrasado && claveMes(e.fecha.d) === claveMes(inicio)).sort(porFecha) });
  }
  // Lo que cae antes del mes actual sin estar atrasado (p. ej. un «abril» ya pasado dentro de su margen) va con el mes actual
  const primerMes = meses[0].inicio;
  const anteriores = eventos.filter((e) => !e.atrasado && e.fecha.d < primerMes);
  meses[0].eventos = [...anteriores, ...meses[0].eventos].sort(porFecha);
  return { atrasados, meses, sinFecha };
}

// ── Proveedores (US-011) ─────────────────────────────────────────────────────

const normalizarNombre = (s) => slugBloque(s).toLowerCase();

/**
 * Nº de proveedor en el formato de Business Central: 6 dígitos con ceros a la
 * izquierda ('1438' → '001438'), que es como viene en el maestro `proveedores` y
 * en el diario (cod_procedencia). Lo que no son solo dígitos se deja tal cual.
 */
export function codigoProveedorBC(codigo) {
  const s = String(codigo ?? '').trim();
  if (!s) return null;
  return /^\d{1,6}$/.test(s) ? s.padStart(6, '0') : s;
}

/**
 * Agrupa los contratos visibles por nº de proveedor BC (o por nombre si no lo tienen).
 * `maestro` es el mapa { codigo: nombre } de la tabla `proveedores` del Dashboard.
 */
export function resumenProveedores(contratos, maestro = {}) {
  const grupos = new Map();
  for (const c of contratos) {
    const cod = codigoProveedorBC(c.proveedor_codigo);
    const clave = cod ? `bc:${cod}` : `n:${normalizarNombre(c.proveedor_nombre)}`;
    if (!grupos.has(clave)) {
      const nombreBC = cod ? maestro[cod] : null;
      grupos.set(clave, {
        clave,
        nombre: (typeof nombreBC === 'string' ? nombreBC : nombreBC?.nombre) || c.proveedor_nombre,
        codigo: cod,
        enMaestro: !!(cod && maestro[cod]),
        contratos: [],
        vistas: new Set(),
        importeAnual: 0,
        conImporte: false,
      });
    }
    const g = grupos.get(clave);
    g.contratos.push(c);
    g.vistas.add(c.vista);
    if (sumaEnTotales(c) && c.importe_anual != null) {
      g.importeAnual += Number(c.importe_anual);
      g.conImporte = true;
    }
  }
  return [...grupos.values()]
    .map((g) => ({ ...g, vistas: [...g.vistas], importeAnual: Math.round(g.importeAnual * 100) / 100 }))
    .sort((a, b) => b.importeAnual - a.importeAnual || a.nombre.localeCompare(b.nombre, 'es'));
}

// ── Filas de la lista de equipos y del panel (US-001) ────────────────────────

/**
 * Una fila por equipo suelto y una por grupo (los 43 eslingas son una fila con
 * sus unidades dentro): así cada cifra del panel es exactamente la lista que abre.
 *
 * situacion: 'fuera' | 'sinfecha' | 'proxima' | 'ok' | 'sinplan' | 'sinobligaciones' | 'baja'
 */
export function filasEquipos(m) {
  const hubo = (o) => o.realizadas.some((r) => !r.anulada) || !!o.primera_fecha;
  const situacion = (principal, sinPlan, baja) =>
    baja ? 'baja' : principal ? principal.calc.estado : sinPlan ? 'sinplan' : 'sinobligaciones';

  const sueltos = m.equipos
    .filter((e) => !e.grupo_id || !m.grupo(e.grupo_id))
    .map((e) => {
      const vivas = e.estado === 'baja' ? [] : e.obligaciones.filter((o) => o.viva);
      return {
        clave: `e${e.id}`,
        tipo: 'equipo',
        id: e.id,
        nombre: e.nombre,
        tipoEquipo: e.tipo,
        nave: e.nave,
        asignado: e.asignado_a,
        estado: e.estado,
        regimen: e.regimen,
        detalle: [e.modelo, e.num_serie && `serie ${e.num_serie}`].filter(Boolean).join(' · ') || e.identificacion || '',
        activoFijo: e.activo_fijo_bc,
        principal: e.principal,
        situacion: situacion(e.principal, e.sin_plan, e.estado === 'baja'),
        noApto: e.noApto,
        noAptas: e.noApto ? 1 : 0,
        sinCierre: vivas.some((o) => hubo(o) && !o.calc.cierreOk),
        sinOrigen: vivas.some((o) => !o.origen.ok),
        unidades: 1,
        texto: [e.nombre, e.modelo, e.num_serie, e.asignado_a, e.activo_fijo_bc, e.identificacion, e.num_interno].join(' ').toLowerCase(),
      };
    });

  const grupos = m.grupos.map((g) => {
    const enServicio = g.unidades.filter((u) => u.estado !== 'baja');
    const baja = g.unidades.length > 0 && enServicio.length === 0;
    const vivas = g.obligaciones.filter((o) => o.viva);
    const noAptas = new Set(vivas.flatMap((o) => o.noAptoUnidades)).size;
    return {
      clave: `g${g.id}`,
      tipo: 'grupo',
      id: g.id,
      nombre: g.nombre,
      tipoEquipo: g.tipo,
      nave: g.nave,
      asignado: null,
      estado: baja ? 'baja' : 'activo',
      regimen: null,
      detalle: `${enServicio.length} unidades en servicio`,
      activoFijo: null,
      principal: g.principal,
      situacion: situacion(g.principal, false, baja),
      noApto: noAptas > 0,
      noAptas,
      sinCierre: vivas.some((o) => hubo(o) && !o.calc.cierreOk),
      sinOrigen: vivas.some((o) => !o.origen.ok),
      unidades: enServicio.length,
      texto: [g.nombre, g.tipo, ...g.unidades.map((u) => [u.nombre, u.identificacion, u.num_serie].join(' '))].join(' ').toLowerCase(),
    };
  });

  return [...sueltos, ...grupos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
}

// ── Lector asistido: de la propuesta a la ficha (US-014) ─────────────────────

const PALABRAS_TIPO_EQUIPO = [
  ['puente grúa', 'Elevación'], ['puente grua', 'Elevación'], ['polipasto', 'Elevación'], ['eslinga', 'Elevación'],
  ['grúa', 'Elevación'], ['extintor', 'Contra incendios'], ['bie', 'Contra incendios'], ['detección', 'Contra incendios'],
  ['compresor', 'Aire comprimido'], ['secador', 'Aire comprimido'], ['plegadora', 'Maquinaria'], ['láser', 'Maquinaria'],
  ['laser', 'Maquinaria'], ['carretilla', 'Carretillas'], ['split', 'Climatización'], ['climatiz', 'Climatización'],
  ['aire acondicionado', 'Climatización'], ['generador', 'Climatización'], ['soldadura', 'Grupo de soldadura'],
  ['radial', 'Herramienta en renting'], ['amoladora', 'Herramienta en renting'], ['extracción', 'Instalaciones'],
  ['puerta', 'Instalaciones'], ['estanter', 'Instalaciones'], ['tanque', 'Instalaciones'],
];

/** Tipo de equipo propuesto a partir de su descripción; «Instalaciones» si no encaja ninguno. */
export function tipoEquipoPropuesto(descripcion) {
  const t = String(descripcion || '').toLowerCase();
  return PALABRAS_TIPO_EQUIPO.find(([k]) => t.includes(k))?.[1] || 'Instalaciones';
}

/** Régimen de un equipo nuevo según la categoría del contrato que lo cubre (flujo 3). */
export function regimenPorCategoria(categoria, objeto = '') {
  const t = `${categoria || ''} ${objeto || ''}`.toLowerCase();
  if (t.includes('alquiler')) return 'alquiler';
  if (t.includes('renting') || t.includes('arrendamiento')) return 'renting';
  return 'propio';
}

/** Categorías cuyos contratos llevan una revisión periódica de los equipos que cubren. */
export const CATEGORIAS_CON_REVISION = ['Mantenimiento', 'Calibración', 'Inspección', 'Certificación'];

/**
 * Nº BC del proveedor por su nombre en el maestro: coincidencia de la primera
 * palabra significativa. Solo si hay exactamente un candidato (si no, se deja
 * vacío: la persona lo elige).
 */
export function proveedorDelMaestro(nombre, maestro = {}) {
  const clave = proveedorCortoPropuesto(nombre).toLowerCase();
  if (clave.length < 3) return null;
  const candidatos = Object.entries(maestro).filter(([, v]) => {
    const n = typeof v === 'string' ? v : v?.nombre;
    return proveedorCortoPropuesto(n).toLowerCase() === clave;
  });
  return candidatos.length === 1 ? codigoProveedorBC(candidatos[0][0]) : null;
}

/**
 * Propuesta del lector (contrato/oferta o factura sin contrato) → valores iniciales
 * del formulario de contrato y marca de cada campo: 'propuesto' o 'dudoso'.
 * Nada de esto se guarda hasta que la persona pulsa Guardar.
 */
export function fichaDesdePropuesta(propuesta, maestro = {}) {
  const c = propuesta?.campos || {};
  const val = (k) => c[k]?.valor ?? null;
  const valores = {};
  const marcas = {};
  const poner = (campo, origen, valor, precision) => {
    if (valor == null || valor === '') return;
    valores[campo] = valor;
    if (precision) valores[`${campo}_precision`] = precision;
    marcas[campo] = c[origen]?.dudoso ? 'dudoso' : 'propuesto';
  };

  if (propuesta?.tipo === 'factura') {
    poner('proveedor_nombre', 'proveedor_nombre', val('proveedor_nombre'));
    poner('objeto', 'concepto', val('concepto'));
    poner('referencia', 'numero_factura', val('numero_factura'));
    poner('importe', 'importe_sin_iva', val('importe_sin_iva'));
    poner('inicio', 'periodo_inicio', val('periodo_inicio'), c.periodo_inicio?.precision);
    poner('fin', 'periodo_fin', val('periodo_fin'), c.periodo_fin?.precision);
    valores.estado_documental = 'Sin contrato';
    valores.periodicidad = 'único';
    valores.renovacion = 'no consta';
    marcas.estado_documental = 'propuesto';
  } else {
    for (const k of ['proveedor_nombre', 'referencia', 'objeto', 'categoria', 'importe', 'periodicidad', 'renovacion', 'preaviso_dias', 'nave']) {
      poner(k, k, val(k));
    }
    poner('inicio', 'inicio', val('inicio'), c.inicio?.precision);
    poner('fin', 'fin', val('fin'), c.fin?.precision);
  }
  const cod = proveedorDelMaestro(valores.proveedor_nombre, maestro);
  if (cod) {
    valores.proveedor_codigo = cod;
    marcas.proveedor_codigo = 'propuesto';
  }
  if (valores.proveedor_nombre) valores.proveedor_corto = proveedorCortoPropuesto(valores.proveedor_nombre);
  if (val('observaciones')) valores.observaciones = `Leído del PDF: ${val('observaciones')}`;
  // Fecha del propio documento (firma o emisión): la del nombre del fichero definitivo
  const fdoc = propuesta?.tipo === 'factura' ? c.fecha : c.fecha_documento;
  const documento = fdoc?.valor ? { fecha: fdoc.valor, precision: fdoc.precision || 'dia' } : { fecha: null, precision: null };
  return { valores, marcas, avisos: propuesta?.avisos || [], documento };
}

/** Equipos que menciona un contrato → equipos nuevos propuestos para el formulario. */
export function equiposDesdePropuesta(propuesta, categoria, objeto) {
  const regimen = regimenPorCategoria(categoria, objeto);
  return (propuesta?.equipos || []).map((e) => ({
    nombre: String(e.descripcion || '').trim().slice(0, 120),
    tipo: tipoEquipoPropuesto(e.descripcion),
    unidades: Number.isInteger(e.unidades) && e.unidades > 0 ? Math.min(e.unidades, 500) : 1,
    num_serie: e.num_serie || '',
    modelo: e.modelo || '',
    regimen,
  })).filter((e) => e.nombre);
}

const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'en', 'para', 'con', 'por', 'nave', 'g19', 'g21']);
const palabras = (s) => slugBloque(s).toLowerCase().split('-').filter((w) => w.length > 2 && !PALABRAS_VACIAS.has(w) && !/^\d+$/.test(w));

/**
 * ¿Ya existe el equipo que menciona el contrato? Antes de proponer crearlo se busca
 * entre los grupos y los equipos sueltos (sin baja): por nº de serie, o por mismo
 * tipo y nombre parecido («Puente grúa» ↔ «Puente grúa GH»). Devuelve el candidato
 * solo si hay uno claro; si hay varios o ninguno, null (se propone crear y la
 * persona decide). Nunca se enlaza nada sin que lo vea.
 */
export function equipoExistente(propuesto, modelo) {
  const serie = String(propuesto.num_serie || '').toUpperCase().replace(/[\s\-_./\\]/g, '');
  const sueltos = modelo.equipos.filter((e) => !e.grupo_id && e.estado !== 'baja');
  if (serie.length >= 3) {
    const porSerie = sueltos.filter((e) => String(e.num_serie || '').toUpperCase().replace(/[\s\-_./\\]/g, '') === serie);
    if (porSerie.length === 1) return { tipo: 'equipo', id: porSerie[0].id, nombre: porSerie[0].nombre };
  }
  const clave = palabras(propuesto.nombre);
  if (!clave.length) return null;
  const parecido = (nombre, tipo) => tipo === propuesto.tipo && clave.every((w) => palabras(nombre).includes(w));
  const candidatos = [
    ...modelo.grupos.filter((g) => g.unidades.some((u) => u.estado !== 'baja') && parecido(g.nombre, g.tipo)).map((g) => ({ tipo: 'grupo', id: g.id, nombre: g.nombre })),
    ...sueltos.filter((e) => parecido(e.nombre, e.tipo)).map((e) => ({ tipo: 'equipo', id: e.id, nombre: e.nombre })),
  ];
  if (candidatos.length === 1) return candidatos[0];
  // Desempate: el grupo con exactamente las unidades que dice el contrato («4 puentes grúa»)
  const uds = Number(propuesto.unidades);
  const porUnidades = candidatos.filter((c) => c.tipo === 'grupo' && modelo.grupo(c.id)?.unidades.filter((u) => u.estado !== 'baja').length === uds);
  return uds > 1 && porUnidades.length === 1 ? porUnidades[0] : null;
}

/** Etiqueta de la revisión que se propone crear («Revisión anual», «Revisión cada 4 meses»). */
export function etiquetaRevision(meses, tipo = 'Revisión') {
  const n = Number(meses);
  const nombre = { 12: 'anual', 6: 'semestral', 3: 'trimestral', 1: 'mensual', 24: 'bienal' }[n];
  return nombre ? `${tipo} ${nombre}` : n ? `${tipo} cada ${n} meses` : tipo;
}

// ── Utilidades de pantalla ───────────────────────────────────────────────────

export const hoyLocal = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
export const hoyISO = () => iso(hoyLocal());

/** ¿Una fecha de realizada es válida? No se admiten fechas futuras (US-003). */
export function fechaRealizadaValida(fecha, hoy) {
  const f = parseFecha(fecha);
  return !!f && f.p === 'dia' && finPeriodo(f) <= hoy;
}

/** Siguiente código libre para un contrato nuevo: continúa la serie más alta de su prefijo. */
export function siguienteCodigo(contratos, prefijo = 'C') {
  const max = contratos
    .map((c) => new RegExp(`^${prefijo}(\\d+)$`).exec(c.codigo || ''))
    .filter(Boolean)
    .reduce((mx, r) => Math.max(mx, Number(r[1])), 0);
  return `${prefijo}${String(max + 1).padStart(2, '0')}`;
}
