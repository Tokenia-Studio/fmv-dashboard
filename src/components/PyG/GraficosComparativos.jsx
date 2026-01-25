// ============================================
// GRAFICOS COMPARATIVOS - Año actual vs anterior
// ============================================

import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useData } from '../../context/DataContext'
import { calcularPyG } from '../../utils/calculations'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { CHART_COLORS, MONTHS_SHORT } from '../../utils/constants'
import CustomTooltip from '../UI/CustomTooltip'

export default function GraficosComparativos() {
  const { movimientos, añoActual } = useData()

  const añoAnterior = añoActual - 1

  // Calcular datos de ambos años
  const datosActual = calcularPyG(movimientos, añoActual)
  const datosAnterior = calcularPyG(movimientos, añoAnterior)

  // Combinar para gráficos
  const datosComparativos = MONTHS_SHORT.map((mes, idx) => {
    const mesNum = idx + 1
    const actual = datosActual.find(d => parseInt(d.mes.split('-')[1]) === mesNum) || {}
    const anterior = datosAnterior.find(d => parseInt(d.mes.split('-')[1]) === mesNum) || {}

    return {
      mes,
      ventasActual: actual.ventas || 0,
      ventasAnterior: anterior.ventas || 0,
      comprasActual: actual.compras || 0,
      comprasAnterior: anterior.compras || 0,
      serviciosActual: actual.servicios || 0,
      serviciosAnterior: anterior.servicios || 0,
      personalActual: actual.personal || 0,
      personalAnterior: anterior.personal || 0
    }
  })

  const tieneAnterior = datosAnterior.some(d => d.ventas !== 0)

  const graficos = [
    {
      titulo: 'Ventas',
      icon: '💰',
      keyActual: 'ventasActual',
      keyAnterior: 'ventasAnterior',
      color: CHART_COLORS.ventas
    },
    {
      titulo: 'Compras',
      icon: '🛒',
      keyActual: 'comprasActual',
      keyAnterior: 'comprasAnterior',
      color: CHART_COLORS.compras
    },
    {
      titulo: 'Servicios Ext.',
      icon: '🔧',
      keyActual: 'serviciosActual',
      keyAnterior: 'serviciosAnterior',
      color: CHART_COLORS.servicios
    },
    {
      titulo: 'Personal',
      icon: '👥',
      keyActual: 'personalActual',
      keyAnterior: 'personalAnterior',
      color: CHART_COLORS.personal
    }
  ]

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📈</span>
          <span>Evolución Mensual {añoActual} vs {añoAnterior}</span>
        </h3>
        {!tieneAnterior && (
          <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded">
            Sin datos de {añoAnterior}
          </span>
        )}
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {graficos.map(grafico => (
          <div key={grafico.titulo} className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>{grafico.icon}</span>
              {grafico.titulo}
            </h4>

            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={datosComparativos}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(val) => formatCompact(val).replace(' €', '')}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-gray-600">{value}</span>}
                />

                <Line
                  type="monotone"
                  dataKey={grafico.keyActual}
                  name={String(añoActual)}
                  stroke={grafico.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: grafico.color }}
                  activeDot={{ r: 6 }}
                />

                {tieneAnterior && (
                  <Line
                    type="monotone"
                    dataKey={grafico.keyAnterior}
                    name={String(añoAnterior)}
                    stroke={CHART_COLORS.anterior}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 3, fill: CHART_COLORS.anterior }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  )
}
