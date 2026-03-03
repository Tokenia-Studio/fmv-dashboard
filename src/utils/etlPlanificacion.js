// ============================================
// ETL PLANIFICACION - Parseo 3 Excels + cruce
// Órdenes producción + Rutas + Vínculos
// ============================================

import * as XLSX from 'xlsx'

// Normalizar texto para comparar headers
function norm(s) {
  if (!s) return ''
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// Buscar columna por patrones (flexible encoding)
function findCol(headers, patterns) {
  for (const pat of patterns) {
    const pn = norm(pat)
    const idx = headers.findIndex(h => norm(h).includes(pn))
    if (idx !== -1) return idx
  }
  return -1
}

// Convertir serial Excel a Date
function excelDateToJS(val) {
  if (!val) return null
  if (val instanceof Date) return val
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400000)
    if (!isNaN(d.getTime())) return d
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

/**
 * Parse Órdenes de Producción Excel
 * Returns array of orden objects
 */
export function parseOrdenesExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
  if (rows.length < 2) throw new Error('Excel de órdenes vacío')

  const h = rows[0]
  const cols = {
    num: findCol(h, ['nº', 'no.']),
    descripcion: findCol(h, ['descripción', 'descripcion']),
    descripcion2: findCol(h, ['descripción 2', 'descripcion 2']),
    customerNo: findCol(h, ['customer no']),
    customerName: findCol(h, ['customer name']),
    cantidad: findCol(h, ['cantidad', 'manufactured quantity']),
    fechaVencimiento: findCol(h, ['fecha vencimiento']),
    fechaCreacion: findCol(h, ['fecha creación', 'fecha creacion']),
    blueprints: findCol(h, ['blueprints']),
    codProcedencia: findCol(h, ['procedencia mov', 'cod. procedencia', 'cód. procedencia']),
    estado: findCol(h, ['estado']),
    currentOpNo: findCol(h, ['current operation no']),
    currentOpDesc: findCol(h, ['current operation description']),
    currentOpState: findCol(h, ['current operation state']),
    descripcionAlias: findCol(h, ['descripción alias', 'descripcion alias']),
    delay: findCol(h, ['delay']),
  }

  // El Nº de orden es la primera columna casi siempre
  if (cols.num === -1) cols.num = 0

  const ordenes = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[cols.num]) continue

    const id = String(r[cols.num]).trim()
    if (!id) continue

    // Usar descripcionAlias o descripcion (la más completa)
    const desc = r[cols.descripcionAlias] || r[cols.descripcion] || ''

    ordenes.push({
      id,
      descripcion: String(desc).trim(),
      descripcion2: cols.descripcion2 !== -1 ? String(r[cols.descripcion2] || '').trim() : '',
      clienteCodigo: cols.customerNo !== -1 ? String(r[cols.customerNo] || '').trim() : '',
      clienteNombre: cols.customerName !== -1 ? String(r[cols.customerName] || '').trim() : '',
      cantidad: cols.cantidad !== -1 ? (Number(r[cols.cantidad]) || 0) : 0,
      fechaVencimiento: cols.fechaVencimiento !== -1 ? excelDateToJS(r[cols.fechaVencimiento]) : null,
      fechaCreacion: cols.fechaCreacion !== -1 ? excelDateToJS(r[cols.fechaCreacion]) : null,
      blueprintsLink: cols.blueprints !== -1 ? String(r[cols.blueprints] || '').trim() : '',
      codProcedencia: cols.codProcedencia !== -1 ? String(r[cols.codProcedencia] || '').trim() : '',
      estado: cols.estado !== -1 ? String(r[cols.estado] || '').trim() : '',
      currentOpNo: cols.currentOpNo !== -1 ? String(r[cols.currentOpNo] || '').trim() : '',
      currentOpDesc: cols.currentOpDesc !== -1 ? String(r[cols.currentOpDesc] || '').trim() : '',
      currentOpState: cols.currentOpState !== -1 ? String(r[cols.currentOpState] || '').trim() : '',
      delay: cols.delay !== -1 ? (Number(r[cols.delay]) || 0) : 0,
    })
  }

  return ordenes
}

/**
 * Parse Rutas de Órdenes de Producción Excel
 * Returns Map<ordenId, ruta[]>
 */
