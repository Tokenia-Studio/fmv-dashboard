// ============================================
// LINEAS SUBCUENTAS - Evolución por cuenta 3 díg
// ============================================

import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'

export default function LineasSubcuentas({ subcuentas, año }) {
  const { exportarMovimientos } = useData()

  // Estado para subcuentas visibles (por defecto top 6)
  const [visibles, setVisibles] = useState(
    subcuentas.slice(0, 6).map(s => s.codigo)
  )

  // Preparar datos
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`

    const resultado = { mes: mesNombre, mesKey }

    subcuentas.forEach(sub => {
      resultado[sub.codigo] = sub.meses[mesKey] || 0
    })

    return resultado
  })

  // Toggle visibilidad
  const toggleSubcuenta = (codigo) => {
    setVisibles(prev =>
      prev.includes(codigo)
        ? prev.filter(c => c !== codigo)
        : [...prev, codigo]
    )
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="custom-tooltip">
        <p className="font-semibold text-gray-800 mb-2">{label} {año}</p>
        <div className="space-y-1">
          {payload
            .filter(p => p.value !== 0)
            .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
            .map((entry, index) => {
              const sub = subcuentas.find(s => s.codigo === entry.dataKey)
              return (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600">{sub?.nombre || entry.dataKey}</span>
                  </div>
                  <span className="font-medium" style={{ color: entry.color }}>
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  // Click en punto para exportar
  const handleClick = (data, subcuenta) => {
    if (!data?.mesKey) return
    const nombreMes = mesKeyToNombre(data.mesKey)
    exportarMovimientos(
      (m) => m.mes === data.mesKey && m.subcuenta === subcuenta,
      `Servicios_${subcuenta}_${nombreMes}_${año}`
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📈</span>
          <span>Evolución por Subcuenta</span>
        </h3>
      </div>

      <div className="p-4">
        {/* Selector de subcuentas */}
        <div className="flex flex-wrap gap-2 mb-4">
          {subcuentas.map(sub => (
            <button
              key={sub.codigo}
              onClick={() => toggleSubcuenta(sub.codigo)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all
                         flex items-center gap-1.5
                         ${visibles.includes(sub.codigo)
                           ? 'text-white shadow-sm'
                           : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              style={{
                backgroundColor: visibles.includes(sub.codigo) ? sub.color : undefined
              }}
            >
              <span>{sub.codigo}</span>
              <span className="hidden sm:inline">- {sub.nombre}</span>
            </button>
          ))}
        </div>

        {/* Gráfico */}
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
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => {
                const sub = subcuentas.find(s => s.codigo === value)
                return <span className="text-gray-600">{sub?.nombre || value}</span>
              }}
            />

            {subcuentas
              .filter(sub => visibles.includes(sub.codigo))
              .map((sub) => (
                <Line
                  key={sub.codigo}
                  type="monotone"
                  dataKey={sub.codigo}
                  stroke={sub.color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: sub.color, cursor: 'pointer' }}
                  activeDot={{
                    r: 6,
                    onClick: (_, payload) => handleClick(payload.payload, sub.codigo)
                  }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 text-center mt-2">
          Click en los botones para mostrar/ocultar series. Click en un punto para exportar.
        </p>
      </div>
    </div>
  )
}
