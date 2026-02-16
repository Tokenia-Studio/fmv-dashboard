// ============================================
// ETL ESTRUCTURAS - Replica build_dashboard.py
// Parsea Planning + Fichajes Excel -> series
// ============================================

import * as XLSX from 'xlsx'

// === PHASE MAP: Phase Description -> Standard Operation ===
export const PHASE_MAP_LATERAL = {
  'SOLDAR PILAR P1-P4': 'P1-P4',
  'SOLDAR PILAR P1': 'P1-P4',
  'SOLDAR PILAR P4': 'P1-P4',
  'SOLDAR PILAR P2-P3': 'P2-P3',
  'SOLDAR PILAR P2': 'P2-P3',
  'SOLDAR PILAR P3': 'P2-P3',
  'SOLDAR PABELLON SUPERIOR': 'Pabellon',
  'SOLDAR PABELLON': 'Pabellon',
  'SOLDAR ULTIMO NIVEL': 'Ult. nivel',
  'ENDEREZADO': 'Enderezado',
  'ENDEREZAR CRUCETAS': 'Enderezado',
}

export const PHASE_MAP_BASTIDOR = {
  'CHAFLANES': 'Chaflanes',
  'HACER CHAFLANES': 'Chaflanes',
  'SOLDAR PAREJA DE CABECEROS': 'Cabeceros',
  'SOLDAR CABECERO': 'Cabeceros',
  'SOLDAR JUEGO DE LARGUEROS': 'Largueros',
  'SOLDAR PAREJA DE LARGUEROS': 'Largueros',
  'SOLDAR LARGUERO': 'Largueros',
  'ARMADO ULTIMO NIVEL': 'Armado',
  'SOLDAR ULTIMO NIVEL': 'Ult. nivel',
  'ENDEREZADO': 'Enderezado',
  'ENDEREZAR CRUCETAS': 'Enderezado',
}

export const LATERAL_OPS = ['P1-P4', 'P2-P3', 'Pabellon', 'Ult. nivel', 'Enderezado']
export const BASTIDOR_OPS = ['Chaflanes', 'Cabeceros', 'Largueros', 'Armado', 'Ult. nivel', 'Enderezado']

/**
 * Parse Planning Excel: OF -> Serie -> Modelo mapping
 * Reads sheet 'PLANING TRAMLINK' with raw rows (no headers)
 */
export function parsePlanningExcel(workbook) {
  // Try to find the correct sheet
  let sheetName = workbook.SheetNames.find(s =>
    s.toUpperCase().includes('PLANING') || s.toUpperCase().includes('TRAMLINK')
  ) || workbook.SheetNames[0]

  const sheet = workbook.Sheets[sheetName]
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })

  const seriesData = []
  const ofLatToSeries = {} // OF lateral -> [serie_str, ...]
  const ofBasToSeries = {} // OF bastidor -> [serie_str, ...]

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i]
    if (!row) continue

    const modelo = row[0]
    const serie = row[1]
    if (modelo == null || serie == null || String(modelo).trim() === '' || String(serie).trim() === '') continue

    // OF lateral at column M (index 12), OF bastidor at column S (index 18)
    let ofLat = null
    let ofBas = null
    const v12 = row[12]
    const v18 = row[18]

    if (v12 != null && String(v12).trim().startsWith('OF')) {
      ofLat = String(v12).trim()
    }
    if (v18 != null && String(v18).trim().startsWith('OF')) {
      ofBas = String(v18).trim()
    }

    if (!ofLat && !ofBas) continue

    const serieStr = String(Math.floor(Number(serie)))
    const modeloStr = String(modelo).trim()

    // Column AD (index 29): enviado if has content
    const v29 = row[29]
    const enviado = v29 != null && String(v29).trim() !== ''

    const sd = { serie: serieStr, modelo: modeloStr, ofLat, ofBas, enviado }
    seriesData.push(sd)

    if (ofLat) {
      if (!ofLatToSeries[ofLat]) ofLatToSeries[ofLat] = []
      ofLatToSeries[ofLat].push(serieStr)
    }
    if (ofBas) {
      if (!ofBasToSeries[ofBas]) ofBasToSeries[ofBas] = []
      ofBasToSeries[ofBas].push(serieStr)
    }
  }

  return { seriesData, ofLatToSeries, ofBasToSeries }
}

