// ============================================
// TABLA PRESUPUESTO COMPRAS - Solo grupos 60 y 62
// Con columnas: Ppto | Real | Albaranes Ptes | Pedidos Ptes | Total Est. | Desv.
// ============================================

import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatExcelNumber } from '../../utils/formatters'
import { MONTHS_SHORT, ACCOUNT_GROUPS_3 } from '../../utils/constants'
import { calcularPresupuestoCompras } from '../../utils/calculations'
import ExportButton from '../UI/ExportButton'

export default function TablaPresupuestoCompras({ mesSeleccionado, onMesChange, año }) {
  const { presupuestos, pyg3Digitos, albaranesFacturas, pedidosCompra, movimientos } = useData()
  const [expanded, setExpanded] = useState(new Set())

  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Calculate presupuesto compras data
  const datosCompras = useMemo(() => {
    return calcularPresupuestoCompras(pyg3Digitos, presupuestos, albaranesFacturas, pedidosCompra, mesSeleccionado)
  }, [pyg3Digitos, presupuestos, albaranesFacturas, pedidosCompra, mesSeleccionado])

  // Group by grupo2 (60, 62)
  const grupos = useMemo(() => {
    const g60 = [], g62 = []
    Object.values(datosCompras).forEach(d => {
      if (d.grupo2 === '60') g60.push(d)
      else if (d.grupo2 === '62') g62.push(d)
    })
    g60.sort((a, b) => a.cuenta3.localeCompare(b.cuenta3))
    g62.sort((a, b) => a.cuenta3.localeCompare(b.cuenta3))
    return { '60': g60, '62': g62 }
  }, [datosCompras])

  // Totals per grupo
  const totalGrupo = (cuentas) => {
    return cuentas.reduce((acc, d) => ({
      presMes: acc.presMes + d.presMes,
      realMes: acc.realMes + d.realMes,
      albMes: acc.albMes + d.albMes,
      pedMes: acc.pedMes + d.pedMes,
      totalEstMes: acc.totalEstMes + d.totalEstMes,
      presAcum: acc.presAcum + d.presAcum,
      totalEstAcum: acc.totalEstAcum + d.totalEstAcum
    }), { presMes: 0, realMes: 0, albMes: 0, pedMes: 0, totalEstMes: 0, presAcum: 0, totalEstAcum: 0 })
  }

  const calcDesv = (est, pres) => pres !== 0 ? ((est - pres) / Math.abs(pres)) * 100 : null

  const formatVar = (valor) => {
    if (valor === null || valor === undefined) return <span className="text-gray-400">-</span>
    const color = valor <= 0 ? 'text-green-600' : 'text-red-600'
    return <span className={color}>{valor >= 0 ? '+' : ''}{valor.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
  }

  // Build subcuentas (9 dígitos) for drill-down under a 3-digit account
  const getSubcuentas9 = (cuenta3) => {
    const result = {}
    movimientos.forEach(mov => {
      if (!mov.mes.startsWith(String(año))) return
      const c3 = mov.cuenta.substring(0, 3)
      if (c3 !== cuenta3) return
      const sub = mov.cuenta
      if (!result[sub]) result[sub] = { meses: {} }
      const m = parseInt(mov.mes.split('-')[1])
      const neto = mov.debe - mov.haber
      if (!result[sub].meses[m]) result[sub].meses[m] = 0
      result[sub].meses[m] += neto
    })
    // Sum for selected month range
    return Object.entries(result).map(([cuenta, d]) => {
      let realMes = d.meses[mesSeleccionado] || 0
      let realAcum = 0
      for (let m = 1; m <= mesSeleccionado; m++) realAcum += d.meses[m] || 0
      return { cuenta, realMes, realAcum }
    }).filter(s => s.realMes !== 0 || s.realAcum !== 0).sort((a, b) => a.cuenta.localeCompare(b.cuenta))
  }

  // Render grupo section
  const renderGrupo = (grupoId, label, icon, cuentas) => {
    const tot = totalGrupo(cuentas)
    const desvMes = calcDesv(tot.totalEstMes, tot.presMes)
    const desvAcum = calcDesv(tot.totalEstAcum, tot.presAcum)
    const grupoKey = `g-${grupoId}`
    const isExpanded = expanded.has(grupoKey)

    const rows = []

    // Header row
    rows.push(
      <tr
        key={grupoKey}
        className="bg-blue-50 font-semibold cursor-pointer select-none hover:bg-blue-100"
        onClick={() => toggleExpand(grupoKey)}
      >
        <td className="p-3">
          <span className="flex items-center gap-1">
            <span className="text-xs text-gray-400 w-4 inline-block">{isExpanded ? '\u25BC' : '\u25B6'}</span>
            <span className="mr-1">{icon}</span>
            {label}
          </span>
        </td>
        <td className="p-3 text-right text-gray-600">{formatCurrency(tot.presMes)}</td>
        <td className="p-3 text-right font-medium">{formatCurrency(tot.realMes)}</td>
        <td className="p-3 text-right">{formatCurrency(tot.albMes)}</td>
        <td className="p-3 text-right">{formatCurrency(tot.pedMes)}</td>
        <td className="p-3 text-right font-medium">{formatCurrency(tot.totalEstMes)}</td>
        <td className="p-3 text-right">{formatVar(desvMes)}</td>
        <td className="p-3 text-right bg-slate-50 text-gray-600">{formatCurrency(tot.presAcum)}</td>
        <td className="p-3 text-right bg-slate-50 font-medium">{formatCurrency(tot.totalEstAcum)}</td>
        <td className="p-3 text-right bg-slate-50">{formatVar(desvAcum)}</td>
      </tr>
    )

    // Expanded: 3-digit accounts
    if (isExpanded) {
      cuentas.forEach(d => {
        const c3Key = `c3-${d.cuenta3}`
        const isC3Exp = expanded.has(c3Key)
        const subcuentas = isC3Exp ? getSubcuentas9(d.cuenta3) : []
        const hasSubdetail = true // always allow drill-down

        rows.push(
          <tr
            key={c3Key}
            className="bg-gray-50 text-sm hover:bg-gray-100 cursor-pointer select-none"
            onClick={() => toggleExpand(c3Key)}
          >
            <td className="p-2 pl-10">
              <span className="flex items-center gap-1">
                <span className="text-xs text-gray-400 w-4 inline-block">{isC3Exp ? '\u25BC' : '\u25B6'}</span>
                <span className="text-gray-500 font-mono text-xs mr-1">{d.cuenta3}</span>
                {d.nombre}
              </span>
            </td>
            <td className="p-2 text-right text-gray-500">{formatCurrency(d.presMes)}</td>
            <td className="p-2 text-right font-medium">{formatCurrency(d.realMes)}</td>
            <td className="p-2 text-right">{formatCurrency(d.albMes)}</td>
            <td className="p-2 text-right">{formatCurrency(d.pedMes)}</td>
            <td className="p-2 text-right font-medium">{formatCurrency(d.totalEstMes)}</td>
            <td className="p-2 text-right">{formatVar(d.desvMes)}</td>
            <td className="p-2 text-right bg-slate-50 text-gray-500">{formatCurrency(d.presAcum)}</td>
            <td className="p-2 text-right bg-slate-50 font-medium">{formatCurrency(d.totalEstAcum)}</td>
            <td className="p-2 text-right bg-slate-50">{formatVar(d.desvAcum)}</td>
          </tr>
        )

        // 9-digit subcuentas
        if (isC3Exp && subcuentas.length > 0) {
          subcuentas.forEach(sub => {
            rows.push(
              <tr key={`sub-${sub.cuenta}`} className="bg-gray-100/50 text-xs hover:bg-gray-100">
                <td className="p-1.5 pl-16">
                  <span className="text-gray-400 font-mono mr-1">{sub.cuenta}</span>
                </td>
                <td className="p-1.5 text-right text-gray-400">-</td>
                <td className="p-1.5 text-right">{formatCurrency(sub.realMes)}</td>
                <td className="p-1.5 text-right text-gray-400">-</td>
                <td className="p-1.5 text-right text-gray-400">-</td>
                <td className="p-1.5 text-right">{formatCurrency(sub.realMes)}</td>
                <td className="p-1.5 text-right text-gray-400">-</td>
                <td className="p-1.5 text-right bg-slate-50 text-gray-400">-</td>
                <td className="p-1.5 text-right bg-slate-50">{formatCurrency(sub.realAcum)}</td>
                <td className="p-1.5 text-right bg-slate-50 text-gray-400">-</td>
              </tr>
            )
          })
        }
      })
    }

    return rows
  }

  // Grand total
  const allCuentas = [...(grupos['60'] || []), ...(grupos['62'] || [])]
  const grandTotal = totalGrupo(allCuentas)
  const grandDesvMes = calcDesv(grandTotal.totalEstMes, grandTotal.presMes)
  const grandDesvAcum = calcDesv(grandTotal.totalEstAcum, grandTotal.presAcum)

  // Export
  const exportarExcel = () => {
    const exportData = allCuentas.map(d => ({
      Cuenta: d.cuenta3,
      Nombre: d.nombre,
      'Ppto Mes': formatExcelNumber(d.presMes),
      'Real Mes': formatExcelNumber(d.realMes),
      'Albaranes Ptes': formatExcelNumber(d.albMes),
      'Pedidos Ptes': formatExcelNumber(d.pedMes),
      'Total Estimado': formatExcelNumber(d.totalEstMes),
      'Desv %': d.desvMes != null ? d.desvMes.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '-',
      'Ppto Acum': formatExcelNumber(d.presAcum),
      'Total Est. Acum': formatExcelNumber(d.totalEstAcum),
      'Desv Acum %': d.desvAcum != null ? d.desvAcum.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '-'
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = Array(11).fill({ wch: 15 })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ppto Compras')
    XLSX.writeFile(wb, `Ppto_Compras_${año}_${MONTHS_SHORT[mesSeleccionado - 1]}.xlsx`)
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>&#128722;</span>
          <span>Presupuesto Compras {año}</span>
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={mesSeleccionado}
            onChange={(e) => onMesChange(parseInt(e.target.value))}
            className="px-3 py-1 bg-white/20 text-white rounded border border-white/30 text-sm"
          >
            {MONTHS_SHORT.map((mes, idx) => (
              <option key={idx} value={idx + 1} className="text-gray-800">{mes}</option>
            ))}
          </select>
          <ExportButton onClick={exportarExcel} label="Exportar" className="text-white bg-white/20 hover:bg-white/30" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="p-3 text-left min-w-[200px]">Concepto</th>
              <th className="p-3 text-right">Ppto Mes</th>
              <th className="p-3 text-right">Real Contable</th>
              <th className="p-3 text-right">Albar. Ptes</th>
              <th className="p-3 text-right">Pedidos Ptes</th>
              <th className="p-3 text-right">Total Est.</th>
              <th className="p-3 text-right">Desv.</th>
              <th className="p-3 text-right bg-slate-200">Ppto Acum</th>
              <th className="p-3 text-right bg-slate-200">Total Est. Acum</th>
              <th className="p-3 text-right bg-slate-200">Desv. Acum</th>
            </tr>
          </thead>
          <tbody>
            {renderGrupo('60', 'COMPRAS (60)', '\uD83D\uDCE6', grupos['60'] || [])}
            {renderGrupo('62', 'SERVICIOS EXT. (62)', '\uD83D\uDD27', grupos['62'] || [])}

            {/* Grand Total */}
            <tr className="total-row text-base font-bold border-t-2">
              <td className="p-3">
                <span className="flex items-center gap-1">
                  <span className="mr-1">&#128202;</span>
                  TOTAL
                </span>
              </td>
              <td className="p-3 text-right">{formatCurrency(grandTotal.presMes)}</td>
              <td className="p-3 text-right">{formatCurrency(grandTotal.realMes)}</td>
              <td className="p-3 text-right">{formatCurrency(grandTotal.albMes)}</td>
              <td className="p-3 text-right">{formatCurrency(grandTotal.pedMes)}</td>
              <td className="p-3 text-right">{formatCurrency(grandTotal.totalEstMes)}</td>
              <td className="p-3 text-right">{formatVar(grandDesvMes)}</td>
              <td className="p-3 text-right bg-slate-50">{formatCurrency(grandTotal.presAcum)}</td>
              <td className="p-3 text-right bg-slate-50">{formatCurrency(grandTotal.totalEstAcum)}</td>
              <td className="p-3 text-right bg-slate-50">{formatVar(grandDesvAcum)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
