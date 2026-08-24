// ============================================
// RESUMEN MENSUAL - Tabla resumen del Dashboard
// ============================================

import React from 'react'
import { formatCurrency, mesKeyToNombre, getValueClass } from '../../utils/formatters'

export default function ResumenMensual({ datos, totales }) {
  const columnas = [
    { key: 'ventas', label: 'Ventas', color: 'text-green-700' },
    { key: 'compras', label: 'Compras', color: 'text-red-700' },
    { key: 'varExist', label: 'Var.Exist.', color: 'text-orange-700' },
    { key: 'servicios', label: 'Servicios', color: 'text-blue-700' },
    { key: 'personal', label: 'Personal', color: 'text-purple-700' },
    { key: 'resto', label: 'Resto', color: 'text-gray-600', calc: (m) =>
      (m.restoGastos || 0) + (m.amortizaciones || 0) + (m.gastosFinancieros || 0) -
      (m.subvenciones || 0) - (m.otrosIngExplot || 0) - (m.ingExcepc || 0) - (m.ingFinancieros || 0) - (m.otrosIngresos || 0)
    },
    { key: 'resultado', label: 'Resultado', color: 'text-slate-800', bold: true }
  ]

  const getValor = (mes, col) => {
    if (col.calc) return col.calc(mes)
    return mes[col.key] || 0
  }

  const getTotalValor = (col) => {
    if (col.calc) return datos.reduce((sum, m) => sum + col.calc(m), 0)
    return totales[col.key] || 0
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white">Resumen Mensual</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="p-3 text-left">Mes</th>
              {columnas.map(col => (
                <th key={col.key} className={`p-3 text-right ${col.color}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((mes) => (
              <tr key={mes.mes} className="table-row">
                <td className="p-3 font-medium text-gray-800">
                  {mesKeyToNombre(mes.mes)}
                </td>
                {columnas.map(col => {
                  const valor = getValor(mes, col)
                  return (
                    <td
                      key={col.key}
                      className={`p-3 text-right ${col.bold ? 'font-bold' : ''}
                                ${col.key === 'resultado' ? getValueClass(valor) : col.color}`}
                    >
                      {formatCurrency(valor)}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Fila de totales */}
            <tr className="border-t-2 border-gray-300 bg-slate-100 font-bold">
              <td className="p-3 text-slate-800">TOTAL</td>
              {columnas.map(col => {
                const valor = getTotalValor(col)
                return (
                  <td
                    key={col.key}
                    className={`p-3 text-right ${col.key === 'resultado' ? getValueClass(valor) : col.color}`}
                  >
                    {formatCurrency(valor)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