// Patrones para detectar columnas del fichero de fichajes (EN + ES)
const FICHAJES_COL_PATTERNS = {
  prodOrder: ['prod. order no', 'orden produccion', 'orden prod', 'nº orden prod'],
  phaseDesc: ['phase description', 'descripcion fase', 'descripción fase'],
  execTime:  ['execution time', 'tiempo ejecucion', 'tiempo ejecución'],
  startDate: ['start date', 'fecha inicio']
}

function findCol(headers, patterns) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[º°]/g, '').trim()
  const hNorm = headers.map(norm)
  for (const p of patterns) {
    const pN = norm(p)
    const idx = hNorm.findIndex(h => h.includes(pN))
    if (idx !== -1) return headers[idx]
  }
  return null
}

/**
 * Parse Fichajes Excel: Real times grouped by OF and phase
 * Detección flexible de columnas (soporta ficheros EN y ES)
 */
export function parseFichajesExcel(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json(sheet, { raw: true, defval: null })

  if (json.length === 0) return {}

  // Recopilar TODAS las cabeceras (algunas columnas pueden estar vacías en la 1ª fila)
  const headersSet = new Set()
  const scanRows = Math.min(json.length, 100)
  for (let i = 0; i < scanRows; i++) {
    Object.keys(json[i]).forEach(k => headersSet.add(k))
  }
  const headers = [...headersSet]
  const cOF    = findCol(headers, FICHAJES_COL_PATTERNS.prodOrder)
  const cPhase = findCol(headers, FICHAJES_COL_PATTERNS.phaseDesc)
  const cTime  = findCol(headers, FICHAJES_COL_PATTERNS.execTime)
  const cDate  = findCol(headers, FICHAJES_COL_PATTERNS.startDate)

  if (!cOF) {
    throw new Error('No se encontró la columna de Orden de Producción en el fichero de fichajes. Columnas encontradas: ' + headers.join(', '))
  }

  // Group records by OF number, remapeando a nombres internos
  const byOF = {}
  json.forEach(row => {
    const of = String(row[cOF] || '').trim()
    if (!of) return
    if (!byOF[of]) byOF[of] = []
    byOF[of].push({
      'Prod. Order No.': row[cOF],
      'Phase Description': cPhase ? row[cPhase] : '',
      'Execution Time (minutes)': cTime ? row[cTime] : 0,
      'Start Date': cDate ? row[cDate] : null
    })
  })

  return byOF
}

/**
 * Get fichajes records for an OF, handling variants (OF0057531/2)
 */
function getOfRecords(ofCode, fichajesByOF) {
  const ofClean = ofCode.split('/')[0].split('*')[0].trim()
  if (fichajesByOF[ofClean]) return fichajesByOF[ofClean]

  // Try prefix match (first 9 chars)
  const prefix = ofClean.substring(0, 9)
  for (const key of Object.keys(fichajesByOF)) {
    if (key.startsWith(prefix)) return fichajesByOF[key]
  }
  return []
}

/**
 * Aggregate OF times for lateral operations
 */
