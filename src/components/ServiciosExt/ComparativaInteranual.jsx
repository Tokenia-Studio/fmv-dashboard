// ============================================
// COMPARATIVA INTERANUAL - Servicios Exteriores
// ============================================

import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useData } from '../../context/DataContext'
import { calcularServiciosExt } from '../../utils/calculations'
import { formatCurrency, formatCompact, formatPercent, calcVariacion } from '../../utils/formatters'
import { SERVICIOS_SUBCUENTAS, MONTHS_SHORT, CHART_COLORS } from '../../utils/constants'

export default function ComparativaInteranual() {
  const { movimientos, añoActual, serviciosExt } = useData()
  const [subcuentaSeleccionada, setSubcuentaSeleccionada] = useState('621')

  const añoAnterior = añoActual - 1

  // Calcular datos del año anterior
  const serviciosAnterior = useMemo(() => {
    return calcularServiciosExt(movimientos, añoAnterior)
  }, [movimientos, añoAnterior])

  // Verificar si hay datos del año anterior
  const tieneAnterior = serviciosAnterior.subcuentas.some(s => s.total !== 0)

  // Obtener datos de la subcuenta seleccionada
  const subcuentaActual = serviciosExt.subcuentas.find(s => s.codigo === subcuentaSeleccionada)
  const subcuentaAnteriorData = serviciosAnterior.subcuentas.find(s => s.codigo === subcuentaSeleccionada)

  // Color de la subcuenta
  const colorSubcuenta = SERVICIOS_SUBCUENTAS[subcuentaSeleccionada]?.color || '#3b82f6'

  // Preparar datos para el gráfico
  const datosComparativos = useMemo(() => {
    return MONTHS_SHORT.map((mes, idx) => {
      const mesNum = idx + 1
      const mesKeyActual = `${añoActual}-${String(mesNum).padStart(2, '0')}`
      const mesKeyAnterior = `${añoAnterior}-${String(mesNum).padStart(2, '0')}`

      const valorActual = subcuentaActual?.meses[mesKeyActual] || 0
      const valorAnterior = subcuentaAnteriorData?.meses[mesKeyAnterior] || 0

      return {
        mes,
        actual: valorActual,
        anterior: valorAnterior,
        variacion: calcVariacion(valorActual, valorAnterior)
      }
    })
  }, [subcuentaActual, subcuentaAnteriorData, añoActual, añoAnterior])

  // Tooltip personalizado
  const CustomTooltipInteranual = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null

    const actual = payload.find(p => p.dataKey === 'actual')?.value || 0
    const anterior = payload.find(p => p.dataKey === 'anterior')?.value || 0
    const variacion = calcVariacion(actual, anterior)

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">{añoActual}:</span>
            <span className="font-medium">{formatCurrency(actual)}</span>
          </div>
          {tieneAnterior && (
            <>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">{añoAnterior}:</span>
                <span className="font-medium text-gray-500">{formatCurrency(anterior)}</span>
              </div>
              {variacion !== null && (
                <div className={`flex justify-between gap-4 pt-1 border-t border-gray-100 ${variacion >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <span>Variacion:</span>
                  <span className="font-medium">
                    {variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📈</span>
          <span>Comparativa Interanual {añoActual} vs {añoAnterior}</span>
        </h3>
        {!tieneAnterior && (
          <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-1 rounded">
            Sin datos de {añoAnterior}
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Selector de subcuenta */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Subcuenta:</label>
          <select
            value={subcuentaSeleccionada}
            onChange={(e) => setSubcuentaSeleccionada(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.entries(SERVICIOS_SUBCUENTAS).map(([codigo, info]) => (
              <option key={codigo} value={codigo}>
                {codigo} - {info.name}
              </option>
            ))}
          </select>
          {subcuentaActual && (
            <span className="text-sm text-gray-500">
              Total {añoActual}: <span className="font-medium">{formatCurrency(subcuentaActual.total)}</span>
            </span>
          )}
        </div>

        {/* Gráfico */}
        <div className="bg-gray-50 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip content={<CustomTooltipInteranual />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => <span className="text-gray-600">{value}</span>}
              />

              {/* Línea año actual - continua */}
              <Line
                type="monotone"
                dataKey="actual"
                name={String(añoActual)}
                stroke={colorSubcuenta}
                strokeWidth={2.5}
                dot={{ r: 4, fill: colorSubcuenta }}
                activeDot={{ r: 6 }}
              />

              {/* Línea año anterior - discontinua */}
              {tieneAnterior && (
                <Line
                  type="monotone"
                  dataKey="anterior"
                  name={String(añoAnterior)}
                  stroke={colorSubcuenta}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                  dot={{ r: 3, fill: colorSubcuenta, fillOpacity: 0.5 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resumen de variación */}
        {tieneAnterior && subcuentaActual && subcuentaAnteriorData && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Total {añoActual}</p>
              <p className="font-semibold text-gray-800">{formatCurrency(subcuentaActual.total)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Total {añoAnterior}</p>
              <p className="font-semibold text-gray-500">{formatCurrency(subcuentaAnteriorData.total)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Variacion</p>
              {(() => {
                const var_ = calcVariacion(subcuentaActual.total, subcuentaAnteriorData.total)
                if (var_ === null) return <p className="font-semibold text-gray-500">-</p>
                return (
                  <p className={`font-semibold ${var_ >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {var_ >= 0 ? '+' : ''}{var_.toFixed(1)}%
                  </p>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