export function parseRutasExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
  if (rows.length < 2) throw new Error('Excel de rutas vacío')

  const h = rows[0]
  const cols = {
    ordenProd: findCol(h, ['orden producción', 'orden produccion']),
    numOp: findCol(h, ['nº operación', 'no operación', 'no operacion']),
    estadoRuta: findCol(h, ['estado ruta']),
    tipo: findCol(h, ['tipo']),
    numCentro: findCol(h, ['nº', 'no.']),
    descripcion: findCol(h, ['descripción', 'descripcion']),
    codAlmacen: findCol(h, ['cód. almacén', 'cod. almacen', 'cod almacen']),
    finalizada: findCol(h, ['finalizada']),
    fechaInicial: findCol(h, ['fecha-hora inicial']),
    fechaFinal: findCol(h, ['fecha-hora final']),
    tiempoPrep: findCol(h, ['tiempo preparación', 'tiempo preparacion']),
    tiempoEjec: findCol(h, ['tiempo ejecución', 'tiempo ejecucion']),
    numRuta: findCol(h, ['nº ruta']),
  }

  // El Nº de la operación está en la segunda columna
  if (cols.ordenProd === -1) cols.ordenProd = 0
  if (cols.numOp === -1) cols.numOp = 1

  // numCentro es ambiguo (coincide con nº orden prod), buscar columna 4 (index) por posición
  // La columna "Nº" del centro trabajo está en posición 4 (0-indexed)
  if (cols.numCentro === cols.ordenProd) {
    // Buscar la segunda columna que coincida
    const firstMatch = cols.ordenProd
    const idx = h.findIndex((col, i) => i > firstMatch && norm(col).includes('no') || (i > firstMatch && norm(col) === 'nº'))
    cols.numCentro = idx !== -1 ? idx : 4
  }

  const rutasByOrden = new Map()

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || !r[cols.ordenProd]) continue

    const ordenId = String(r[cols.ordenProd]).trim()
    if (!ordenId) continue

    const ruta = {
      numOperacion: String(r[cols.numOp] || '').trim(),
      estadoRuta: cols.estadoRuta !== -1 ? String(r[cols.estadoRuta] || '').trim() : '',
      tipo: cols.tipo !== -1 ? String(r[cols.tipo] || '').trim() : '',
      centroTrabajo: cols.numCentro !== -1 ? String(r[cols.numCentro] || '').trim() : '',
      descripcion: cols.descripcion !== -1 ? String(r[cols.descripcion] || '').trim() : '',
      finalizada: cols.finalizada !== -1 ? Boolean(r[cols.finalizada]) : false,
      fechaInicial: cols.fechaInicial !== -1 ? excelDateToJS(r[cols.fechaInicial]) : null,
      fechaFinal: cols.fechaFinal !== -1 ? excelDateToJS(r[cols.fechaFinal]) : null,
      tiempoPrep: cols.tiempoPrep !== -1 ? (Number(r[cols.tiempoPrep]) || 0) : 0,
      tiempoEjec: cols.tiempoEjec !== -1 ? (Number(r[cols.tiempoEjec]) || 0) : 0,
      numRuta: cols.numRuta !== -1 ? String(r[cols.numRuta] || '').trim() : '',
    }

    if (!rutasByOrden.has(ordenId)) rutasByOrden.set(ordenId, [])
    rutasByOrden.get(ordenId).push(ruta)
  }

  // Sort operations by numOperacion within each order
  for (const [, rutas] of rutasByOrden) {
    rutas.sort((a, b) => Number(a.numOperacion) - Number(b.numOperacion))
  }

  return rutasByOrden
}

/**
 * Parse Vínculos de Productos Excel
 * Returns Map<itemCode, urlServidor>
 */
export function parseVinculosExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
  if (rows.length < 2) throw new Error('Excel de vínculos vacío')

  const h = rows[0]
  const cols = {
    gsRecordID: findCol(h, ['gs_recordid', 'recordid']),
    url1: findCol(h, ['url1', 'url']),
  }

  if (cols.gsRecordID === -1) cols.gsRecordID = 2  // Column C
  if (cols.url1 === -1) cols.url1 = 3              // Column D

  const vinculosByItem = new Map()

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r) continue

    const rawId = String(r[cols.gsRecordID] || '').trim()
    const url = String(r[cols.url1] || '').trim()

    if (!rawId || !url) continue

    // Extract item code: "ITEM: VP-02295" -> "VP-02295"
    const match = rawId.match(/ITEM:\s*(.+)/i)
    const itemCode = match ? match[1].trim() : rawId

    // Keep first URL found for each item (or overwrite, latest wins)
    if (!vinculosByItem.has(itemCode)) {
      vinculosByItem.set(itemCode, url)
    }
  }

  return vinculosByItem
}

/**
 * Cross-reference all 3 datasets into enriched orders
 */
export function cruzarPlanificacion(ordenes, rutasByOrden, vinculosByItem) {
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return ordenes.map(orden => {
    // Match rutas
    const rutas = rutasByOrden.get(orden.id) || []

    // Match plano servidor from vínculos (by codProcedencia = item code)
    const planoServidor = vinculosByItem.get(orden.codProcedencia) || ''

    // Count phases
    const totalFases = rutas.length
    const fasesCompletadas = rutas.filter(r => r.finalizada).length

    // Sum theoretical times
    const tiempoTeoricoTotal = rutas.reduce((sum, r) => sum + r.tiempoPrep + r.tiempoEjec, 0)

    // Extract month from fechaVencimiento
    let mesVencimiento = null
    let añoVencimiento = null
    if (orden.fechaVencimiento) {
      const d = orden.fechaVencimiento instanceof Date ? orden.fechaVencimiento : new Date(orden.fechaVencimiento)
      if (!isNaN(d.getTime())) {
        mesVencimiento = MESES[d.getMonth()]
        añoVencimiento = d.getFullYear()
      }
    }

    return {
      ...orden,
      rutas,
      planoServidor,
      totalFases,
      fasesCompletadas,
      tiempoTeoricoTotal: Math.round(tiempoTeoricoTotal * 100) / 100,
      mesVencimiento,
      añoVencimiento,
    }
  })
}