function aggregateOfTimes(ofToSeriesMap, fichajesByOF, phaseMap, opsOrder) {
  const ofTimes = {}
  const ofDates = {}

  for (const ofCode of Object.keys(ofToSeriesMap)) {
    const records = getOfRecords(ofCode, fichajesByOF)
    if (records.length === 0) continue

    const ops = {}
    const dates = []

    records.forEach(row => {
      const phase = String(row['Phase Description'] || '').trim()
      if (phaseMap[phase]) {
        const op = phaseMap[phase]
        if (!ops[op]) ops[op] = 0
        ops[op] += (parseFloat(row['Execution Time (minutes)']) || 0) / 60.0
      }

      // Collect dates
      const startDate = row['Start Date']
      if (startDate) {
        let d
        if (startDate instanceof Date) {
          d = startDate
        } else if (typeof startDate === 'number' && startDate > 40000) {
          d = new Date((startDate - 25569) * 86400 * 1000)
        } else if (typeof startDate === 'string') {
          d = new Date(startDate)
        }
        if (d && !isNaN(d.getTime())) dates.push(d)
      }
    })

    if (Object.keys(ops).length > 0) {
      ofTimes[ofCode] = ops
    }

    if (dates.length > 0) {
      dates.sort((a, b) => a - b)
      ofDates[ofCode] = {
        min: dates[0].toISOString().substring(0, 10),
        max: dates[dates.length - 1].toISOString().substring(0, 10)
      }
    }
  }

  return { ofTimes, ofDates }
}

/**
 * Check if an OF is partial (mix of enviadas and pending series)
 */
function isOfPartial(ofCode, ofToSeriesMap, enviadoMap) {
  if (!ofCode || !ofToSeriesMap[ofCode]) return false
  const seriesInOf = ofToSeriesMap[ofCode]
  const statuses = seriesInOf.map(s => enviadoMap[s] || false)
  const hasEnviado = statuses.some(s => s)
  const hasPending = statuses.some(s => !s)
  return hasEnviado && hasPending
}

function ofEnviadoCount(ofCode, ofToSeriesMap, enviadoMap) {
  if (!ofCode || !ofToSeriesMap[ofCode]) return [0, 0]
  const seriesInOf = ofToSeriesMap[ofCode]
  const enviadas = seriesInOf.filter(s => enviadoMap[s]).length
  return [enviadas, seriesInOf.length]
}

/**
 * Main ETL: Cross-reference planning + fichajes + tiempos estandar
 * @param {Object} planning - result of parsePlanningExcel
 * @param {Object} fichajesByOF - result of parseFichajesExcel
 * @param {Object} tiemposEstandar - {lateral: {modelo: {total, ops...}}, bastidor: {...}}
 * @param {Function} onProgress - optional progress callback
 * @returns {Array} series results
 */
