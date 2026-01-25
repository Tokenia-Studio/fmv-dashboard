// ============================================
// CASHFLOW TAB - Pestaña Flujo de Efectivo
// ============================================

import React from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import { formatCurrency, formatCompact, mesKeyToNombre, getValueClass } from '../../utils/formatters'
import { MONTHS_SHORT, CHART_COLORS } from '../../utils/constants'
import CustomTooltip from '../UI/CustomTooltip'
import ExportButton from '../UI/ExportButton'

export default function CashFlowTab() {
  const { cashFlow, añoActual, exportarMovimientos } = useData()
  const { meses, kpis } = cashFlow

  // Preparar datos
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${añoActual}-${String(mesNum).padStart(2, '0')}`
    const datosMes = meses.find(m => m.mes === mesKey) || {}

    return {
      mes: mesNombre,
      mesKey,
      'Saldo': datosMes.saldo || 0,
      'Variación': datosMes.variacion || 0
    }
  })

  const tieneDatos = meses.some(m => m.saldo !== 0 || m.variacion !== 0)

  if (!tieneDatos) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">💰</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos de Tesorería</h2>
        <p className="text-gray-500">No se encontraron movimientos en cuentas de tesorería (57x)</p>
      </div>
    )
  }

  // Click para exportar
  const handleClick = (data) => {
    if (!data?.mesKey) return
    const nombreMes = mesKeyToNombre(data.mesKey)

    exportarMovimientos(
      (m) => m.mes === data.mesKey && m.grupo === '57',
      `Tesoreria_${nombreMes}_${añoActual}`
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard
          titulo="Saldo Actual"
          valor={kpis.saldoActual}
          subtitulo="Dinero disponible en bancos"
          icono="💰"
          colorValor="text-green-600"
        />
        <KPICard
          titulo="Variación Mes"
          valor={kpis.variacionMes}
          subtitulo="Cambio respecto al mes anterior"
          icono="📊"
        />
        <KPICard
          titulo="Variación YTD"
          valor={kpis.variacionYTD}
          subtitulo="Cambio acumulado desde enero"
          icono="📈"
        />
      </div>

      {/* Gráfico de saldo */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📈</span>
            <span>Evolución de Tesorería</span>
          </h3>
          <ExportButton
            onClick={() => exportarMovimientos(
              (m) => m.grupo === '57' && m.mes.startsWith(String(añoActual)),
              `Tesoreria_${añoActual}`
            )}
            label="Exportar"
            className="text-white bg-white/20 hover:bg-white/30"
          />
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
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

              <Line
                type="monotone"
                dataKey="Saldo"
                stroke={CHART_COLORS.tesoreria}
                strokeWidth={3}
                dot={{ r: 5, fill: CHART_COLORS.tesoreria, cursor: 'pointer' }}
                activeDot={{ r: 7, onClick: (_, payload) => handleClick(payload.payload) }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de variación */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>Variación Mensual de Caja</span>
          </h3>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
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
              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />

              <Bar
                dataKey="Variación"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={handleClick}
              >
                {datosGrafico.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry['Variación'] >= 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <p className="text-xs text-gray-500 text-center mt-2">
            Click en una barra para exportar los movimientos del mes
          </p>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>Detalle Mensual</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="p-3 text-left">Mes</th>
                <th className="p-3 text-right">Saldo Fin Mes</th>
                <th className="p-3 text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              {meses.filter(m => m.saldo !== 0 || m.variacion !== 0).map((mes) => (
                <tr key={mes.mes} className="table-row">
                  <td className="p-3 font-medium">{mesKeyToNombre(mes.mes)}</td>
                  <td className="p-3 text-right font-medium text-gray-800">
                    {formatCurrency(mes.saldo)}
                  </td>
                  <td className={`p-3 text-right font-medium ${getValueClass(mes.variacion)}`}>
                    {mes.variacion >= 0 ? '+' : ''}{formatCurrency(mes.variacion)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
