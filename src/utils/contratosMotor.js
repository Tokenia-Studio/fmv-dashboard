/**
 * Motor de fechas del módulo de contratos y mantenimiento.
 *
 * Ninguna fecha «próxima» se guarda en la base de datos: todas se generan aquí a
 * partir de la periodicidad, la última realizada y el preaviso (funcional v1.2,
 * arquitectura D1). Es el mismo motor de la POC del 21/09/2026, que reproduce los
 * avisos de la hoja «Vencimientos 12 meses» del inventario, más los adaptadores
 * que convierten las filas de Supabase (`ctr_*`) al formato que espera el motor.
 *
 * Funciones puras, sin dependencias: se usan igual en el navegador, en los tests
 * (`vitest`) y, si la fase 2 envía avisos por correo, en la función de servidor.
 *
 * Convención de fechas: el motor trabaja con textos 'YYYY', 'YYYY-MM' o
 * 'YYYY-MM-DD'. La precisión se deduce de la longitud: un «2027-05» no vence
 * hasta el 31 de mayo. Las filas de Supabase llevan la fecha completa más una
 * columna `*_precision` ('dia' | 'mes' | 'año'); `aTexto()` hace la conversión.
 */

const DIA = 86400000;

/** Días de margen con los que una obligación pasa a «próxima». */
export const MARGEN_OBLIGACION_DIAS = 60;
/** Días de margen con los que un contrato pasa a «próximo» (si no tiene preaviso que mande antes). */
export const MARGEN_CONTRATO_DIAS = 90;

// ── Fechas ───────────────────────────────────────────────────────────────────

/** 'YYYY', 'YYYY-MM' o 'YYYY-MM-DD' → { d: Date, p: 'año' | 'mes' | 'dia' }; null si no es una fecha. */
export function parseFecha(s) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(s || '');
  if (!m) return null;
  return {
    d: new Date(+m[1], m[2] ? +m[2] - 1 : 0, m[3] ? +m[3] : 1),
    p: m[3] ? 'dia' : m[2] ? 'mes' : 'año',
  };
}

/** Fecha de Supabase ('YYYY-MM-DD') + precisión ('dia' | 'mes' | 'año') → texto que entiende el motor. */
export function aTexto(fecha, precision) {
  if (!fecha) return null;
  const s = String(fecha).slice(0, 10);
  if (precision === 'año') return s.slice(0, 4);
  if (precision === 'mes') return s.slice(0, 7);
  return s;
}

/** Último día que cubre una fecha según su precisión. */
export function finPeriodo(f) {
  if (f.p === 'dia') return f.d;
  if (f.p === 'mes') return new Date(f.d.getFullYear(), f.d.getMonth() + 1, 0);
  return new Date(f.d.getFullYear(), 11, 31);
}