export function cruzarDatos(planning, fichajesByOF, tiemposEstandar, onProgress) {
  const { seriesData, ofLatToSeries, ofBasToSeries } = planning
  const teoLateral = tiemposEstandar?.lateral || {}
  const teoBastidor = tiemposEstandar?.bastidor || {}

  if (onProgress) onProgress('Agregando tiempos laterales...')

  // Aggregate lateral times
  const { ofTimes: ofLatTimes, ofDates: ofLatDates } =
    aggregateOfTimes(ofLatToSeries, fichajesByOF, PHASE_MAP_LATERAL, LATERAL_OPS)

  if (onProgress) onProgress('Agregando tiempos bastidores...')

  // Aggregate bastidor times
  const { ofTimes: ofBasTimes, ofDates: ofBasDates } =
    aggregateOfTimes(ofBasToSeries, fichajesByOF, PHASE_MAP_BASTIDOR, BASTIDOR_OPS)

  if (onProgress) onProgress('Cruzando datos...')

  // Build enviado lookup
  const enviadoMap = {}
  seriesData.forEach(sd => { enviadoMap[sd.serie] = sd.enviado })

  const results = []
  let skipped = 0

  seriesData.forEach(sd => {
    const { serie, modelo, ofLat, ofBas } = sd

    const latInFichajes = ofLat && ofLatTimes[ofLat]
    const basInFichajes = ofBas && ofBasTimes[ofBas]

    if (!latInFichajes && !basInFichajes) {
      skipped++
      return
    }

    // Lateral real times (average per serie)
    const latRealOps = {}
    let latRealTotal = null
    if (latInFichajes) {
      const nSeries = ofLatToSeries[ofLat].length
      const opsTotal = ofLatTimes[ofLat]
      latRealTotal = 0
      LATERAL_OPS.forEach(op => {
        const val = (opsTotal[op] || 0) / nSeries
        latRealOps[op] = Math.round(val * 100) / 100
        latRealTotal += val
      })
      latRealTotal = Math.round(latRealTotal * 100) / 100
    }

    // Bastidor real times
    const basRealOps = {}
    let basRealTotal = null
    if (basInFichajes) {
      const nSeries = ofBasToSeries[ofBas].length
      const opsTotal = ofBasTimes[ofBas]
      basRealTotal = 0
      BASTIDOR_OPS.forEach(op => {
        const val = (opsTotal[op] || 0) / nSeries
        basRealOps[op] = Math.round(val * 100) / 100
        basRealTotal += val
      })
      basRealTotal = Math.round(basRealTotal * 100) / 100
    }

    // Theoretical times
    const latTeo = teoLateral[modelo] || null
    const basTeo = teoBastidor[modelo] || null

    if (latRealTotal == null && basRealTotal == null) {
      skipped++
      return
    }

    // Detect partial OFs
    const parcialLat = isOfPartial(ofLat, ofLatToSeries, enviadoMap)
    const parcialBas = isOfPartial(ofBas, ofBasToSeries, enviadoMap)
    const parcial = parcialLat || parcialBas

    // Date range
    let fechaMin = null
    let fechaMax = null
    if (ofLat && ofLatDates[ofLat]) {
      fechaMin = ofLatDates[ofLat].min
      fechaMax = ofLatDates[ofLat].max
    }
    if (ofBas && ofBasDates[ofBas]) {
      const bd = ofBasDates[ofBas]
      if (!fechaMin || bd.min < fechaMin) fechaMin = bd.min
      if (!fechaMax || bd.max > fechaMax) fechaMax = bd.max
    }

    // Series counts
    const nLat = ofLatToSeries[ofLat]?.length || 0
    const nBas = ofBasToSeries[ofBas]?.length || 0

    // Enviado counts
    const [envLat, totLat] = ofEnviadoCount(ofLat, ofLatToSeries, enviadoMap)
    const [envBas, totBas] = ofEnviadoCount(ofBas, ofBasToSeries, enviadoMap)

    const record = {
      modelo,
      serie,
      ofLateral: ofLat || '',
      ofBastidor: ofBas || '',
      fechaIni: fechaMin,
      fechaFin: fechaMax,
      nSeriesLat: nLat,
      nSeriesBas: nBas,
      enviado: sd.enviado,
      parcial,
      envLatInfo: parcialLat ? `${envLat}/${totLat}` : null,
      envBasInfo: parcialBas ? `${envBas}/${totBas}` : null,
      lateral: {
        real: latRealTotal,
        teo: latTeo ? latTeo.total : null,
        ops: LATERAL_OPS.map(op => ({
          n: op,
          r: latRealOps[op] ?? null,
          t: latTeo ? (latTeo[op] ?? null) : null
        }))
      },
      bastidor: {
        real: basRealTotal != null ? basRealTotal : 0,
        teo: basTeo ? basTeo.total : null,
        ops: BASTIDOR_OPS.map(op => ({
          n: op,
          r: basRealOps[op] ?? null,
          t: basTeo ? (basTeo[op] ?? null) : null
        }))
      }
    }

    results.push(record)
  })

  return { results, skipped, totalPlanning: seriesData.length }
}

/**
 * Default tiempos estándar (same as tiempos_estandar.json)
 */
