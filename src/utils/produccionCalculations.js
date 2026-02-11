// ============================================
// CALCULOS PRODUCCION - Seguimiento Estructuras
// ============================================

import { SEMAFORO_THRESHOLDS } from './constants'

/**
 * Calcula % desviación entre real y teórico
 * Positivo = por encima del estándar (peor)
 */
export function calcDesv(real, teo) {
  if (teo == null || teo === 0 || real == null) return null
  return ((real - teo) / teo) * 100
}

/**
 * Determina semáforo basado en desviación %
 * Negativa (real < teórico) = siempre verde (por debajo del estándar = bien)
 * Positiva (real > teórico) = alerta/fuera según umbral
 * @returns 'green' | 'yellow' | 'red' | 'gray'
 */
export function getSemaforo(desv) {
  if (desv == null) return 'gray'
  if (desv <= SEMAFORO_THRESHOLDS.green) return 'green'
  if (desv <= SEMAFORO_THRESHOLDS.yellow) return 'yellow'
  return 'red'
}

/**
 * Determina semáforo general de una serie
 * Usa la desviación MÁS POSITIVA (peor) de lateral/bastidor
 */
export function getOverallSemaforo(serie) {
  const latDesv = calcDesv(serie.lateral?.real, serie.lateral?.teo)
  const basDesv = calcDesv(serie.bastidor?.real, serie.bastidor?.teo)

  let maxDesv = null
  if (latDesv != null && basDesv != null) maxDesv = Math.max(latDesv, basDesv)
  else if (latDesv != null) maxDesv = latDesv
  else if (basDesv != null) maxDesv = basDesv

  return getSemaforo(maxDesv)
}

/**
 * Obtiene la desviación máxima (peor) de una serie
 */
export function getMaxDesv(serie) {
  const latDesv = calcDesv(serie.lateral?.real, serie.lateral?.teo)
  const basDesv = calcDesv(serie.bastidor?.real, serie.bastidor?.teo)

  if (latDesv != null && basDesv != null) return Math.max(latDesv, basDesv)
  if (latDesv != null) return latDesv
  if (basDesv != null) return basDesv
  return null
}

/**
 * Calcula KPIs agregados para un conjunto de series
 */
export function calcularKPIsEstructuras(series) {
  let total = series.length
  let verdes = 0
  let amarillas = 0
  let rojas = 0
  let parciales = 0
  let sinEstandar = 0

  series.forEach(s => {
    const sem = getOverallSemaforo(s)
    if (sem === 'green') verdes++
    else if (sem === 'yellow') amarillas++
    else if (sem === 'red') rojas++
    else sinEstandar++

    if (s.parcial) parciales++
  })

  return { total, verdes, amarillas, rojas, parciales, sinEstandar }
}

/**
 * Filtra series según criterios
 */
export function filterSeries(series, filters) {
  return series.filter(s => {
    // Filtro modelo
    if (filters.modelo && s.modelo !== filters.modelo) return false

    // Filtro semáforo
    if (filters.semaforo && filters.semaforo !== 'todos') {
      const sem = getOverallSemaforo(s)
      if (filters.semaforo !== sem) return false
    }

    // Filtro texto (serie u OF)
    if (filters.texto) {
      const t = filters.texto.toLowerCase()
      const match = s.serie.toLowerCase().includes(t) ||
        (s.ofLateral || '').toLowerCase().includes(t) ||
        (s.ofBastidor || '').toLowerCase().includes(t)
      if (!match) return false
    }

    // Filtro fecha inicio
    if (filters.fechaDesde && s.fechaIni) {
      if (s.fechaIni < filters.fechaDesde) return false
    }

    // Filtro fecha fin
    if (filters.fechaHasta && s.fechaFin) {
      if (s.fechaFin > filters.fechaHasta) return false
    }

    // Filtro enviado
    if (filters.enviado !== undefined && filters.enviado !== null) {
      if (s.enviado !== filters.enviado) return false
    }

    return true
  })
}

/**
 * Ordena series por columna
 */
export function sortSeries(series, sortCol, sortAsc) {
  const sorted = [...series]
  sorted.sort((a, b) => {
    let va, vb
    switch (sortCol) {
      case 'serie':
        va = parseInt(a.serie) || 0
        vb = parseInt(b.serie) || 0
        break
      case 'modelo':
        va = a.modelo || ''
        vb = b.modelo || ''
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      case 'fechaIni':
        va = a.fechaIni || ''
        vb = b.fechaIni || ''
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
      case 'lateralReal':
        va = a.lateral?.real ?? -1
        vb = b.lateral?.real ?? -1
        break
      case 'lateralDesv':
        va = calcDesv(a.lateral?.real, a.lateral?.teo) ?? -999
        vb = calcDesv(b.lateral?.real, b.lateral?.teo) ?? -999
        break
      case 'bastidorReal':
        va = a.bastidor?.real ?? -1
        vb = b.bastidor?.real ?? -1
        break
      case 'bastidorDesv':
        va = calcDesv(a.bastidor?.real, a.bastidor?.teo) ?? -999
        vb = calcDesv(b.bastidor?.real, b.bastidor?.teo) ?? -999
        break
      case 'semaforo': {
        const order = { red: 3, yellow: 2, green: 1, gray: 0 }
        va = order[getOverallSemaforo(a)] || 0
        vb = order[getOverallSemaforo(b)] || 0
        break
      }
      default:
        va = 0
        vb = 0
    }
    return sortAsc ? va - vb : vb - va
  })
  return sorted
}
