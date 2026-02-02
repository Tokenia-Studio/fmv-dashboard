// ============================================
// TABLA PRESUPUESTO - Estructura PyG Analítico
// ============================================

import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatPercent, formatExcelNumber, getValueClass } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import ExportButton from '../UI/ExportButton'

// Mapeo de cuentas 3 dígitos a categorías del PyG
const CUENTA_A_CATEGORIA = {
  // Ingresos
  '700': 'ventas', '701': 'ventas', '702': 'ventas', '703': 'ventas', '704': 'ventas',
  '705': 'ventas', '706': 'ventas', '708': 'ventas', '709': 'ventas',
  // Variaciones existencias productos
  '710': 'varExistPT', '711': 'varExistPT', '712': 'varExistPT', '713': 'varExistPT',
  // Trabajos para el activo
  '730': 'otrosIngresos', '731': 'otrosIngresos', '732': 'otrosIngresos', '733': 'otrosIngresos',
  // Subvenciones
  '740': 'subvenciones', '746': 'subvenciones', '747': 'subvenciones',
  // Otros ingresos explotación
  '751': 'otrosIngExplot', '752': 'otrosIngExplot', '753': 'otrosIngExplot',
  '754': 'otrosIngExplot', '755': 'otrosIngExplot', '759': 'otrosIngExplot',
  // Ingresos financieros
  '760': 'ingFinancieros', '761': 'ingFinancieros', '762': 'ingFinancieros',
  '763': 'ingFinancieros', '765': 'ingFinancieros', '766': 'ingFinancieros',
  '767': 'ingFinancieros', '768': 'ingFinancieros', '769': 'ingFinancieros',
  // Ingresos excepcionales
  '770': 'ingExcepc', '771': 'ingExcepc', '772': 'ingExcepc', '773': 'ingExcepc',
  '774': 'ingExcepc', '775': 'ingExcepc', '778': 'ingExcepc',
  // Reversiones
  '790': 'ingExcepc', '791': 'ingExcepc', '792': 'ingExcepc', '793': 'ingExcepc',
  '794': 'ingExcepc', '795': 'ingExcepc', '796': 'ingExcepc', '797': 'ingExcepc',
  '798': 'ingExcepc', '799': 'ingExcepc',
  // Compras
  '600': 'compras', '601': 'compras', '602': 'compras', '606': 'compras',
  '607': 'compras', '608': 'compras', '609': 'compras',
  // Variaciones existencias MP
  '610': 'varExistMP', '611': 'varExistMP', '612': 'varExistMP',
  // Servicios exteriores
  '620': 'servicios', '621': 'servicios', '622': 'servicios', '623': 'servicios',
  '624': 'servicios', '625': 'servicios', '626': 'servicios', '627': 'servicios',
  '628': 'servicios', '629': 'servicios',
  // Tributos
  '630': 'restoGastos', '631': 'restoGastos', '633': 'restoGastos', '634': 'restoGastos',
  '636': 'restoGastos', '638': 'restoGastos', '639': 'restoGastos',
  // Personal
  '640': 'personal', '641': 'personal', '642': 'personal', '643': 'personal',
  '644': 'personal', '645': 'personal', '649': 'personal',
  // Otros gastos
  '650': 'restoGastos', '651': 'restoGastos', '659': 'restoGastos',
  // Gastos financieros
  '660': 'gastosFinancieros', '661': 'gastosFinancieros', '662': 'gastosFinancieros',
  '663': 'gastosFinancieros', '664': 'gastosFinancieros', '665': 'gastosFinancieros',
  '666': 'gastosFinancieros', '667': 'gastosFinancieros', '668': 'gastosFinancieros',
  '669': 'gastosFinancieros',
  // Pérdidas
  '670': 'restoGastos', '671': 'restoGastos', '672': 'restoGastos', '673': 'restoGastos',
  '675': 'restoGastos', '678': 'restoGastos',
  // Amortizaciones
  '680': 'amortizaciones', '681': 'amortizaciones', '682': 'amortizaciones',
  // Deterioros
  '690': 'restoGastos', '691': 'restoGastos', '692': 'restoGastos', '693': 'restoGastos',
  '694': 'restoGastos', '695': 'restoGastos', '696': 'restoGastos', '697': 'restoGastos',
  '698': 'restoGastos', '699': 'restoGastos'
}

