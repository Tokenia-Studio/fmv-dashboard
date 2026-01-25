// ============================================
// EVOLUCION DEUDA - Gráfico de deuda mensual
// ============================================

import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { CHART_COLORS, MONTHS_SHORT } from '../../utils/constants'
import CustomTooltip from '../UI/CustomTooltip'

export default function EvolucionDeuda({ datos, año }) {
  // Preparar datos
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`
    const datosMes = datos.find(d => d.mes === mesKey) || {}

    return {
      mes: mesNombre,
      mesKey,
      'Corto Plazo': datosMes.deudaCorto || 0,
      'Largo Plazo': datosMes.deudaLargo || 0,
      'Total': datosMes.deudaTotal || 0,
      'Tesorería': datosMes.tesoreria || 0
    }
  })

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📈</span>
          <span>Evolución de la Deuda</span>
        </h3>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={datosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(val) => formatCompact(val).replace(' €', '')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

            <Line
              type="monotone"
              dataKey="Corto Plazo"
              stroke={CHART_COLORS.deudaCorto}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Largo Plazo"
              stroke={CHART_COLORS.deudaLargo}
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Total"
              stroke={CHART_COLORS.deudaTotal}
              strokeWidth={3}
              dot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Tesorería"
              stroke={CHART_COLORS.tesoreria}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
