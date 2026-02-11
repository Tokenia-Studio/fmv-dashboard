// ============================================
// KPI CARD - Componente de tarjeta KPI
// ============================================

import React from 'react'
import { formatCurrency, formatPercent, getValueClass } from '../../utils/formatters'

export default function KPICard({
  titulo,
  valor,
  subtitulo,
  icono,
  formato = 'currency',
  colorValor,
  variacion,
  className = ''
}) {
  const formatearValor = (val) => {
    if (formato === 'currency') return formatCurrency(val)
    if (formato === 'percent') return formatPercent(val)
    if (formato === 'number') return val != null ? val.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
    if (formato === 'raw') return val != null ? val.toLocaleString('es-ES') : '-'
    return val
  }

  const claseColor = colorValor || getValueClass(valor)

  return (
    <div className={`kpi-card ${className}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {titulo}
        </span>
        {icono && <span className="text-xl">{icono}</span>}
      </div>

      <div className={`text-2xl font-bold ${claseColor}`}>
        {formatearValor(valor)}
      </div>

      {subtitulo && (
        <div className="text-xs text-gray-500 mt-1">
          {subtitulo}
        </div>
      )}

      {variacion && (
        <div className={`text-xs mt-2 ${variacion.color}`}>
          {variacion.text}
        </div>
      )}
    </div>
  )
}
