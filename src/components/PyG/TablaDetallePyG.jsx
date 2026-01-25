// ============================================
// TABLA DETALLE PYG - PyG analítico completo
// ============================================

import React from 'react'
import { formatCurrency, formatPercent, mesKeyToNombre, getValueClass } from '../../utils/formatters'

export default function TablaDetallePyG({ datos, totales }) {
  // Estructura del PyG
  const filas = [
    { id: 'ventas', label: 'VENTAS', icon: '💰', type: 'header', key: 'ventas' },
    { id: 'compras', label: '(-) Compras', key: 'compras', indent: true, negative: true },
    { id: 'varExist', label: '(±) Var. existencias', key: 'varExist', indent: true },
    { id: 'margenBruto', label: 'MARGEN BRUTO', icon: '📊', type: 'subtotal', key: 'margenBruto' },
    { id: 'servicios', label: '(-) Servicios ext.', key: 'servicios', indent: true, negative: true },
    { id: 'personal', label: '(-) Personal', key: 'personal', indent: true, negative: true },
    { id: 'subvenciones', label: '(+) Subvenciones', key: 'subvenciones', indent: true, optional: true },
    { id: 'otrosIngExplot', label: '(+) Otros ing. explot.', key: 'otrosIngExplot', indent: true, optional: true },
    { id: 'ebitda', label: 'EBITDA', icon: '💹', type: 'subtotal', key: 'ebitda' },
    { id: 'restoGastos', label: '(-) Resto gastos', key: 'restoGastos', indent: true, negative: true },
    { id: 'amortizaciones', label: '(-) Amortizaciones', key: 'amortizaciones', indent: true, negative: true },
    { id: 'gastosFinancieros', label: '(-) Gastos financieros', key: 'gastosFinancieros', indent: true, negative: true },
    { id: 'ingExcepc', label: '(+) Ing. excepcionales', key: 'ingExcepc', indent: true, optional: true },
    { id: 'resultado', label: 'RESULTADO', icon: '📈', type: 'total', key: 'resultado' }
  ]

  // Filtrar filas opcionales sin datos
  const filasVisibles = filas.filter(f => {
    if (!f.optional) return true
    return totales[f.key] !== 0
  })

  const getValor = (mes, fila) => {
    const valor = mes[fila.key] || 0
    return fila.negative ? -valor : valor
  }

  const getTotalValor = (fila) => {
    const valor = totales[fila.key] || 0
    return fila.negative ? -valor : valor
  }

  const getPorcentaje = (valor, ventas) => {
    if (!ventas || ventas === 0) return null
    return (valor / ventas) * 100
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📋</span>
          <span>PyG Analítico</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="p-3 text-left min-w-[200px]">Concepto</th>
              {datos.map(m => (
                <th key={m.mes} className="p-3 text-right min-w-[100px]">
                  {mesKeyToNombre(m.mes, true)}
                </th>
              ))}
              <th className="p-3 text-right min-w-[120px] bg-slate-200">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map(fila => {
              const isHeader = fila.type === 'header'
              const isSubtotal = fila.type === 'subtotal'
              const isTotal = fila.type === 'total'

              return (
                <tr
                  key={fila.id}
                  className={`
                    ${isHeader ? 'bg-green-50 font-semibold' : ''}
                    ${isSubtotal ? 'subtotal-row font-semibold border-t-2 border-blue-200' : ''}
                    ${isTotal ? 'total-row text-base' : ''}
                    ${!isHeader && !isSubtotal && !isTotal ? 'hover:bg-gray-50' : ''}
                  `}
                >
                  <td className={`p-3 ${fila.indent ? 'pl-6' : ''} ${isTotal ? 'py-4' : ''}`}>
                    {fila.icon && <span className="mr-2">{fila.icon}</span>}
                    {fila.label}
                  </td>

                  {datos.map(mes => {
                    const valor = getValor(mes, fila)
                    const pct = getPorcentaje(mes[fila.key], mes.ventas)

                    return (
                      <td key={mes.mes} className="p-3 text-right">
                        <div className={`${isSubtotal || isTotal ? getValueClass(valor) : ''}`}>
                          {formatCurrency(valor)}
                        </div>
                        {(isSubtotal || isTotal) && pct !== null && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatPercent(pct)}
                          </div>
                        )}
                      </td>
                    )
                  })}

                  <td className={`p-3 text-right bg-slate-100 ${isTotal ? 'bg-slate-700' : ''}`}>
                    <div className={`font-bold ${isTotal ? '' : getValueClass(getTotalValor(fila))}`}>
                      {formatCurrency(getTotalValor(fila))}
                    </div>
                    {(isSubtotal || isTotal) && (
                      <div className={`text-xs mt-0.5 ${isTotal ? 'text-slate-300' : 'text-gray-500'}`}>
                        {formatPercent(getPorcentaje(totales[fila.key], totales.ventas))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