// Estructura del PyG analítico
const ESTRUCTURA_PYG = [
  { id: 'ventas', label: 'VENTAS', icon: '💰', type: 'header' },
  { id: 'compras', label: '(-) Compras', indent: true, negative: true },
  { id: 'varExist', label: '(±) Var. existencias', indent: true },
  { id: 'margenBruto', label: 'MARGEN BRUTO', icon: '📊', type: 'subtotal', calc: true },
  { id: 'servicios', label: '(-) Servicios ext.', indent: true, negative: true },
  { id: 'personal', label: '(-) Personal', indent: true, negative: true },
  { id: 'subvenciones', label: '(+) Subvenciones', indent: true, optional: true },
  { id: 'otrosIngExplot', label: '(+) Otros ing. explot.', indent: true, optional: true },
  { id: 'ebitda', label: 'EBITDA', icon: '💹', type: 'subtotal', calc: true },
  { id: 'restoGastos', label: '(-) Resto gastos', indent: true, negative: true },
  { id: 'amortizaciones', label: '(-) Amortizaciones', indent: true, negative: true },
  { id: 'gastosFinancieros', label: '(-) Gastos financieros', indent: true, negative: true },
  { id: 'ingFinancieros', label: '(+) Ing. financieros', indent: true, optional: true },
  { id: 'ingExcepc', label: '(+) Ing. excepcionales', indent: true, optional: true },
  { id: 'resultado', label: 'RESULTADO', icon: '📈', type: 'total', calc: true }
]

