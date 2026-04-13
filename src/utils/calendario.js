// Helpers para calcular horas y días laborables a partir de la tabla
// Supabase `prod_calendario` (compartida con FMV Producción).

const DEFAULT_CALENDARIO = {
  horas_dia: 8,
  horario: '7:00 - 15:15',
  festivos: [],
  media_jornada: [],
  vacaciones_agosto: true,
}

export function getCalendarioSafe(row, anio) {
  if (!row) return { anio, ...DEFAULT_CALENDARIO }
  return {
    anio: row.anio ?? anio,
    horas_dia: Number(row.horas_dia) || 8,
    horario: row.horario || DEFAULT_CALENDARIO.horario,
    festivos: Array.isArray(row.festivos) ? row.festivos : [],
    media_jornada: Array.isArray(row.media_jornada) ? row.media_jornada : [],
    vacaciones_agosto: row.vacaciones_agosto ?? true,
  }
}

// Retorna { 1: 144, 2: 160, ..., 12: 108 } con las horas laborables de cada mes
export function calcularHorasLaborables(calendario, anio) {
  const safe = getCalendarioSafe(calendario, anio)
  const festSet = new Set(safe.festivos)
  const mediaSet = new Set(safe.media_jornada)
  const horasDia = Number(safe.horas_dia) || 8
  const result = {}
  for (let m = 1; m <= 12; m++) {
    let horas = 0
    const lastDay = new Date(anio, m, 0).getDate()
    for (let d = 1; d <= lastDay; d++) {
      const fecha = `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dt = new Date(fecha + 'T00:00:00')
      const dow = dt.getDay()
      if (dow < 1 || dow > 5) continue
      if (safe.vacaciones_agosto && m === 8) continue
      if (mediaSet.has(fecha)) horas += 4
      else if (!festSet.has(fecha)) horas += horasDia
    }
    result[m] = horas
  }
  return result
}

// Retorna { 1: 18, 2: 20, ... } con días laborables equivalentes por mes
// Un día de media jornada cuenta como 0,5.
export function calcularDiasLaborables(calendario, anio) {
  const horas = calcularHorasLaborables(calendario, anio)
  const horasDia = Number(getCalendarioSafe(calendario, anio).horas_dia) || 8
  const result = {}
  for (let m = 1; m <= 12; m++) {
    result[m] = horasDia > 0 ? +(horas[m] / horasDia).toFixed(2) : 0
  }
  return result
}

export const DEFAULT_CALENDARIO_SHAPE = DEFAULT_CALENDARIO

// Devuelve el calendario para un año, estimando si hace falta.
// Si no hay registro propio, usa el calendario del año más cercano disponible
// y cambia el prefijo de año en las fechas de festivos y media jornada.
// Marca el resultado con `_estimado: true` para que la UI pueda avisar.
export function obtenerCalendarioParaAño(calendarios, anio) {
  if (!calendarios || typeof calendarios !== 'object') return null
  if (calendarios[anio]) return calendarios[anio]

  const añosDisponibles = Object.keys(calendarios).map(Number).filter(a => !isNaN(a))
  if (añosDisponibles.length === 0) return null

  // Año más cercano al solicitado
  añosDisponibles.sort((a, b) => Math.abs(a - anio) - Math.abs(b - anio))
  const añoBase = añosDisponibles[0]
  const base = calendarios[añoBase]
  if (!base) return null

  const ajustarFecha = (f) => {
    if (!f || typeof f !== 'string' || f.length < 10) return f
    return `${anio}${f.substring(4)}`  // "2026-01-01" -> "2023-01-01"
  }

  return {
    ...base,
    anio,
    festivos: Array.isArray(base.festivos) ? base.festivos.map(ajustarFecha) : [],
    media_jornada: Array.isArray(base.media_jornada) ? base.media_jornada.map(ajustarFecha) : [],
    _estimado: true,
    _añoBase: añoBase
  }
}
