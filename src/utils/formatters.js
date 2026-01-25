// ============================================
// FORMATEADORES - FMV Dashboard v2.0
// ============================================

/**
 * Formatea un valor como moneda EUR
 */
export function formatCurrency(value, decimals = 0) {
  if (value == null || isNaN(value)) return '0 €'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formatea un valor como porcentaje
 */
export function formatPercent(value, decimals = 1) {
  if (value == null || isNaN(value) || !isFinite(value)) return '-'
  return `${value >= 0 ? '' : ''}${value.toFixed(decimals)}%`
}

/**
 * Formatea un número con separador de miles
 */
export function formatNumber(value, decimals = 0) {
  if (value == null || isNaN(value)) return '0'
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * Formato compacto para cifras grandes (1.2M, 350K)
 */
export function formatCompact(value) {
  if (value == null || isNaN(value)) return '0 €'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1000000) {
    return `${sign}${(abs / 1000000).toFixed(1)}M €`
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(0)}K €`
  }
  return formatCurrency(value, 0)
}

/**
 * Formatea fecha para mostrar
 */
export function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Convierte mes-key (2025-01) a nombre
 */
export function mesKeyToNombre(mesKey, short = false) {
  const [year, month] = mesKey.split('-')
  const meses = short
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return meses[parseInt(month) - 1] || mesKey
}

/**
 * Devuelve clase CSS según valor positivo/negativo
 */
export function getValueClass(value, inverse = false) {
  if (value == null || value === 0) return 'text-gray-600'
  const isPositive = inverse ? value < 0 : value > 0
  return isPositive ? 'text-green-600' : 'text-red-600'
}

/**
 * Devuelve color HEX según valor
 */
export function getValueColor(value, inverse = false) {
  if (value == null || value === 0) return '#6b7280'
  const isPositive = inverse ? value < 0 : value > 0
  return isPositive ? '#22c55e' : '#ef4444'
}

/**
 * Calcula variación porcentual
 */
export function calcVariacion(actual, anterior) {
  if (!anterior || anterior === 0) return null
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

/**
 * Formatea variación con flecha
 */
export function formatVariacion(actual, anterior) {
  const variacion = calcVariacion(actual, anterior)
  if (variacion === null) return '-'
  const arrow = variacion >= 0 ? '↑' : '↓'
  const color = variacion >= 0 ? 'text-green-600' : 'text-red-600'
  return { text: `${arrow} ${Math.abs(variacion).toFixed(1)}%`, color, value: variacion }
}
