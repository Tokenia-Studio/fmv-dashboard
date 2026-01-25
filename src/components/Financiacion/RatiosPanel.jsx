// ============================================
// RATIOS PANEL - Panel de ratios financieros
// ============================================

import React from 'react'
import { formatNumber, formatPercent } from '../../utils/formatters'
import { THRESHOLDS } from '../../utils/constants'

export default function RatiosPanel({ ratios, kpis }) {
  const getEstadoSemaforo = (valor, umbral, inverso = false) => {
    if (valor === null || valor === undefined) return { color: 'gray', icon: '⚪' }

    if (inverso) {
      // Menor es mejor (ej: Deuda/EBITDA)
      if (valor <= umbral.warning) return { color: 'green', icon: '🟢' }
      if (valor <= umbral.danger) return { color: 'yellow', icon: '🟡' }
      return { color: 'red', icon: '🔴' }
    } else {
      // Mayor es mejor (ej: Cobertura intereses)
      if (valor >= umbral.warning) return { color: 'green', icon: '🟢' }
      if (valor >= umbral.danger) return { color: 'yellow', icon: '🟡' }
      return { color: 'red', icon: '🔴' }
    }
  }

  const ratiosConfig = [
    {
      label: 'Deuda / EBITDA',
      valor: ratios.deudaEbitda,
      formato: (v) => v !== null ? `${formatNumber(v, 2)}x` : '-',
      descripcion: 'Años necesarios para pagar la deuda total con el beneficio operativo. Ideal < 3x',
      umbral: THRESHOLDS.deudaEbitda,
      inverso: true
    },
    {
      label: 'Cobertura de Intereses',
      valor: ratios.coberturaIntereses,
      formato: (v) => v !== null ? `${formatNumber(v, 2)}x` : '-',
      descripcion: 'Veces que el EBITDA cubre los gastos financieros. Ideal > 3x',
      umbral: THRESHOLDS.coberturaIntereses,
      inverso: false
    },
    {
      label: 'Coste Medio Deuda',
      valor: ratios.costeMedioDeuda,
      formato: (v) => v !== null ? formatPercent(v) : '-',
      descripcion: 'Tipo de interés efectivo que se paga por la deuda. Ideal < 5%',
      umbral: { warning: 5, danger: 8 },
      inverso: true
    }
  ]

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📊</span>
          <span>Ratios de Apalancamiento</span>
        </h3>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ratiosConfig.map((ratio) => {
            const estado = getEstadoSemaforo(ratio.valor, ratio.umbral, ratio.inverso)

            return (
              <div
                key={ratio.label}
                className={`p-4 rounded-lg border-2 transition-all
                           ${estado.color === 'green' ? 'bg-green-50 border-green-200' :
                             estado.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                             estado.color === 'red' ? 'bg-red-50 border-red-200' :
                             'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{ratio.label}</span>
                  <span className="text-xl">{estado.icon}</span>
                </div>

                <div className={`text-2xl font-bold mb-1
                                ${estado.color === 'green' ? 'text-green-700' :
                                  estado.color === 'yellow' ? 'text-yellow-700' :
                                  estado.color === 'red' ? 'text-red-700' :
                                  'text-gray-700'}`}>
                  {ratio.formato(ratio.valor)}
                </div>

                <p className="text-xs text-gray-500">{ratio.descripcion}</p>
              </div>
            )
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">🟢 Saludable</span>
          <span className="flex items-center gap-1">🟡 Atención</span>
          <span className="flex items-center gap-1">🔴 Riesgo</span>
        </div>
      </div>
    </div>
  )
}