export default function TablaPresupuesto({ mesSeleccionado, onMesChange, año }) {
  const { movimientos, presupuestos, pyg3Digitos } = useData()

  // Calcular datos agrupados por categoría PyG
  const datosAgrupados = useMemo(() => {
    // Inicializar categorías para presupuesto
    const presPorCategoria = {}
    ESTRUCTURA_PYG.forEach(f => {
      if (!f.calc) presPorCategoria[f.id] = { total: 0, meses: {} }
    })

    // Agrupar presupuestos por categoría
    presupuestos.forEach(p => {
      const cat = CUENTA_A_CATEGORIA[p.cuenta]
      if (!cat || !presPorCategoria[cat]) return

      if (!presPorCategoria[cat].meses[p.mes]) {
        presPorCategoria[cat].meses[p.mes] = 0
      }
      presPorCategoria[cat].meses[p.mes] += p.importe
      presPorCategoria[cat].total += p.importe
    })

    // Calcular varExist = varExistPT - varExistMP
    presPorCategoria['varExist'] = { total: 0, meses: {} }
    for (let m = 1; m <= 12; m++) {
      const varPT = presPorCategoria['varExistPT']?.meses[m] || 0
      const varMP = presPorCategoria['varExistMP']?.meses[m] || 0
      presPorCategoria['varExist'].meses[m] = varPT - varMP
      presPorCategoria['varExist'].total += varPT - varMP
    }

    // Inicializar categorías para real
    const realPorCategoria = {}
    ESTRUCTURA_PYG.forEach(f => {
      if (!f.calc) realPorCategoria[f.id] = { total: 0, meses: {} }
    })

    // Agrupar real por categoría desde pyg3Digitos
    Object.entries(pyg3Digitos).forEach(([cuenta, data]) => {
      const cat = CUENTA_A_CATEGORIA[cuenta]
      if (!cat || !realPorCategoria[cat]) return

      for (let m = 1; m <= 12; m++) {
        const valor = data.meses[m] || 0
        if (!realPorCategoria[cat].meses[m]) {
          realPorCategoria[cat].meses[m] = 0
        }
        realPorCategoria[cat].meses[m] += valor
        realPorCategoria[cat].total += valor
      }
    })

    // Calcular varExist real
    realPorCategoria['varExist'] = { total: 0, meses: {} }
    for (let m = 1; m <= 12; m++) {
      const varPT = realPorCategoria['varExistPT']?.meses[m] || 0
      const varMP = realPorCategoria['varExistMP']?.meses[m] || 0
      realPorCategoria['varExist'].meses[m] = varPT - varMP
      realPorCategoria['varExist'].total += varPT - varMP
    }

    return { pres: presPorCategoria, real: realPorCategoria }
  }, [presupuestos, pyg3Digitos])

  // Calcular subtotales
  const calcularSubtotales = (datos, mes = null) => {
    const get = (cat) => {
      if (mes) return datos[cat]?.meses[mes] || 0
      return datos[cat]?.total || 0
    }

    const ventas = get('ventas')
    const compras = get('compras')
    const varExist = get('varExist')
    const servicios = get('servicios')
    const personal = get('personal')
    const subvenciones = get('subvenciones')
    const otrosIngExplot = get('otrosIngExplot')
    const otrosIngresos = get('otrosIngresos')
    const restoGastos = get('restoGastos')
    const amortizaciones = get('amortizaciones')
    const gastosFinancieros = get('gastosFinancieros')
    const ingFinancieros = get('ingFinancieros')
    const ingExcepc = get('ingExcepc')

    const margenBruto = ventas - compras + varExist
    const ebitda = margenBruto - servicios - personal + subvenciones + otrosIngExplot + otrosIngresos
    const resultado = ebitda - restoGastos - amortizaciones - gastosFinancieros + ingFinancieros + ingExcepc

    return { margenBruto, ebitda, resultado }
  }

  // Obtener valor para una fila
  const getValor = (datos, fila, mes = null) => {
    if (fila.calc) {
      const subtotales = calcularSubtotales(datos, mes)
      return subtotales[fila.id] || 0
    }
    if (mes) return datos[fila.id]?.meses[mes] || 0
    return datos[fila.id]?.total || 0
  }

  // Calcular variación porcentual
  const calcVar = (real, pres) => {
    if (!pres || pres === 0) return null
    return ((real - pres) / Math.abs(pres)) * 100
  }

  // Filtrar filas sin datos
  const filasVisibles = ESTRUCTURA_PYG.filter(f => {
    if (!f.optional) return true
    const preVal = getValor(datosAgrupados.pres, f)
    const realVal = getValor(datosAgrupados.real, f)
    return preVal !== 0 || realVal !== 0
  })

  // Calcular acumulados hasta mes seleccionado
  const getAcumulado = (datos, fila) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) {
      acum += getValor(datos, fila, m)
    }
    return acum
  }

  // Exportar a Excel
  const exportarExcel = () => {
    const exportData = filasVisibles.map(fila => {
      const presMes = getValor(datosAgrupados.pres, fila, mesSeleccionado)
      const realMes = getValor(datosAgrupados.real, fila, mesSeleccionado)
      const presAcum = getAcumulado(datosAgrupados.pres, fila)
      const realAcum = getAcumulado(datosAgrupados.real, fila)

      return {
        Concepto: fila.label,
        'Pres. Mes': formatExcelNumber(presMes),
        'Real Mes': formatExcelNumber(realMes),
        'Var. Mes %': calcVar(realMes, presMes)?.toFixed(1) + '%' || '-',
        'Pres. Acum': formatExcelNumber(presAcum),
        'Real Acum': formatExcelNumber(realAcum),
        'Var. Acum %': calcVar(realAcum, presAcum)?.toFixed(1) + '%' || '-'
      }
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto vs Real')
    XLSX.writeFile(wb, `PyG_Ppto_vs_Real_${año}_${MONTHS_SHORT[mesSeleccionado - 1]}.xlsx`)
  }

  // Formatear variación con color
  const formatVar = (valor, esGasto = false) => {
    if (valor === null || valor === undefined) return <span className="text-gray-400">-</span>
    // Para gastos: negativo es bueno (gastamos menos)
    // Para ingresos/márgenes: positivo es bueno
    const esBueno = esGasto ? valor < 0 : valor >= 0
    const color = esBueno ? 'text-green-600' : 'text-red-600'
    return <span className={color}>{valor >= 0 ? '+' : ''}{valor.toFixed(1)}%</span>
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📊</span>
          <span>PyG Presupuesto vs Real {año}</span>
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
              <th className="p-3 text-right">Pres. Mes</th>
              <th className="p-3 text-right">Real Mes</th>
              <th className="p-3 text-right">Var.</th>
              <th className="p-3 text-right bg-slate-200">Pres. Acum</th>
              <th className="p-3 text-right bg-slate-200">Real Acum</th>
              <th className="p-3 text-right bg-slate-200">Var.</th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map(fila => {
              const isHeader = fila.type === 'header'
              const isSubtotal = fila.type === 'subtotal'
              const isTotal = fila.type === 'total'

              const presMes = getValor(datosAgrupados.pres, fila, mesSeleccionado)
              const realMes = getValor(datosAgrupados.real, fila, mesSeleccionado)
              const varMes = calcVar(realMes, presMes)

              const presAcum = getAcumulado(datosAgrupados.pres, fila)
              const realAcum = getAcumulado(datosAgrupados.real, fila)
              const varAcum = calcVar(realAcum, presAcum)

              const esGasto = fila.negative

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
                  <td className={`p-3 ${fila.indent ? 'pl-6' : ''}`}>
                    {fila.icon && <span className="mr-2">{fila.icon}</span>}
                    {fila.label}
                  </td>

                  <td className="p-3 text-right text-gray-600">{formatCurrency(presMes)}</td>
                  <td className={`p-3 text-right font-medium ${isSubtotal || isTotal ? getValueClass(realMes) : ''}`}>
                    {formatCurrency(realMes)}
                  </td>
                  <td className="p-3 text-right">{formatVar(varMes, esGasto)}</td>

                  <td className="p-3 text-right bg-slate-50 text-gray-600">{formatCurrency(presAcum)}</td>
                  <td className={`p-3 text-right bg-slate-50 font-medium ${isSubtotal || isTotal ? getValueClass(realAcum) : ''}`}>
                    {formatCurrency(realAcum)}
                  </td>
                  <td className="p-3 text-right bg-slate-50">{formatVar(varAcum, esGasto)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
