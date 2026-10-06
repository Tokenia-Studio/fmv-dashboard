// ============================================
// CONTRATOS - Exportación a Excel (bloque 1.7)
// ============================================
// Las filas se montan aquí, sin tocar el DOM, para poder probarlas con vitest.
// Solo se exporta lo que ya está en pantalla: el modelo llega filtrado por las
// políticas de la base de datos y las listas lo filtran por vista, así que el
// Excel no puede llevar nada que el usuario no vea.
//
// Fechas: con precisión de día van como fecha de Excel (se ordenan y filtran);
// con precisión de mes o año van como texto («abril de 2027»), para no fingir
// una exactitud que el documento no tiene.

import * as XLSX from 'xlsx'
import { textoFecha, sumaEnTotales, VISTAS } from './contratosVista.js'

const ESTADO_OBLIGACION = { fuera: 'Fuera de plazo', proxima: 'Próximos 60 días', ok: 'En plazo', sinfecha: 'Sin fecha fijada' }
const SITUACION_EQUIPO = { ...ESTADO_OBLIGACION, sinplan: 'Sin plan de mantenimiento', sinobligaciones: 'Sin obligaciones definidas', baja: 'De baja' }
const ESTADO_CONTRATO = {
  vencido: 'Vencido sin cerrar', avisar: 'Plazo de aviso abierto', proximo: 'Decidir en 90 días',
  ok: 'En plazo', sinvenc: 'Sin vencimiento conocido', historico: 'Histórico',
}

/** { d, p } del motor → Date si es un día concreto, texto si es mes o año, '' si no hay. */
export function celdaFecha(f) {
  if (!f) return ''
  if (f.p === 'dia') return new Date(f.d.getFullYear(), f.d.getMonth(), f.d.getDate())
  return textoFecha(f)
}
const diaDate = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : '')
const num = (v) => (v == null || v === '' ? '' : Number(v))
const siNo = (b) => (b ? 'Sí' : 'No')

/** Una fila por equipo suelto o grupo de la lista filtrada (lo que se ve en pantalla). */
export function filasExcelEquipos(filas, modelo) {
  return filas.map((x) => {
    const e = x.tipo === 'equipo' ? modelo.equipo(x.id) : null
    const p = x.principal
    return {
      Equipo: x.nombre,
      Unidades: x.unidades,
      Tipo: x.tipoEquipo || '',
      'Nº interno': e?.num_interno || '',
      Modelo: e?.modelo || '',
      'Nº de serie': e?.num_serie || '',
      Régimen: x.regimen || '',
      'Activo fijo BC': x.tipo === 'grupo' ? '' : x.regimen === 'propio' ? x.activoFijo || 'PENDIENTE' : 'No aplica',
      Nave: x.nave || '',
      'Asignado a': x.asignado || '',
      Estado: x.estado,
      'No apto': x.noApto ? (x.tipo === 'grupo' ? `${x.noAptas} no aptas` : 'Sí') : '',
      'Próxima obligación': p ? p.etiqueta || p.tipo : '',
      'Fecha próxima': p ? celdaFecha(p.calc.proxima) : '',
      Situación: SITUACION_EQUIPO[x.situacion] || x.situacion,
      'Documento de origen': p ? (x.sinOrigen ? 'Falta' : 'Sí') : '',
      'Documento de cierre': p ? (x.sinCierre ? 'Falta' : 'Sí') : '',
    }
  })
}

/**
 * Una fila por obligación viva de los equipos y grupos filtrados. Es la hoja que
 * sirve para la auditoría EN 15085 (P8): cada calibración con su última fecha,
 * su resultado y el certificado que la prueba.
 */
export function filasExcelObligaciones(filas, modelo) {
  const out = []
  for (const x of filas) {
    const obs = x.tipo === 'grupo'
      ? modelo.grupo(x.id)?.obligaciones || []
      : (modelo.equipo(x.id)?.obligaciones || []).filter((o) => o.equipo_id === x.id)
    for (const o of obs.filter((o) => o.viva)) {
      const u = o.ultimaRealizada
      const contrato = o.contrato_id ? modelo.contrato(o.contrato_id) : null
      out.push({
        Equipo: x.nombre,
        Obligación: o.etiqueta || o.tipo,
        Tipo: o.tipo,
        'Periodicidad (meses)': num(o.periodicidad_meses),
        Proveedor: o.proveedor_nombre || contrato?.proveedor_nombre || '',
        Precio: num(o.precio),
        'Pedido PCP': o.pedido_pcp || '',
        Contrato: contrato ? contrato.codigo || '' : '',
        'Última realizada': celdaFecha(o.calc.ultima),
        Resultado: u?.resultado || '',
        'Unidades no aptas': x.tipo === 'grupo' && o.noAptoUnidades.length ? o.noAptoUnidades.length : '',
        'Fecha próxima': celdaFecha(o.calc.proxima),
        Situación: ESTADO_OBLIGACION[o.calc.estado] || o.calc.estado,
        'Documento de origen': o.origen.texto,
        'Documento de cierre': o.calc.cierreTexto || '',
      })
    }
  }
  return out
}

