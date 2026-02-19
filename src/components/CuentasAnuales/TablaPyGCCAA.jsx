// ============================================
// TABLA PyG CCAA - Cuenta de PyG oficial PGC
// Con ratios de rentabilidad vibrantes y comparativo año anterior
// ============================================

import React, { useState, useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { formatCurrency, getValueClass } from '../../utils/formatters'
import { ESTRUCTURA_PYG_CCAA } from '../../utils/constants'
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
    if (formato === 'percent') return `${v.toFixed(1)}%`
    return v.toFixed(2)
  }

  const valorActual = formatVal(value)
  const valorAnterior = formatVal(valueAnt)

  // Flecha de tendencia
  let tendencia = null
  if (value != null && valueAnt != null && isFinite(value) && isFinite(valueAnt)) {
    const diff = value - valueAnt
    if (Math.abs(diff) > 0.1) {
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

export default function TablaPyGCCAA() {
  const { cuentasAnuales, añoActual, planCuentas } = useData()
  const [expanded, setExpanded] = useState(new Set())

  const añoAnterior = añoActual - 1
  const pygActual = cuentasAnuales?.pyg?.[añoActual] || {}
  const pygAnterior = cuentasAnuales?.pyg?.[añoAnterior] || {}
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

  // Collect all expandable IDs
  const allExpandableIds = useMemo(() => {
    const ids = new Set()
    ESTRUCTURA_PYG_CCAA.forEach(item => {
      if (item.type === 'line') {
        const cuentasActual = pygActual[item.id]?.cuentas || {}
        if (Object.keys(cuentasActual).length > 0) ids.add(item.id)
        if (item.children) {
          item.children.forEach(ch => ids.add(ch.id))
        }
      }
    })
    return ids
  }, [pygActual])

  const expandAll = () => setExpanded(new Set(allExpandableIds))
  const collapseAll = () => setExpanded(new Set())

  const getVal = (datos, id) => datos[id]?.total || 0
  const getCuentas = (datos, id) => datos[id]?.cuentas || {}

  // === Valores año actual ===
  const ventas = getVal(pygActual, 'pyg_1')
  const aprovisionamientos = getVal(pygActual, 'pyg_4')
  const varExist = getVal(pygActual, 'pyg_2')
  const gastosPersonal = getVal(pygActual, 'pyg_6')
  const resultadoExplotacion = getVal(pygActual, 'a1')
  const resultadoEjercicio = getVal(pygActual, 'a5')
  const amortizacion = getVal(pygActual, 'pyg_8')
  const otrosGastos = getVal(pygActual, 'pyg_7')
  const ebitda = resultadoExplotacion - amortizacion
  const ebit = resultadoExplotacion
  const costeVentas = aprovisionamientos + varExist
  const margenBrutoValor = ventas + costeVentas
  const gastosExplotacion = gastosPersonal + otrosGastos + amortizacion

  // Balance actual
  const patrimonioNeto = balActual.pn?.total || 0
  const totalActivo = balActual.total_activo?.total || 0
  const deudaFinanciera = (balActual.pnc_ii?.total || 0) + (balActual.pc_ii?.total || 0)

  // === Valores año anterior ===
  const ventasAnt = getVal(pygAnterior, 'pyg_1')
  const aprovisionamientosAnt = getVal(pygAnterior, 'pyg_4')
  const varExistAnt = getVal(pygAnterior, 'pyg_2')
  const gastosPersonalAnt = getVal(pygAnterior, 'pyg_6')
  const resultadoExplotacionAnt = getVal(pygAnterior, 'a1')
  const resultadoEjercicioAnt = getVal(pygAnterior, 'a5')
  const amortizacionAnt = getVal(pygAnterior, 'pyg_8')
  const otrosGastosAnt = getVal(pygAnterior, 'pyg_7')
  const ebitdaAnt = resultadoExplotacionAnt - amortizacionAnt
  const ebitAnt = resultadoExplotacionAnt
  const costeVentasAnt = aprovisionamientosAnt + varExistAnt
  const margenBrutoValorAnt = ventasAnt + costeVentasAnt
  const gastosExplotacionAnt = gastosPersonalAnt + otrosGastosAnt + amortizacionAnt

  // Balance anterior
  const patrimonioNetoAnt = balAnterior.pn?.total || 0
  const totalActivoAnt = balAnterior.total_activo?.total || 0
  const deudaFinancieraAnt = (balAnterior.pnc_ii?.total || 0) + (balAnterior.pc_ii?.total || 0)

  const pct = (num, den) => den !== 0 ? (num / Math.abs(den)) * 100 : null
  const getColor = (val, bueno, malo) => {
    if (val == null) return 'blue'
    return val >= bueno ? 'green' : val <= malo ? 'red' : 'blue'
  }

  const ratios = [
    { label: 'Margen bruto', value: pct(margenBrutoValor, ventas), valueAnt: pct(margenBrutoValorAnt, ventasAnt), formato: 'percent', ideal: 'Cuanto mayor, mejor', tooltip: '(Ventas - Coste de ventas) / Ventas. Lo que ganas antes de gastos operativos.', color: getColor(pct(margenBrutoValor, ventas), 20, 10) },
    { label: 'Margen EBITDA', value: pct(ebitda, ventas), valueAnt: pct(ebitdaAnt, ventasAnt), formato: 'percent', ideal: 'Ideal: > 10%', tooltip: 'EBITDA / Ventas. Rentabilidad operativa real, sin distorsiones contables.', color: getColor(pct(ebitda, ventas), 10, 5) },
    { label: 'Margen neto', value: pct(resultadoEjercicio, ventas), valueAnt: pct(resultadoEjercicioAnt, ventasAnt), formato: 'percent', ideal: 'Cuanto mayor, mejor', tooltip: 'Resultado del Ejercicio / Ventas. Lo que realmente queda al final.', color: getColor(pct(resultadoEjercicio, ventas), 5, 0) },
    { label: 'Personal / Ventas', value: ventas !== 0 ? (Math.abs(gastosPersonal) / Math.abs(ventas)) * 100 : null, valueAnt: ventasAnt !== 0 ? (Math.abs(gastosPersonalAnt) / Math.abs(ventasAnt)) * 100 : null, formato: 'percent', ideal: 'Ideal: < 35%', tooltip: 'Gastos de Personal / Ventas. Peso de la nomina sobre ingresos.', color: ventas !== 0 ? ((Math.abs(gastosPersonal) / Math.abs(ventas)) * 100 <= 35 ? 'green' : 'red') : 'blue' },
    { label: 'Gastos expl. / Ventas', value: ventas !== 0 ? (Math.abs(gastosExplotacion) / Math.abs(ventas)) * 100 : null, valueAnt: ventasAnt !== 0 ? (Math.abs(gastosExplotacionAnt) / Math.abs(ventasAnt)) * 100 : null, formato: 'percent', ideal: 'Cuanto menor, mejor', tooltip: 'Gastos de Explotacion / Ventas. Eficiencia en la gestion del dia a dia.', color: 'blue' },
    { label: 'ROE', value: patrimonioNeto !== 0 ? (resultadoEjercicio / Math.abs(patrimonioNeto)) * 100 : null, valueAnt: patrimonioNetoAnt !== 0 ? (resultadoEjercicioAnt / Math.abs(patrimonioNetoAnt)) * 100 : null, formato: 'percent', ideal: 'Ideal: > 10%', tooltip: 'Resultado Neto / Patrimonio Neto. Rentabilidad para el accionista.', color: getColor(patrimonioNeto !== 0 ? (resultadoEjercicio / Math.abs(patrimonioNeto)) * 100 : null, 10, 0) },
    { label: 'ROA', value: totalActivo !== 0 ? (resultadoEjercicio / totalActivo) * 100 : null, valueAnt: totalActivoAnt !== 0 ? (resultadoEjercicioAnt / totalActivoAnt) * 100 : null, formato: 'percent', ideal: 'Ideal: > 5%', tooltip: 'Resultado Neto / Activo Total. Rentabilidad de todos los activos.', color: getColor(totalActivo !== 0 ? (resultadoEjercicio / totalActivo) * 100 : null, 5, 0) },
    { label: 'ROCE', value: (patrimonioNeto + deudaFinanciera) !== 0 ? (ebit / (patrimonioNeto + deudaFinanciera)) * 100 : null, valueAnt: (patrimonioNetoAnt + deudaFinancieraAnt) !== 0 ? (ebitAnt / (patrimonioNetoAnt + deudaFinancieraAnt)) * 100 : null, formato: 'percent', ideal: 'Ideal: > 15%', tooltip: 'EBIT / (Patrimonio Neto + Deuda Financiera). Retorno del capital empleado.', color: getColor((patrimonioNeto + deudaFinanciera) !== 0 ? (ebit / (patrimonioNeto + deudaFinanciera)) * 100 : null, 15, 5) }
  ]

  // Render account detail rows
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

  const renderRows = () => {
    const rows = []

    ESTRUCTURA_PYG_CCAA.forEach(item => {
      const valActual = getVal(pygActual, item.id)
      const valAnterior = getVal(pygAnterior, item.id)

      // Subtotales
      if (item.type === 'subtotal') {
        rows.push(
          <tr key={item.id} className="bg-blue-50 font-semibold border-t-2 border-blue-200">
            <td className="p-3">{item.label}</td>
            <td className={`p-3 text-right ${getValueClass(valActual)}`}>{formatCurrency(valActual)}</td>
            <td className={`p-3 text-right ${getValueClass(valAnterior)}`}>{formatCurrency(valAnterior)}</td>
          </tr>
        )
        return
      }

      // Total final
      if (item.type === 'total') {
        rows.push(
          <tr key={item.id} className="bg-blue-100 font-bold text-base border-t-2 border-blue-300">
            <td className="p-3">{item.label}</td>
            <td className={`p-3 text-right ${getValueClass(valActual)}`}>{formatCurrency(valActual)}</td>
            <td className={`p-3 text-right ${getValueClass(valAnterior)}`}>{formatCurrency(valAnterior)}</td>
          </tr>
        )
        return
      }

      // Regular lines
      const cuentasActual = getCuentas(pygActual, item.id)
      const cuentasAnt = getCuentas(pygAnterior, item.id)
      const hasCuentas = Object.keys(cuentasActual).length > 0
      const hasChildren = item.children && item.children.length > 0
      const isExpandable = hasCuentas || hasChildren
      const isExpanded = expanded.has(item.id)
      const esGasto = item.signo === -1

      // Hide zero lines
      if (Math.abs(valActual) < 0.01 && Math.abs(valAnterior) < 0.01) return

      rows.push(
        <tr
          key={item.id}
          className={`hover:bg-gray-50 ${isExpandable ? 'cursor-pointer select-none' : ''}`}
          onClick={isExpandable ? () => toggleExpand(item.id) : undefined}
        >
          <td className="p-3 pl-6">
            <span className="flex items-center gap-1">
              {isExpandable && (
                <span className="text-xs text-gray-400 w-4 inline-block">{isExpanded ? '▼' : '▶'}</span>
              )}
              {item.label}
            </span>
          </td>
          <td className={`p-3 text-right font-medium ${esGasto && valActual < 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(valActual)}
          </td>
          <td className={`p-3 text-right ${esGasto && valAnterior < 0 ? 'text-red-600' : ''}`}>
            {formatCurrency(valAnterior)}
          </td>
        </tr>
      )

      // Drill-down
      if (isExpanded) {
        if (hasChildren) {
          // Render children (letras minúsculas)
          item.children.forEach(child => {
            const childDataAct = calcularSubLinea(cuentasActual, child.cuentas)
            const childDataAnt = calcularSubLinea(cuentasAnt, child.cuentas)
            const childVal = childDataAct.total
            const childValAnt = childDataAnt.total
            const childHasCuentas = Object.keys(childDataAct.cuentas).length > 0
            const isChildExpanded = expanded.has(child.id)

            // Hide zero children
            if (Math.abs(childVal) < 0.01 && Math.abs(childValAnt) < 0.01) return

            rows.push(
              <tr
                key={child.id}
                className={`text-xs hover:bg-gray-50 ${childHasCuentas ? 'cursor-pointer select-none' : ''}`}
                onClick={childHasCuentas ? (e) => { e.stopPropagation(); toggleExpand(child.id) } : undefined}
              >
                <td className="p-1.5 pl-12 text-gray-700">
                  <span className="flex items-center gap-1">
                    {childHasCuentas && (
                      <span className="text-xs text-gray-400 w-4 inline-block">{isChildExpanded ? '▼' : '▶'}</span>
                    )}
                    {child.label}
                  </span>
                </td>
                <td className={`p-1.5 text-right text-gray-600 ${esGasto && childVal < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(childVal)}
                </td>
                <td className={`p-1.5 text-right text-gray-600 ${esGasto && childValAnt < 0 ? 'text-red-500' : ''}`}>
                  {formatCurrency(childValAnt)}
                </td>
              </tr>
            )

            // Account detail under child
            if (childHasCuentas && isChildExpanded) {
              renderAccountRows(rows, child.id, childDataAct.cuentas, childDataAnt.cuentas, 'pl-16')
            }
          })
        } else if (hasCuentas) {
          // No children: show accounts directly (original behavior)
          renderAccountRows(rows, item.id, cuentasActual, cuentasAnt, 'pl-14')
        }
      }
    })

    return rows
  }

  return (
    <div className="space-y-4">
      {/* Ratios de rentabilidad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ratios.map(r => (
          <RatioCard key={r.label} {...r} />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>Cuenta de Perdidas y Ganancias {añoActual}</span>
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
          </div>
        </div>

        <div className="overflow-auto max-h-[82vh]">
          <table className="w-full text-sm">
            <thead className="table-header sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 text-left min-w-[350px]">Concepto</th>
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
