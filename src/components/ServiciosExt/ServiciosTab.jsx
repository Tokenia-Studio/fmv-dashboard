// ============================================
// SERVICIOS TAB - Pestaña Servicios Exteriores
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import BarrasApiladas from './BarrasApiladas'
import LineasSubcuentas from './LineasSubcuentas'
import { formatCurrency } from '../../utils/formatters'

export default function ServiciosTab() {
  const { serviciosExt, añoActual, totalesPyG } = useData()

  const totalServicios = serviciosExt.subcuentas.reduce((sum, s) => sum + s.total, 0)
  const top3 = serviciosExt.subcuentas.slice(0, 3)

  if (serviciosExt.subcuentas.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔧</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos de Servicios Exteriores</h2>
        <p className="text-gray-500">Carga un diario contable con cuentas del grupo 62x</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Total Servicios Ext."
          valor={totalServicios}
          icono="🔧"
          colorValor="text-blue-600"
        />
        {top3.map((sub, idx) => (
          <KPICard
            key={sub.codigo}
            titulo={sub.nombre}
            valor={sub.total}
            subtitulo={`${((sub.total / totalServicios) * 100).toFixed(1)}% del total`}
            icono={['🏠', '🔩', '🚚'][idx]}
            colorValor="text-gray-700"
          />
        ))}
      </div>

      {/* Gráfico de barras apiladas */}
      <BarrasApiladas
        datos={serviciosExt.porMes}
        subcuentas={serviciosExt.subcuentas}
        año={añoActual}
      />

      {/* Gráfico de líneas por subcuenta */}
      <LineasSubcuentas
        subcuentas={serviciosExt.subcuentas}
        año={añoActual}
      />

      {/* Tabla detalle */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📑</span>
            <span>Detalle por Subcuenta</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="p-3 text-left">Cuenta</th>
                <th className="p-3 text-left">Descripción</th>
                <th className="p-3 text-right">Total {añoActual}</th>
                <th className="p-3 text-right">% Total</th>
                <th className="p-3 text-right">% s/Ventas</th>
              </tr>
            </thead>
            <tbody>
              {serviciosExt.subcuentas.map(sub => (
                <tr key={sub.codigo} className="table-row">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: sub.color }}
                      />
                      <span className="font-mono text-gray-600">{sub.codigo}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{sub.nombre}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(sub.total)}</td>
                  <td className="p-3 text-right text-gray-600">
                    {((sub.total / totalServicios) * 100).toFixed(1)}%
                  </td>
                  <td className="p-3 text-right text-gray-600">
                    {totalesPyG.ventas ? ((sub.total / totalesPyG.ventas) * 100).toFixed(2) : '-'}%
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-slate-100 font-bold">
                <td className="p-3" colSpan={2}>TOTAL</td>
                <td className="p-3 text-right">{formatCurrency(totalServicios)}</td>
                <td className="p-3 text-right">100%</td>
                <td className="p-3 text-right">
                  {totalesPyG.ventas ? ((totalServicios / totalesPyG.ventas) * 100).toFixed(2) : '-'}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