/** Unidades de los grupos filtrados, con el resultado de la última realizada del grupo. */
export function filasExcelUnidades(filas, modelo) {
  const out = []
  for (const x of filas.filter((f) => f.tipo === 'grupo')) {
    const g = modelo.grupo(x.id)
    if (!g) continue
    const ultimas = g.obligaciones.filter((o) => o.viva && o.ultimaRealizada).map((o) => o.ultimaRealizada)
    for (const u of g.unidades) {
      const r = ultimas.map((ur) => ur.unidades.find((v) => v.equipo_id === u.id)).find(Boolean)
      out.push({
        Grupo: g.nombre,
        Unidad: u.nombre,
        Identificación: u.identificacion || '',
        'Nº de serie': u.num_serie || '',
        Estado: u.estado,
        'Resultado última revisión': r?.resultado || '',
      })
    }
  }
  return out
}

/** Una fila por contrato de la lista filtrada, con total de importe anual de los que suman. */
export function filasExcelContratos(contratos) {
  const filas = contratos.map((c) => ({
    Código: c.codigo || '',
    Proveedor: c.proveedor_nombre,
    'Nº proveedor BC': c.proveedor_codigo || '',
    Categoría: c.categoria,
    Vista: VISTAS[c.vista] || c.vista,
    'Vista confirmada': siNo(c.vista_confirmada),
    Objeto: c.objeto,
    Nave: c.nave || '',
    Referencia: c.referencia || '',
    Importe: num(c.importe),
    Periodicidad: c.periodicidad || '',
    'Importe anual': num(c.importe_anual),
    'Importe declarado compras': num(c.importe_declarado),
    Inicio: c.inicio ? celdaFecha({ d: new Date(`${String(c.inicio).slice(0, 10)}T00:00:00`), p: c.inicio_precision || 'dia' }) : '',
    Fin: c.fin ? celdaFecha({ d: new Date(`${String(c.fin).slice(0, 10)}T00:00:00`), p: c.fin_precision || 'dia' }) : '',
    Renovación: c.renovacion || '',
    'Renovación cada (meses)': c.renovacion === 'tácita' && !c.fin ? num(c.renovacion_meses) || '12 (supuesto)' : '',
    'Preaviso (días)': num(c.preaviso_dias),
    Vence: celdaFecha(c.calc.vence),
    'Cómo se calcula': c.calc.como || '',
    'Avisar antes del': diaDate(c.calc.avisar),
    Calendario: ESTADO_CONTRATO[c.calc.estado] || c.calc.estado,
    'Estado documental': c.estado_documental,
    'Suma en totales': siNo(sumaEnTotales(c)),
    'Documento de origen': c.origenOk ? 'Sí' : 'Falta',
    'Cuenta de gasto BC': c.cuenta_gasto || '',
    Observaciones: c.observaciones || '',
  }))
  const total = contratos.filter(sumaEnTotales).reduce((s, c) => s + (c.importe_anual != null ? Number(c.importe_anual) : 0), 0)
  if (filas.length) filas.push({ Código: '', Proveedor: 'TOTAL (solo los que suman)', 'Importe anual': total })
  return filas
}

// ── Libro ───────────────────────────────────────────────────────────────────

const COLUMNAS_IMPORTE = new Set(['Importe', 'Importe anual', 'Importe declarado compras', 'Precio'])

// Nº de serie de Excel calculado a mano: SheetJS 0.18 convierte las Date con el
// desfase histórico de Madrid (−0:14:44 en 1899) y el 29/06 salía como 28/06.
export const serieExcel = (d) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000)

export function hoja(filas) {
  const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{ '': 'Sin filas con los filtros aplicados' }])
  const cabeceras = filas.length ? Object.keys(filas[0]) : ['']
  filas.forEach((f, i) => {
    cabeceras.forEach((cab, col) => {
      const celda = ws[XLSX.utils.encode_cell({ r: i + 1, c: col })]
      if (!celda) return
      if (f[cab] instanceof Date) ws[XLSX.utils.encode_cell({ r: i + 1, c: col })] = { t: 'n', v: serieExcel(f[cab]), z: 'dd/mm/yyyy' }
      else if (typeof celda.v === 'number' && COLUMNAS_IMPORTE.has(cab)) celda.z = '#,##0.00'
    })
  })
  ws['!cols'] = cabeceras.map((cab) => {
    const largo = Math.max(cab.length, ...filas.slice(0, 200).map((f) => String(f[cab] instanceof Date ? '00/00/0000' : f[cab] ?? '').length))
    return { wch: Math.min(Math.max(largo + 2, 8), 50) }
  })
  ws['!autofilter'] = { ref: ws['!ref'] }
  return ws
}

/** hojas = [{ nombre, filas }] → descarga «<base>_AAAA-MM-DD.xlsx» */
export function descargarLibro(base, hojas, hoy = new Date()) {
  const wb = XLSX.utils.book_new()
  for (const h of hojas) XLSX.utils.book_append_sheet(wb, hoja(h.filas), h.nombre.slice(0, 31))
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  XLSX.writeFile(wb, `${base}_${fecha}.xlsx`)
}
