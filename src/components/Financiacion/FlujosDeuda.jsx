// ============================================
// FLUJOS DEUDA - Nueva financiación vs amortización mensual
// ============================================

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { formatCompact } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import CustomTooltip from '../UI/CustomTooltip'

export default function FlujosDeuda({ datos, año }) {
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`
    const datosMes = datos.find(d => d.mes === mesKey) || {}

    return {
      mes: mesNombre,
      'Financiación nueva': datosMes.nuevaFinanciacion || 0,
      'Amortización': -(datosMes.amortizacion || 0)
    }
  })

  const hayFlujos = datosGrafico.some(d => d['Financiación nueva'] !== 0 || d['Amortización'] !== 0)
  if (!hayFlujos) return null

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>🔁</span>
          <span>Préstamos: lo que entra vs lo que se devuelve</span>
        </h3>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
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
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />

            <Bar dataKey="Financiación nueva" stackId="flujo" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Amortización" stackId="flujo" fill="#ef4444" radius={[0, 0, 3, 3]} />
          </BarChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 text-center mt-2">
          Verde: préstamos recibidos · Rojo: cuotas devueltas al banco (sin contar traspasos internos L/P→C/P)
        </p>
      </div>
    </div>
  )
}
