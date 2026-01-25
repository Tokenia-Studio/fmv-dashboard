// ============================================
// EVOLUCION PAGOS - Gráfico de pagos mensuales
// ============================================

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import CustomTooltip from '../UI/CustomTooltip'
import ExportButton from '../UI/ExportButton'

export default function EvolucionPagos({ datos, año }) {
  const { exportarMovimientos } = useData()

  // Preparar datos
  const datosGrafico = MONTHS_SHORT.map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`
    const datosMes = datos.find(d => d.mes === mesKey) || {}

    return {
      mes: mesNombre,
      mesKey,
      'Gasto': datosMes.pagos || 0
    }
  })

  // Click para exportar
  const handleClick = (data) => {
    if (!data?.mesKey) return
    const nombreMes = mesKeyToNombre(data.mesKey)

    exportarMovimientos(
      (m) => {
        const grupo2 = m.cuenta.substring(0, 2)
        return m.mes === data.mesKey &&
               (grupo2 === '60' || grupo2 === '62') &&
               (m.debe - m.haber) > 0
      },
      `Gasto_Proveedores_${nombreMes}_${año}`
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📊</span>
          <span>Evolución Gasto por Proveedor</span>
        </h3>
        <ExportButton
          onClick={() => exportarMovimientos(
            (m) => {
              const grupo2 = m.cuenta.substring(0, 2)
              return m.mes.startsWith(String(año)) &&
                     (grupo2 === '60' || grupo2 === '62') &&
                     (m.debe - m.haber) > 0
            },
            `Gasto_Proveedores_${año}`
          )}
          label="Exportar"
          className="text-white bg-white/20 hover:bg-white/30"
        />
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={datosGrafico}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
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

            <Bar
              dataKey="Gasto"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              onClick={handleClick}
            />
          </BarChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 text-center mt-2">
          Click en una barra para exportar el detalle de gasto del mes
        </p>
      </div>
    </div>
  )
}
