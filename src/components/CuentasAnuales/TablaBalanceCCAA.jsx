// ============================================
// TABLA BALANCE CCAA - Balance de Situación oficial PGC
// Con ratios financieros vibrantes y comparativo año anterior
// ============================================

import React, { useState, useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { formatCurrency } from '../../utils/formatters'
import { ESTRUCTURA_BALANCE } from '../../utils/constants'
import { calcularSubLinea } from '../../utils/calculations'

// Componente de ratio con diseño vibrante y año anterior
function RatioCard({ label, value, valueAnt, formato, ideal, tooltip, color }) {
  const styles = {
    green: {
      card: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200',
      badge: 'bg-white/20',
      sub: 'text-emerald-100',
      arrow: 'text-emerald-200'
    },
    red: {
      card: 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200',
      badge: 'bg-white/20',
      sub: 'text-red-100',
      arrow: 'text-red-200'
    },
    blue: {
      card: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200',
      badge: 'bg-white/20',
      sub: 'text-blue-100',
      arrow: 'text-blue-200'
    }
  }

  const s = styles[color] || styles.blue

  const formatVal = (v) => {
    if (v == null || !isFinite(v)) return '-'
    if (formato === 'percent') return `${(v * 100).toFixed(1)}%`
    if (formato === 'currency') return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
    return v.toFixed(2)
  }

  const valorActual = formatVal(value)
  const valorAnterior = formatVal(valueAnt)

  // Flecha de tendencia
  let tendencia = null
  if (value != null && valueAnt != null && isFinite(value) && isFinite(valueAnt)) {
    const diff = value - valueAnt
    if (Math.abs(diff) > 0.001) {
      tendencia = diff > 0 ? '↑' : '↓'
    }
  }

  return (
    <div className={`rounded-xl p-4 ${s.card} cursor-help transition-transform hover:scale-[1.02]`} title={`${tooltip}\n${ideal}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80 truncate">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <p className="text-2xl font-black">{valorActual}</p>
        {tendencia && <span className={`text-sm font-bold ${s.arrow} mb-0.5`}>{tendencia}</span>}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[10px] ${s.sub} font-medium`}>{ideal}</span>
        <span className={`text-[10px] ${s.badge} px-1.5 py-0.5 rounded-full font-medium`}>
          Ant: {valorAnterior}
        </span>
      </div>
    </div>
  )
}

export default function TablaBalanceCCAA() {
  const { cuentasAnuales, añoActual, planCuentas } = useData()
  const [expanded, setExpanded] = useState(new Set())

  const añoAnterior = añoActual - 1
  const balActual = cuentasAnuales?.balance?.[añoActual] || {}
  const balAnterior = cuentasAnuales?.balance?.[añoAnterior] || {}

  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Collect all expandable IDs for expand/collapse all
  const allExpandableIds = useMemo(() => {
    const ids = new Set()
    ESTRUCTURA_BALANCE.forEach(item => {
      if (item.type === 'group' || item.type === 'subgroup') ids.add(item.id)
      if (item.type === 'line') {
        const cuentasActual = balActual[item.id]?.cuentas || {}
        if (Object.keys(cuentasActual).length > 0) ids.add(item.id)
        if (item.children) {
          item.children.forEach(ch => ids.add(ch.id))
        }
      }
    })
    return ids
  }, [balActual])

  const expandAll = () => setExpanded(new Set(allExpandableIds))
  const collapseAll = () => setExpanded(new Set())

  const getVal = (datos, id) => datos[id]?.total || 0
  const getCuentas = (datos, id) => datos[id]?.cuentas || {}

  // Ratios año actual
  const activoCorriente = getVal(balActual, 'ac')
  const pasivoCorriente = getVal(balActual, 'pc')
  const existencias = getVal(balActual, 'ac_i')
  const efectivo = getVal(balActual, 'ac_vi')
  const pasivoTotal = getVal(balActual, 'pnc') + getVal(balActual, 'pc')
  const patrimonioNeto = getVal(balActual, 'pn')
  const totalActivo = getVal(balActual, 'total_activo')
  const activoNoCorriente = getVal(balActual, 'anc')
  const pasivoNoCorriente = getVal(balActual, 'pnc')

  // Ratios año anterior
  const activoCorrienteAnt = getVal(balAnterior, 'ac')
  const pasivoCorrienteAnt = getVal(balAnterior, 'pc')
  const existenciasAnt = getVal(balAnterior, 'ac_i')
  const efectivoAnt = getVal(balAnterior, 'ac_vi')
  const pasivoTotalAnt = getVal(balAnterior, 'pnc') + getVal(balAnterior, 'pc')
  const patrimonioNetoAnt = getVal(balAnterior, 'pn')
  const totalActivoAnt = getVal(balAnterior, 'total_activo')
  const activoNoCorrienteAnt = getVal(balAnterior, 'anc')
  const pasivoNoCorrienteAnt = getVal(balAnterior, 'pnc')

  // Actual
  const liquidezCorriente = pasivoCorriente !== 0 ? activoCorriente / pasivoCorriente : null
  const testAcido = pasivoCorriente !== 0 ? (activoCorriente - existencias) / pasivoCorriente : null
  const tesoreriaNeta = pasivoCorriente !== 0 ? efectivo / pasivoCorriente : null
  const ratioEndeudamiento = patrimonioNeto !== 0 ? pasivoTotal / Math.abs(patrimonioNeto) : null
  const autonomiaFinanciera = totalActivo !== 0 ? patrimonioNeto / totalActivo : null
  const calidadDeuda = pasivoTotal !== 0 ? pasivoCorriente / pasivoTotal : null
  const fondoManiobra = activoCorriente - pasivoCorriente
  const coberturaInmov = activoNoCorriente !== 0 ? (patrimonioNeto + pasivoNoCorriente) / activoNoCorriente : null

  // Anterior
  const liquidezCorrienteAnt = pasivoCorrienteAnt !== 0 ? activoCorrienteAnt / pasivoCorrienteAnt : null
  const testAcidoAnt = pasivoCorrienteAnt !== 0 ? (activoCorrienteAnt - existenciasAnt) / pasivoCorrienteAnt : null
  const tesoreriaNetaAnt = pasivoCorrienteAnt !== 0 ? efectivoAnt / pasivoCorrienteAnt : null
  const ratioEndeudamientoAnt = patrimonioNetoAnt !== 0 ? pasivoTotalAnt / Math.abs(patrimonioNetoAnt) : null
  const autonomiaFinancieraAnt = totalActivoAnt !== 0 ? patrimonioNetoAnt / totalActivoAnt : null
  const calidadDeudaAnt = pasivoTotalAnt !== 0 ? pasivoCorrienteAnt / pasivoTotalAnt : null
  const fondoManiobraAnt = activoCorrienteAnt - pasivoCorrienteAnt
  const coberturaInmovAnt = activoNoCorrienteAnt !== 0 ? (patrimonioNetoAnt + pasivoNoCorrienteAnt) / activoNoCorrienteAnt : null

  const getColor = (val, bueno, malo) => {
    if (val == null) return 'blue'
    return val >= bueno ? 'green' : val <= malo ? 'red' : 'blue'
  }

  const ratios = [
    { label: 'Liquidez corriente', value: liquidezCorriente, valueAnt: liquidezCorrienteAnt, formato: 'x', ideal: 'Ideal: > 1,5', tooltip: 'Activo Corriente / Pasivo Corriente. Mide si puedes pagar tus deudas a corto plazo.', color: getColor(liquidezCorriente, 1.5, 1) },
    { label: 'Test acido', value: testAcido, valueAnt: testAcidoAnt, formato: 'x', ideal: 'Ideal: > 1', tooltip: '(Activo Corriente - Existencias) / Pasivo Corriente. Capacidad de pago sin contar inventario.', color: getColor(testAcido, 1, 0.5) },
    { label: 'Tesoreria neta', value: tesoreriaNeta, valueAnt: tesoreriaNetaAnt, formato: 'x', ideal: 'Cuanto mayor, mejor', tooltip: 'Efectivo / Pasivo Corriente. Capacidad de pago inmediato.', color: getColor(tesoreriaNeta, 0.2, 0.05) },
    { label: 'Endeudamiento', value: ratioEndeudamiento, valueAnt: ratioEndeudamientoAnt, formato: 'x', ideal: 'Ideal: < 1,5', tooltip: 'Pasivo Total / Patrimonio Neto. Cuanto debes vs. lo que es tuyo.', color: ratioEndeudamiento != null ? (ratioEndeudamiento <= 1.5 ? 'green' : 'red') : 'blue' },
    { label: 'Autonomia financiera', value: autonomiaFinanciera, valueAnt: autonomiaFinancieraAnt, formato: 'percent', ideal: 'Ideal: > 40%', tooltip: 'Patrimonio Neto / Activo Total. Independencia de financiacion externa.', color: getColor(autonomiaFinanciera, 0.4, 0.2) },
    { label: 'Calidad de la deuda', value: calidadDeuda, valueAnt: calidadDeudaAnt, formato: 'percent', ideal: 'Cuanto menor, mejor', tooltip: 'Pasivo Corriente / Pasivo Total. Que proporcion de tu deuda es a corto plazo.', color: calidadDeuda != null ? (calidadDeuda <= 0.4 ? 'green' : calidadDeuda >= 0.7 ? 'red' : 'blue') : 'blue' },
    { label: 'Fondo de maniobra', value: fondoManiobra, valueAnt: fondoManiobraAnt, formato: 'currency', ideal: 'Debe ser positivo', tooltip: 'Activo Corriente - Pasivo Corriente. Colchon financiero a corto plazo.', color: fondoManiobra > 0 ? 'green' : 'red' },
    { label: 'Cobertura inmov.', value: coberturaInmov, valueAnt: coberturaInmovAnt, formato: 'x', ideal: 'Ideal: > 1', tooltip: '(Patrimonio Neto + Pasivo No Corriente) / Activo No Corriente. Si financias el largo plazo con recursos a largo plazo.', color: getColor(coberturaInmov, 1, 0.8) }
  ]

  // Render account detail rows (reusable for lines and children)
  const renderAccountRows = (rows, keyPrefix, cuentasActual, cuentasAnt, plLeft) => {
    const todasCuentas = new Set([...Object.keys(cuentasActual), ...Object.keys(cuentasAnt)])
    const cuentasOrdenadas = [...todasCuentas].sort()

    cuentasOrdenadas.forEach(cuenta => {
      const saldoAct = cuentasActual[cuenta]?.saldo || 0
      const saldoAnt = cuentasAnt[cuenta]?.saldo || 0
      const nombre = planCuentas?.[cuenta] || cuentasActual[cuenta]?.nombre || cuentasAnt[cuenta]?.nombre || ''

      rows.push(
        <tr key={`${keyPrefix}-${cuenta}`} className="text-xs bg-gray-50/50 hover:bg-gray-100">
          <td className={`p-1.5 ${plLeft}`}>
            <span className="text-gray-400 font-mono mr-2">{cuenta}</span>
            <span className="text-gray-500 truncate" title={nombre}>{nombre}</span>
          </td>
          <td className="p-1.5 text-right text-gray-600">{formatCurrency(saldoAct)}</td>
          <td className="p-1.5 text-right text-gray-600">{formatCurrency(saldoAnt)}</td>
        </tr>
      )
    })
  }

  const renderLineRow = (rows, lineId, indentLevel) => {
    const line = ESTRUCTURA_BALANCE.find(b => b.id === lineId)
    if (!line) return

    const valActual = getVal(balActual, line.id)
    const valAnterior = getVal(balAnterior, line.id)
    const cuentasActual = getCuentas(balActual, line.id)
    const cuentasAnt = getCuentas(balAnterior, line.id)
    const hasCuentas = Object.keys(cuentasActual).length > 0
    const hasChildren = line.children && line.children.length > 0
    const isExpandable = hasCuentas || hasChildren
    const isExpanded = expanded.has(line.id)

    // Hide zero lines
    if (Math.abs(valActual) < 0.01 && Math.abs(valAnterior) < 0.01) return

    const paddingLeft = indentLevel === 2 ? 'pl-14' : 'pl-10'

    rows.push(
      <tr
        key={line.id}
        className={`text-sm hover:bg-gray-50 ${isExpandable ? 'cursor-pointer select-none' : ''}`}
        onClick={isExpandable ? () => toggleExpand(line.id) : undefined}
      >
        <td className={`p-2 ${paddingLeft}`}>
          <span className="flex items-center gap-1">
            {isExpandable && (
              <span className="text-xs text-gray-400 w-4 inline-block">{isExpanded ? '▼' : '▶'}</span>
            )}
            {line.label}
          </span>
        </td>
        <td className="p-2 text-right">{formatCurrency(valActual)}</td>
        <td className="p-2 text-right">{formatCurrency(valAnterior)}</td>
      </tr>
    )

    if (isExpanded) {
      if (hasChildren) {
        // Render children (arábigos)
        line.children.forEach(child => {
          const childDataAct = calcularSubLinea(cuentasActual, child.cuentas)
          const childDataAnt = calcularSubLinea(cuentasAnt, child.cuentas)
          const childVal = childDataAct.total
          const childValAnt = childDataAnt.total
          const childHasCuentas = Object.keys(childDataAct.cuentas).length > 0
          const isChildExpanded = expanded.has(child.id)

          // Hide zero children
          if (Math.abs(childVal) < 0.01 && Math.abs(childValAnt) < 0.01) return

          const childPl = indentLevel === 2 ? 'pl-20' : 'pl-16'

          rows.push(
            <tr
              key={child.id}
              className={`text-xs hover:bg-gray-50 ${childHasCuentas ? 'cursor-pointer select-none' : ''}`}
              onClick={childHasCuentas ? (e) => { e.stopPropagation(); toggleExpand(child.id) } : undefined}
            >
              <td className={`p-1.5 ${childPl} text-gray-700`}>
                <span className="flex items-center gap-1">
                  {childHasCuentas && (
                    <span className="text-xs text-gray-400 w-4 inline-block">{isChildExpanded ? '▼' : '▶'}</span>
                  )}
                  {child.label}
                </span>
              </td>
              <td className="p-1.5 text-right text-gray-600">{formatCurrency(childVal)}</td>
              <td className="p-1.5 text-right text-gray-600">{formatCurrency(childValAnt)}</td>
            </tr>
          )

          // Account detail under child
          if (childHasCuentas && isChildExpanded) {
            const accountPl = indentLevel === 2 ? 'pl-24' : 'pl-20'
            renderAccountRows(rows, child.id, childDataAct.cuentas, childDataAnt.cuentas, accountPl)
          }
        })
      } else if (hasCuentas) {
        // No children: show accounts directly (original behavior)
        renderAccountRows(rows, line.id, cuentasActual, cuentasAnt, 'pl-20')
      }
    }
  }

  const renderRows = () => {
    const rows = []

    ESTRUCTURA_BALANCE.forEach(item => {
      const valActual = getVal(balActual, item.id)
      const valAnterior = getVal(balAnterior, item.id)

      // Section headers
      if (item.type === 'section') {
        rows.push(
          <tr key={item.id} className="bg-slate-700 text-white">
            <td className="p-3 font-bold text-sm" colSpan={3}>{item.label}</td>
          </tr>
        )
        return
      }

      // Total rows
      if (item.type === 'total') {
        rows.push(
          <tr key={item.id} className="bg-blue-100 font-bold text-base border-t-2 border-blue-300">
            <td className="p-3">{item.label}</td>
            <td className="p-3 text-right">{formatCurrency(valActual)}</td>
            <td className="p-3 text-right">{formatCurrency(valAnterior)}</td>
          </tr>
        )
        return
      }

      // Group headers
      if (item.type === 'group') {
        const isExpanded = expanded.has(item.id)
        rows.push(
          <tr
            key={item.id}
            className="bg-blue-50 font-semibold cursor-pointer select-none hover:bg-blue-100"
            onClick={() => toggleExpand(item.id)}
          >
            <td className="p-3">
              <span className="flex items-center gap-1">
                <span className="text-xs text-gray-500 w-4 inline-block">{isExpanded ? '▼' : '▶'}</span>
                {item.label}
              </span>
            </td>
            <td className="p-3 text-right">{formatCurrency(valActual)}</td>
            <td className="p-3 text-right">{formatCurrency(valAnterior)}</td>
          </tr>
        )

        if (isExpanded && item.subtotalDe) {
          item.subtotalDe.forEach(childId => {
            const child = ESTRUCTURA_BALANCE.find(b => b.id === childId)
            if (!child) return

            if (child.type === 'subgroup') {
              const childVal = getVal(balActual, child.id)
              const childValAnt = getVal(balAnterior, child.id)
              const isSubExpanded = expanded.has(child.id)

              rows.push(
                <tr
                  key={child.id}
                  className="bg-gray-50 font-medium cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => toggleExpand(child.id)}
                >
                  <td className="p-2 pl-8">
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 w-4 inline-block">{isSubExpanded ? '▼' : '▶'}</span>
                      {child.label}
                    </span>
                  </td>
                  <td className="p-2 text-right">{formatCurrency(childVal)}</td>
                  <td className="p-2 text-right">{formatCurrency(childValAnt)}</td>
                </tr>
              )

              if (isSubExpanded && child.subtotalDe) {
                child.subtotalDe.forEach(subChildId => {
                  renderLineRow(rows, subChildId, 2)
                })
              }
              return
            }

            renderLineRow(rows, childId, 1)
          })
        }
        return
      }
    })

    return rows
  }

  const totalActivoVal = getVal(balActual, 'total_activo')
  const totalPNP = getVal(balActual, 'total_pnp')
  const diferencia = Math.abs(totalActivoVal - totalPNP)
  const cuadra = diferencia < 1

  // Cuentas huérfanas (no capturadas por ESTRUCTURA_BALANCE)
  const huerfanasActual = cuentasAnuales?.cuentasHuerfanas?.[añoActual] || {}
  const huerfanasCount = Object.keys(huerfanasActual).length
  const huerfanasTotal = Object.values(huerfanasActual).reduce((sum, d) => sum + d.saldo, 0)

  return (
    <div className="space-y-4">
      {/* Warning: cuentas huérfanas */}
      {huerfanasCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm">
          <p className="font-semibold text-amber-800">
            {huerfanasCount} cuenta(s) de balance no capturada(s) — Importe total: {formatCurrency(huerfanasTotal)}
          </p>
          <div className="mt-1 text-amber-700 text-xs max-h-24 overflow-auto">
            {Object.entries(huerfanasActual).sort(([a],[b]) => a.localeCompare(b)).map(([cuenta, data]) => (
              <span key={cuenta} className="inline-block mr-3">
                <span className="font-mono">{cuenta}</span> ({formatCurrency(data.saldo)})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Ratios financieros del Balance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ratios.map(r => (
          <RatioCard key={r.label} {...r} />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>Balance de Situacion {añoActual}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded transition-colors"
            >
              Expandir todo
            </button>
            <button
              onClick={collapseAll}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded transition-colors"
            >
              Colapsar todo
            </button>
            {!cuadra && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                Descuadre: {formatCurrency(diferencia)}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-auto max-h-[82vh]">
          <table className="w-full text-sm">
            <thead className="table-header sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 text-left min-w-[300px]">Concepto</th>
                <th className="p-3 text-right min-w-[120px]">{añoActual}</th>
                <th className="p-3 text-right min-w-[120px]">{añoAnterior}</th>
              </tr>
            </thead>
            <tbody>
              {renderRows()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