export const DEFAULT_TIEMPOS_ESTANDAR = {
  lateral: {
    'BERNA CORTO': { total: 83.62, 'P1-P4': 6.75, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 38.7, 'Enderezado': 6.67 },
    'BERNA LARGO 2=6': { total: 90.37, 'P1-P4': 13.5, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 38.7, 'Enderezado': 6.67 },
    'ERFURT 6092 2': { total: 123.0, 'P1-P4': 17.5, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 51.0, 'Enderezado': 15.0 },
    'ERFURT 6092 4': { total: 114.5, 'P1-P4': 9.0, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 51.0, 'Enderezado': 15.0 },
    'ERFURT 6092 6': { total: 123.0, 'P1-P4': 17.5, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 51.0, 'Enderezado': 15.0 },
    'FGV 2=6': { total: 119.0, 'P1-P4': 17.5, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 48.0, 'Enderezado': 14.0 },
    'FGV 4': { total: 110.0, 'P1-P4': 16.0, 'P2-P3': 16.0, 'Pabellon': 20.0, 'Ult. nivel': 44.0, 'Enderezado': 14.0 },
    'GINEBRA 2=6': { total: 119.0, 'P1-P4': 17.5, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 48.0, 'Enderezado': 14.0 },
    'GINEBRA 4': { total: 110.0, 'P1-P4': 16.0, 'P2-P3': 16.0, 'Pabellon': 20.0, 'Ult. nivel': 44.0, 'Enderezado': 14.0 },
    'JENA 6129 2=6': { total: 119.0, 'P1-P4': 17.5, 'P2-P3': 17.5, 'Pabellon': 22.0, 'Ult. nivel': 48.0, 'Enderezado': 14.0 },
    'JENA CORTO': { total: 87.62, 'P1-P4': 6.75, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 42.7, 'Enderezado': 6.67 },
    'JENA LARGO 2=6': { total: 94.37, 'P1-P4': 13.5, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 42.7, 'Enderezado': 6.67 },
    'LAUSSANE 2=6': { total: 109.0, 'P1-P4': 16.0, 'P2-P3': 16.0, 'Pabellon': 20.0, 'Ult. nivel': 44.0, 'Enderezado': 13.0 },
    'LAUSSANE 4': { total: 109.0, 'P1-P4': 16.0, 'P2-P3': 16.0, 'Pabellon': 20.0, 'Ult. nivel': 44.0, 'Enderezado': 13.0 },
    'NBERNA CORTO': { total: 83.62, 'P1-P4': 6.75, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 38.7, 'Enderezado': 6.67 },
    'NBERNA LARGO': { total: 94.37, 'P1-P4': 13.5, 'P2-P3': 13.5, 'Pabellon': 18.0, 'Ult. nivel': 42.7, 'Enderezado': 6.67 }
  },
  bastidor: {
    'BERNA CORTO': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 },
    'BERNA LARGO 2=6': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 },
    'ERFURT 6092 2': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'ERFURT 6092 4': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'ERFURT 6092 6': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'FGV 2=6': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'FGV 4': { total: 129.0, 'Chaflanes': 15.0, 'Cabeceros': 44.0, 'Largueros': 16.0, 'Armado': 14.0, 'Ult. nivel': 32.0, 'Enderezado': 8.0 },
    'GINEBRA 2=6': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'GINEBRA 4': { total: 129.0, 'Chaflanes': 15.0, 'Cabeceros': 44.0, 'Largueros': 16.0, 'Armado': 14.0, 'Ult. nivel': 32.0, 'Enderezado': 8.0 },
    'JENA 6129 2=6': { total: 139.0, 'Chaflanes': 16.0, 'Cabeceros': 48.0, 'Largueros': 17.0, 'Armado': 15.0, 'Ult. nivel': 34.5, 'Enderezado': 8.5 },
    'JENA CORTO': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 },
    'JENA LARGO 2=6': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 },
    'NBERNA CORTO': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 },
    'NBERNA LARGO': { total: 101.15, 'Chaflanes': 12.15, 'Cabeceros': 32.0, 'Largueros': 13.0, 'Armado': 8.0, 'Ult. nivel': 32.0, 'Enderezado': 4.0 }
  }
}
