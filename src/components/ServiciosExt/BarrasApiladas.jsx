// ============================================
// BARRAS APILADAS - Servicios Ext. por familia
// ============================================

import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import ExportButton from '../UI/ExportButton'

export default function BarrasApiladas({ datos, subcuentas, año }) {
  const { exportarMovimientos } = useData()
  const [clickedSegment, setClickedSegment] = useState(null)

  // Preparar datos para el gráfico
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`
    const datosMes = datos.find(d => d.mes === mesKey) || {}

    const resultado = { mes: mesNombre, mesKey }

    subcuentas.forEach(sub => {
      resultado[sub.codigo] = datosMes[sub.codigo] || 0
    })

    resultado.total = Object.keys(datosMes)
      .filter(k => k !== 'mes' && k !== 'total')
      .reduce((sum, k) => sum + (datosMes[k] || 0), 0)

    return resultado
  })

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null

    const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)

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
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Total</span>
          <span className="font-bold text-gray-800">{formatCurrency(total)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">Click para exportar detalle</p>
      </div>
    )
  }

  // Handler de click
  const handleBarClick = (data, subcuenta) => {
    if (!data?.mesKey) return

    const nombreMes = mesKeyToNombre(data.mesKey)
    const subInfo = subcuentas.find(s => s.codigo === subcuenta)

    exportarMovimientos(
      (m) => m.mes === data.mesKey && m.subcuenta === subcuenta,
      `Servicios_${subcuenta}_${nombreMes}_${año}`
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📊</span>
          <span>Servicios Exteriores por Familia</span>
        </h3>
        <ExportButton
          onClick={() => exportarMovimientos(
            (m) => m.grupo === '62' && m.mes.startsWith(String(año)),
            `Servicios_Ext_${año}`
          )}
          label="Exportar todo"
          className="text-white bg-white/20 hover:bg-white/30"
        />
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={datosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => {
                const sub = subcuentas.find(s => s.codigo === value)
                return <span className="text-gray-600">{sub?.nombre || value}</span>
              }}
            />

            {subcuentas.slice(0, 8).map((sub) => (
              <Bar
                key={sub.codigo}
                dataKey={sub.codigo}
                stackId="a"
                fill={sub.color}
                cursor="pointer"
                onClick={(data) => handleBarClick(data, sub.codigo)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 text-center mt-2">
          Haz click en un segmento para exportar el detalle a Excel
        </p>
      </div>
    </div>
  )
}
