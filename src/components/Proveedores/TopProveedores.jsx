// ============================================
// TOP PROVEEDORES - Tabla de principales proveedores
// ============================================

import React from 'react'
import * as XLSX from 'xlsx'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatPercent } from '../../utils/formatters'
import ExportButton from '../UI/ExportButton'

export default function TopProveedores({ datos, totalPagos, año }) {
  const { exportarMovimientos } = useData()

  // Exportar extracto de gasto de un proveedor
  const exportarProveedor = (prov) => {
    exportarMovimientos(
      (m) => {
        const grupo2 = m.cuenta.substring(0, 2)
        return m.codProcedencia === prov.codigo &&
               m.mes.startsWith(String(año)) &&
               (grupo2 === '60' || grupo2 === '62')
      },
      `Gasto_${prov.nombre.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${año}`
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>🏆</span>
          <span>Top 15 Proveedores por Gasto</span>
        </h3>
        <ExportButton
          onClick={() => {
            const formatNum = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            const exportData = datos.map((p, idx) => ({
              Ranking: idx + 1,
              Codigo: p.codigo,
              Proveedor: p.nombre,
              'Compras': formatNum(p.compras || 0),
              'Servicios': formatNum(p.servicios || 0),
              'Total Gasto': formatNum(p.total),
              '% Total': ((p.total / totalPagos) * 100).toFixed(2) + '%',
              'Nº Facturas': p.numFacturas
            }))
            const ws = XLSX.utils.json_to_sheet(exportData)
            ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 12 }]
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Top Proveedores')
            XLSX.writeFile(wb, `Top_Proveedores_Gasto_${año}.xlsx`)
          }}
          label="Exportar"
          className="text-white bg-white/20 hover:bg-white/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="p-3 text-center w-12">#</th>
              <th className="p-3 text-left">Proveedor</th>
              <th className="p-3 text-right">Total Gasto</th>
              <th className="p-3 text-right">% Total</th>
              <th className="p-3 text-center">Nº Facturas</th>
              <th className="p-3 text-center w-24">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((prov, idx) => {
              const porcentaje = (prov.total / totalPagos) * 100

              return (
                <tr key={prov.codigo} className="table-row">
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                                    ${idx < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {idx + 1}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{prov.nombre}</div>
                    <div className="text-xs text-gray-500">Cód: {prov.codigo}</div>
                  </td>
                  <td className="p-3 text-right font-medium text-gray-800">
                    {formatCurrency(prov.total)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(porcentaje * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-gray-600 w-12 text-right">
                        {formatPercent(porcentaje)}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-gray-600">
                    {prov.numFacturas}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => exportarProveedor(prov)}
                      className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded
                                hover:bg-slate-200 transition-colors"
                    >
                      📥 Extracto
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-slate-100 font-bold">
              <td className="p-3" colSpan={2}>TOTAL TOP 15</td>
              <td className="p-3 text-right">
                {formatCurrency(datos.reduce((sum, p) => sum + p.total, 0))}
              </td>
              <td className="p-3 text-right">
                {formatPercent(datos.reduce((sum, p) => sum + (p.total / totalPagos) * 100, 0))}
              </td>
              <td className="p-3 text-center">
                {datos.reduce((sum, p) => sum + p.numFacturas, 0)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