/** Suma meses conservando el día cuando existe (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const ultimoDia = new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate();
  r.setDate(Math.min(d.getDate(), ultimoDia));
  return r;
}

export function sumarDias(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function diasEntre(a, b) {
  return Math.round((b - a) / DIA);
}

/** Date → 'YYYY-MM-DD' en hora local (sin el desfase de toISOString). */
export function iso(d) {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Obligaciones (calibración, revisión, inspección, certificación) ──────────

/**
 * Calcula la próxima fecha y el estado de una obligación.
 *
 * @param {object} o   { ultima, pistaProxima, mesHabitual, periodicidadMeses, cierre: { ok, texto } }
 *                     Fechas como texto ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD'). `ultima` es la fecha
 *                     base cuando aún no hay realizadas registradas en la app.
 * @param {Array}  historial  Realizadas registradas, ordenadas de más antigua a más reciente:
 *                     [{ fecha: 'YYYY-MM-DD', documento }]. `documento` es el documento de cierre
 *                     (nombre, id o cualquier valor con verdad); vacío = realizada sin cerrar.
 * @param {Date}   hoy
 * @returns {{ ultima, proxima, como, estado, cierreOk, cierreTexto, dias }}
 *   estado: 'sinfecha' | 'fuera' | 'proxima' | 'ok'
 */
export function calcularObligacion(o, historial, hoy) {
  const hist = historial || [];
  const ultimaReg = hist.length ? hist[hist.length - 1] : null;
  const ultima = parseFecha(ultimaReg ? ultimaReg.fecha : o.ultima);
  const pista = parseFecha(o.pistaProxima);
  let proxima = null;
  let como = null;

  if (pista && (!ultima || finPeriodo(pista) > ultima.d)) {
    proxima = pista;
    como = 'Fecha anunciada en la documentación';
  } else if (o.mesHabitual) {
    let y = (ultima ? ultima.d : hoy).getFullYear();
    let c = new Date(y, o.mesHabitual - 1, 1);
    if (ultima) {
      while (c <= sumarMeses(ultima.d, 2)) c = new Date(++y, o.mesHabitual - 1, 1);
    } else if (finPeriodo({ d: c, p: 'mes' }) < hoy) {
      c = new Date(y + 1, o.mesHabitual - 1, 1);
    }
    proxima = { d: c, p: 'mes' };
    como = 'Mes habitual de la revisión';
  } else if (ultima && o.periodicidadMeses) {
    proxima = { d: sumarMeses(ultima.d, o.periodicidadMeses), p: ultima.p };
    como = 'Última realizada + periodicidad';
  }

  const cierre = o.cierre || { ok: false, texto: '' };
  const cierreOk = ultimaReg ? !!ultimaReg.documento : !!cierre.ok;
  const cierreTexto = ultimaReg
    ? (ultimaReg.documento
        ? 'Documento de cierre: ' + ultimaReg.documento
        : 'Realizada sin documento de cierre: reclamarlo')
    : cierre.texto;

  let estado;
  if (!proxima) estado = 'sinfecha';
  else if (finPeriodo(proxima) < hoy) estado = 'fuera';
  else if (diasEntre(hoy, proxima.d) <= MARGEN_OBLIGACION_DIAS) estado = 'proxima';
  else estado = 'ok';

  return {
    ultima,
    proxima,
    como,
    estado,
    cierreOk,
    cierreTexto,
    dias: proxima ? diasEntre(hoy, finPeriodo(proxima)) : null,
  };
}

// ── Contratos ────────────────────────────────────────────────────────────────

/**
 * La renovación de un contrato es una obligación más. Vence en su fecha fin o, si es
 * de prórroga tácita anual sin fecha fin, en el próximo aniversario del inicio.
 *
 * @param {object} c  { inicio, fin, renovacion, periodicidad, preaviso, vivo }
 *                    Fechas como texto; `preaviso` en días; `vivo` false = histórico.
 * @returns {{ vence, como, avisar, estado }}
 *   estado: 'historico' | 'sinvenc' | 'vencido' | 'avisar' | 'proximo' | 'ok'
 */
export function calcularContrato(c, hoy) {
  const fin = parseFecha(c.fin);
  const inicio = parseFecha(c.inicio);
  let vence = null;
  let como = null;

  if (fin) {
    vence = fin;
    como = 'Fin de contrato';
  } else if (c.renovacion === 'tácita' && inicio && c.periodicidad === 'anual') {
    let d = inicio.d;
    while (d <= hoy) d = sumarMeses(d, 12);
    vence = { d, p: inicio.p };
    como = 'Prórroga tácita anual';
  }

  const avisar = vence && c.preaviso != null ? sumarDias(vence.d, -c.preaviso) : null;

  let estado;
  if (!c.vivo) estado = 'historico';
  else if (!vence) estado = 'sinvenc';
  else if (finPeriodo(vence) < hoy) estado = 'vencido';
  else if (avisar && avisar <= hoy) estado = 'avisar';
  else if (diasEntre(hoy, avisar || vence.d) <= MARGEN_CONTRATO_DIAS) estado = 'proximo';
  else estado = 'ok';

  return { vence, como, avisar, estado };
}

// ── Hitos sueltos (pago aplazado, revisión de precios…) — US-012 ─────────────

/**
 * @param {object} h  { fecha: 'YYYY-MM-DD', avisoDias, cerrado }
 * @returns {{ fecha, avisar, estado, dias }}  estado: 'cerrado' | 'vencido' | 'avisar' | 'ok'
 */
export function calcularHito(h, hoy) {
  const fecha = parseFecha(h.fecha);
  if (!fecha) return { fecha: null, avisar: null, estado: h.cerrado ? 'cerrado' : 'sinfecha', dias: null };
  const avisar = sumarDias(fecha.d, -(h.avisoDias ?? 30));
  let estado;
  if (h.cerrado) estado = 'cerrado';
  else if (finPeriodo(fecha) < hoy) estado = 'vencido';
  else if (avisar <= hoy) estado = 'avisar';
  else estado = 'ok';
  return { fecha, avisar, estado, dias: diasEntre(hoy, finPeriodo(fecha)) };
}

// ── Adaptadores desde filas de Supabase ──────────────────────────────────────

/**
 * Filas de `ctr_realizadas` → historial del motor. Descarta las anuladas y ordena por
 * fecha (la más reciente al final), venga como venga de la consulta.
 * `documento` puede ser el nombre del documento si la consulta lo trae unido
 * (`documento_nombre`), o el id del documento de cierre.
 */
export function historialDesdeRealizadas(realizadas) {
  return (realizadas || [])
    .filter((r) => !r.anulada)
    .map((r) => ({
      fecha: String(r.fecha).slice(0, 10),
      documento: r.documento_nombre || r.documento_id || null,
      resultado: r.resultado || null,
      id: r.id,
    }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/**
 * Fila de `ctr_obligaciones` → entrada de `calcularObligacion`.
 * `primera_fecha` es la fecha base cuando aún no hay ninguna realizada registrada.
 * `cierre` describe el estado del documento de cierre cuando no hay historial en la app.
 */
export function obligacionDesdeFila(fila, cierre) {
  return {
    ultima: aTexto(fila.primera_fecha, fila.primera_fecha_precision),
    pistaProxima: aTexto(fila.fecha_anunciada, fila.fecha_anunciada_precision),
    mesHabitual: fila.mes_habitual || null,
    periodicidadMeses: fila.periodicidad_meses || null,
    cierre: cierre || { ok: false, texto: 'Sin realizada registrada' },
  };
}

/** Fila de `ctr_contratos` → entrada de `calcularContrato`. */
export function contratoDesdeFila(fila) {
  return {
    inicio: aTexto(fila.inicio, fila.inicio_precision),
    fin: aTexto(fila.fin, fila.fin_precision),
    renovacion: fila.renovacion || null,
    periodicidad: fila.periodicidad || null,
    preaviso: fila.preaviso_dias ?? null,
    vivo: fila.vivo !== false,
  };
}

/** Fila de `ctr_hitos` → entrada de `calcularHito`. */
export function hitoDesdeFila(fila) {
  return { fecha: aTexto(fila.fecha, 'dia'), avisoDias: fila.aviso_dias ?? 30, cerrado: !!fila.cerrado };
}

// ── Grupos de equipos (extintores, eslingas): resultado unidad a unidad ──────

/**
 * Filas de `ctr_realizada_unidades` de una realizada → resumen y resultado global.
 * Regla: basta una unidad «no apto» para que la realizada del grupo sea «no apto».
 * Sin unidades registradas → 'sin resultado'.
 */
export function resumenUnidades(unidades) {
  const u = unidades || [];
  const noAptas = u.filter((x) => x.resultado === 'no apto').length;
  const aptas = u.filter((x) => x.resultado === 'apto').length;
  const total = u.length;
  const resultado = total === 0 ? 'sin resultado' : noAptas > 0 ? 'no apto' : 'apto';
  return { total, aptas, noAptas, resultado };
}

export default {
  parseFecha,
  aTexto,
  finPeriodo,
  sumarMeses,
  sumarDias,
  diasEntre,
  iso,
  calcularObligacion,
  calcularContrato,
  calcularHito,
  historialDesdeRealizadas,
  obligacionDesdeFila,
  contratoDesdeFila,
  hitoDesdeFila,
  resumenUnidades,
};
