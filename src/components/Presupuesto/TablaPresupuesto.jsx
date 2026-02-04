// ============================================
// TABLA PRESUPUESTO - Estructura PyG Analítico con drill-down
// ============================================

import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatPercent, formatExcelNumber, getValueClass } from '../../utils/formatters'
import { MONTHS_SHORT, ACCOUNT_GROUPS_3 } from '../../utils/constants'
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
  const { movimientos, presupuestos, pyg3Digitos, proveedores, planCuentas } = useData()
  const [expanded, setExpanded] = useState(new Set())

  // Exportar movimientos a Excel
  const exportarMovimientosFiltrados = (filtro, nombreArchivo) => {
    const movsFiltrados = movimientos.filter(filtro).map(m => ({
      Fecha: m.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      Cuenta: m.cuenta,
      Descripcion: m.descripcion,
      Debe: m.debe,
      Haber: m.haber,
      Neto: m.debe - m.haber,
      Documento: m.documento,
      Proveedor: proveedores[m.codProcedencia] || m.codProcedencia
    }))
    if (movsFiltrados.length === 0) {
      alert('No hay movimientos para exportar')
      return
    }
    const ws = XLSX.utils.json_to_sheet(movsFiltrados)
    ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 30 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  }

  // Filtro por categoría y mes
  const exportarCategoria = (catId, esMes) => {
    const cats = catId === 'varExist' ? ['varExistPT', 'varExistMP'] : [catId]
    const cuentas3 = []
    Object.entries(CUENTA_A_CATEGORIA).forEach(([c3, cat]) => {
      if (cats.includes(cat)) cuentas3.push(c3)
    })
    const filtro = (mov) => {
      if (!mov.mes.startsWith(String(año))) return false
      const c3 = mov.cuenta.substring(0, 3)
      if (!cuentas3.includes(c3)) return false
      const mesMov = parseInt(mov.mes.split('-')[1])
      return esMes ? mesMov === mesSeleccionado : mesMov <= mesSeleccionado
    }
    const periodo = esMes ? MONTHS_SHORT[mesSeleccionado - 1] : `Ene-${MONTHS_SHORT[mesSeleccionado - 1]}`
    exportarMovimientosFiltrados(filtro, `Real_${catId}_${año}_${periodo}`)
  }

  // Filtro por cuenta 3 dígitos y mes
  const exportarCuenta3 = (cuenta3, esMes) => {
    const filtro = (mov) => {
      if (!mov.mes.startsWith(String(año))) return false
      if (!mov.cuenta.startsWith(cuenta3)) return false
      const mesMov = parseInt(mov.mes.split('-')[1])
      return esMes ? mesMov === mesSeleccionado : mesMov <= mesSeleccionado
    }
    const periodo = esMes ? MONTHS_SHORT[mesSeleccionado - 1] : `Ene-${MONTHS_SHORT[mesSeleccionado - 1]}`
    exportarMovimientosFiltrados(filtro, `Real_${cuenta3}_${año}_${periodo}`)
  }

  // Filtro por subcuenta 9 dígitos y mes
  const exportarSubcuenta = (subcuenta, esMes) => {
    const filtro = (mov) => {
      if (!mov.mes.startsWith(String(año))) return false
      if (mov.cuenta !== subcuenta) return false
      const mesMov = parseInt(mov.mes.split('-')[1])
      return esMes ? mesMov === mesSeleccionado : mesMov <= mesSeleccionado
    }
    const periodo = esMes ? MONTHS_SHORT[mesSeleccionado - 1] : `Ene-${MONTHS_SHORT[mesSeleccionado - 1]}`
    exportarMovimientosFiltrados(filtro, `Real_${subcuenta}_${año}_${periodo}`)
  }

  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Build presupuesto data indexed by cuenta (supports both 3-digit and 9-digit)
  const presPorCuenta = useMemo(() => {
    const result = {}
    presupuestos.forEach(p => {
      const cuenta = p.cuenta
      if (!result[cuenta]) result[cuenta] = { meses: {} }
      if (!result[cuenta].meses[p.mes]) result[cuenta].meses[p.mes] = 0
      result[cuenta].meses[p.mes] += p.importe
    })
    return result
  }, [presupuestos])

  // Aggregate presupuestos to 3-digit level (handles both 3-digit and 9-digit inputs)
  const presPorCuenta3 = useMemo(() => {
    const result = {}
    Object.entries(presPorCuenta).forEach(([cuenta, data]) => {
      const c3 = cuenta.substring(0, 3)
      if (!result[c3]) result[c3] = { meses: {} }
      Object.entries(data.meses).forEach(([mes, importe]) => {
        if (!result[c3].meses[mes]) result[c3].meses[mes] = 0
        result[c3].meses[mes] += importe
      })
    })
    return result
  }, [presPorCuenta])

  // Get 9-digit presupuestos grouped under their 3-digit parent
  const presSubcuentas = useMemo(() => {
    const result = {}
    Object.entries(presPorCuenta).forEach(([cuenta, data]) => {
      if (cuenta.length <= 3) return // skip already-3-digit
      const c3 = cuenta.substring(0, 3)
      if (!result[c3]) result[c3] = {}
      result[c3][cuenta] = data
    })
    return result
  }, [presPorCuenta])

  // Real data by subcuenta (full account) from movimientos
  const realSubcuentas = useMemo(() => {
    const result = {}
    movimientos.forEach(mov => {
      if (!mov.mes.startsWith(String(año))) return
      const cuenta3 = mov.cuenta.substring(0, 3)
      if (!ACCOUNT_GROUPS_3[cuenta3]) return

      const subcuenta = mov.cuenta
      if (!result[subcuenta]) {
        result[subcuenta] = { cuenta3, meses: {}, descripcion: mov.descripcion || '' }
        for (let m = 1; m <= 12; m++) result[subcuenta].meses[m] = 0
      }
      // Capturar la primera descripción no vacía como nombre de la cuenta
      if (!result[subcuenta].descripcion && mov.descripcion) {
        result[subcuenta].descripcion = mov.descripcion
      }
      const mes = parseInt(mov.mes.split('-')[1])
      const neto = mov.debe - mov.haber
      const valor = ACCOUNT_GROUPS_3[cuenta3].type === 'ingreso' ? -neto : neto
      result[subcuenta].meses[mes] += valor
    })
    return result
  }, [movimientos, año])

  // Calcular datos agrupados por categoría PyG
  const datosAgrupados = useMemo(() => {
    const presPorCategoria = {}
    ESTRUCTURA_PYG.forEach(f => {
      if (!f.calc) presPorCategoria[f.id] = { total: 0, meses: {} }
    })

    // Agrupar presupuestos por categoría (using 3-digit aggregated)
    Object.entries(presPorCuenta3).forEach(([cuenta3, data]) => {
      const cat = CUENTA_A_CATEGORIA[cuenta3]
      if (!cat || !presPorCategoria[cat]) return
      Object.entries(data.meses).forEach(([mes, importe]) => {
        const m = parseInt(mes)
        if (!presPorCategoria[cat].meses[m]) presPorCategoria[cat].meses[m] = 0
        presPorCategoria[cat].meses[m] += importe
        presPorCategoria[cat].total += importe
      })
    })

    // Calcular varExist pres
    presPorCategoria['varExist'] = { total: 0, meses: {} }
    for (let m = 1; m <= 12; m++) {
      const varPT = presPorCategoria['varExistPT']?.meses[m] || 0
      const varMP = presPorCategoria['varExistMP']?.meses[m] || 0
      presPorCategoria['varExist'].meses[m] = varPT - varMP
      presPorCategoria['varExist'].total += varPT - varMP
    }

    // Real por categoría
    const realPorCategoria = {}
    ESTRUCTURA_PYG.forEach(f => {
      if (!f.calc) realPorCategoria[f.id] = { total: 0, meses: {} }
    })

    Object.entries(pyg3Digitos).forEach(([cuenta, data]) => {
      const cat = CUENTA_A_CATEGORIA[cuenta]
      if (!cat || !realPorCategoria[cat]) return
      for (let m = 1; m <= 12; m++) {
        const valor = data.meses[m] || 0
        if (!realPorCategoria[cat].meses[m]) realPorCategoria[cat].meses[m] = 0
        realPorCategoria[cat].meses[m] += valor
        realPorCategoria[cat].total += valor
      }
    })

    realPorCategoria['varExist'] = { total: 0, meses: {} }
    for (let m = 1; m <= 12; m++) {
      const varPT = realPorCategoria['varExistPT']?.meses[m] || 0
      const varMP = realPorCategoria['varExistMP']?.meses[m] || 0
      realPorCategoria['varExist'].meses[m] = varPT - varMP
      realPorCategoria['varExist'].total += varPT - varMP
    }

    return { pres: presPorCategoria, real: realPorCategoria }
  }, [presupuestos, pyg3Digitos, presPorCuenta3])

  // Subtotales
  const calcularSubtotales = (datos, mes = null) => {
    const get = (cat) => mes ? (datos[cat]?.meses[mes] || 0) : (datos[cat]?.total || 0)
    const ventas = get('ventas'), compras = get('compras'), varExist = get('varExist')
    const servicios = get('servicios'), personal = get('personal')
    const subvenciones = get('subvenciones'), otrosIngExplot = get('otrosIngExplot')
    const otrosIngresos = get('otrosIngresos')
    const restoGastos = get('restoGastos'), amortizaciones = get('amortizaciones')
    const gastosFinancieros = get('gastosFinancieros')
    const ingFinancieros = get('ingFinancieros'), ingExcepc = get('ingExcepc')
    const margenBruto = ventas - compras + varExist
    const ebitda = margenBruto - servicios - personal + subvenciones + otrosIngExplot + (otrosIngresos || 0)
    const resultado = ebitda - restoGastos - amortizaciones - gastosFinancieros + ingFinancieros + ingExcepc
    return { margenBruto, ebitda, resultado }
  }

  const getValor = (datos, fila, mes = null) => {
    if (fila.calc) return calcularSubtotales(datos, mes)[fila.id] || 0
    return mes ? (datos[fila.id]?.meses[mes] || 0) : (datos[fila.id]?.total || 0)
  }

  const calcVar = (real, pres) => {
    if (!pres || pres === 0) return null
    return ((real - pres) / Math.abs(pres)) * 100
  }

  const filasVisibles = ESTRUCTURA_PYG.filter(f => {
    if (!f.optional) return true
    return getValor(datosAgrupados.pres, f) !== 0 || getValor(datosAgrupados.real, f) !== 0
  })

  const getAcumulado = (datos, fila) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) acum += getValor(datos, fila, m)
    return acum
  }

  // Helper: get pres value for a specific cuenta (3-digit) and mes
  const getPresCuenta3 = (cuenta3, mes) => presPorCuenta3[cuenta3]?.meses[mes] || 0
  const getPresCuenta3Acum = (cuenta3) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) acum += getPresCuenta3(cuenta3, m)
    return acum
  }

  // Helper: get pres value for a specific subcuenta (9-digit) and mes
  const getPresSubcuenta = (subcuenta, mes) => presPorCuenta[subcuenta]?.meses[mes] || 0
  const getPresSubcuentaAcum = (subcuenta) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) acum += getPresSubcuenta(subcuenta, m)
    return acum
  }

  // Helper: get real value for cuenta3
  const getRealCuenta3 = (cuenta3, mes) => pyg3Digitos[cuenta3]?.meses[mes] || 0
  const getRealCuenta3Acum = (cuenta3) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) acum += getRealCuenta3(cuenta3, m)
    return acum
  }

  // Helper: get real value for subcuenta
  const getRealSubcuenta = (subcuenta, mes) => realSubcuentas[subcuenta]?.meses[mes] || 0
  const getRealSubcuentaAcum = (subcuenta) => {
    let acum = 0
    for (let m = 1; m <= mesSeleccionado; m++) acum += getRealSubcuenta(subcuenta, m)
    return acum
  }

  // Get all 3-digit accounts for a category
  const getCuentas3ForCategory = (catId) => {
    // varExist combines varExistPT and varExistMP
    const cats = catId === 'varExist' ? ['varExistPT', 'varExistMP'] : [catId]
    const cuentas = new Set()
    Object.entries(CUENTA_A_CATEGORIA).forEach(([c3, cat]) => {
      if (cats.includes(cat)) cuentas.add(c3)
    })
    // Only return cuentas that have data (pres or real)
    return [...cuentas].filter(c3 => {
      const hasPres = presPorCuenta3[c3] && Object.values(presPorCuenta3[c3].meses).some(v => v !== 0)
      const hasReal = pyg3Digitos[c3] && Object.values(pyg3Digitos[c3].meses).some((v, i) => typeof i === 'number' ? v !== 0 : false)
      // Simpler check: any month 1-12 non-zero
      const hasRealData = pyg3Digitos[c3] && Array.from({length: 12}, (_, i) => i + 1).some(m => pyg3Digitos[c3].meses[m] !== 0)
      return hasPres || hasRealData
    }).sort()
  }

  // Get all subcuentas (9-digit) for a 3-digit account
  const getSubcuentasFor3 = (cuenta3) => {
    const subcuentas = new Set()
    // From presupuestos
    if (presSubcuentas[cuenta3]) {
      Object.keys(presSubcuentas[cuenta3]).forEach(s => subcuentas.add(s))
    }
    // From real data
    Object.entries(realSubcuentas).forEach(([s, data]) => {
      if (data.cuenta3 === cuenta3) subcuentas.add(s)
    })
    return [...subcuentas].filter(s => {
      const hasPres = presPorCuenta[s] && Object.values(presPorCuenta[s].meses).some(v => v !== 0)
      const hasReal = realSubcuentas[s] && Array.from({length: 12}, (_, i) => i + 1).some(m => realSubcuentas[s].meses[m] !== 0)
      return hasPres || hasReal
    }).sort()
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
        'Var. Mes %': calcVar(realMes, presMes) != null ? calcVar(realMes, presMes).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '-',
        'Pres. Acum': formatExcelNumber(presAcum),
        'Real Acum': formatExcelNumber(realAcum),
        'Var. Acum %': calcVar(realAcum, presAcum) != null ? calcVar(realAcum, presAcum).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '-'
      }
    })
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto vs Real')
    XLSX.writeFile(wb, `PyG_Ppto_vs_Real_${año}_${MONTHS_SHORT[mesSeleccionado - 1]}.xlsx`)
  }

  const formatVar = (valor, esGasto = false) => {
    if (valor === null || valor === undefined) return <span className="text-gray-400">-</span>
    const esBueno = esGasto ? valor < 0 : valor >= 0
    const color = esBueno ? 'text-green-600' : 'text-red-600'
    return <span className={color}>{valor >= 0 ? '+' : ''}{valor.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
  }

  // Render a data row with 7 columns
  const renderDataRow = (key, label, presMes, realMes, presAcum, realAcum, esGasto, className, onClick, chevron) => {
    const varMes = calcVar(realMes, presMes)
    const varAcum = calcVar(realAcum, presAcum)
    return (
      <tr key={key} className={className} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
        <td className="p-3 flex items-center gap-1">
          {chevron}
          {label}
        </td>
        <td className="p-3 text-right text-gray-600">{formatCurrency(presMes)}</td>
        <td className="p-3 text-right font-medium">{formatCurrency(realMes)}</td>
        <td className="p-3 text-right">{formatVar(varMes, esGasto)}</td>
        <td className="p-3 text-right bg-slate-50 text-gray-600">{formatCurrency(presAcum)}</td>
        <td className="p-3 text-right bg-slate-50 font-medium">{formatCurrency(realAcum)}</td>
        <td className="p-3 text-right bg-slate-50">{formatVar(varAcum, esGasto)}</td>
      </tr>
    )
  }

  // Build all rows including expanded sub-rows
  const renderRows = () => {
    const rows = []

    filasVisibles.forEach(fila => {
      const isHeader = fila.type === 'header'
      const isSubtotal = fila.type === 'subtotal'
      const isTotal = fila.type === 'total'
      const esGasto = fila.negative
      const isExpandable = !fila.calc && fila.id !== 'varExist'
      const catKey = `cat-${fila.id}`
      const isExpanded = expanded.has(catKey)

      const presMes = getValor(datosAgrupados.pres, fila, mesSeleccionado)
      const realMes = getValor(datosAgrupados.real, fila, mesSeleccionado)
      const varMes = calcVar(realMes, presMes)
      const presAcum = getAcumulado(datosAgrupados.pres, fila)
      const realAcum = getAcumulado(datosAgrupados.real, fila)
      const varAcum = calcVar(realAcum, presAcum)

      // Main category row
      rows.push(
        <tr
          key={fila.id}
          className={`
            ${isHeader ? 'bg-green-50 font-semibold' : ''}
            ${isSubtotal ? 'subtotal-row font-semibold border-t-2 border-blue-200' : ''}
            ${isTotal ? 'total-row text-base' : ''}
            ${!isHeader && !isSubtotal && !isTotal ? 'hover:bg-gray-50' : ''}
            ${isExpandable ? 'cursor-pointer select-none' : ''}
          `}
          onClick={isExpandable ? () => toggleExpand(catKey) : undefined}
        >
          <td className={`p-3 ${fila.indent ? 'pl-6' : ''}`}>
            <span className="flex items-center gap-1">
              {isExpandable && (
                <span className="text-xs text-gray-400 w-4 inline-block">{isExpanded ? '▼' : '▶'}</span>
              )}
              {fila.icon && <span className="mr-1">{fila.icon}</span>}
              {fila.label}
            </span>
          </td>
          <td className="p-3 text-right text-gray-600">{formatCurrency(presMes)}</td>
          <td
            className={`p-3 text-right font-medium ${isSubtotal || isTotal ? getValueClass(realMes) : ''} ${!fila.calc ? 'cursor-pointer hover:bg-blue-50 hover:underline' : ''}`}
            onClick={!fila.calc ? (e) => { e.stopPropagation(); exportarCategoria(fila.id, true) } : undefined}
            title={!fila.calc ? 'Clic para exportar detalle' : undefined}
          >
            {formatCurrency(realMes)}
          </td>
          <td className="p-3 text-right">{formatVar(varMes, esGasto)}</td>
          <td className="p-3 text-right bg-slate-50 text-gray-600">{formatCurrency(presAcum)}</td>
          <td
            className={`p-3 text-right bg-slate-50 font-medium ${isSubtotal || isTotal ? getValueClass(realAcum) : ''} ${!fila.calc ? 'cursor-pointer hover:bg-blue-100 hover:underline' : ''}`}
            onClick={!fila.calc ? (e) => { e.stopPropagation(); exportarCategoria(fila.id, false) } : undefined}
            title={!fila.calc ? 'Clic para exportar detalle acumulado' : undefined}
          >
            {formatCurrency(realAcum)}
          </td>
          <td className="p-3 text-right bg-slate-50">{formatVar(varAcum, esGasto)}</td>
        </tr>
      )

      // Expanded: show 3-digit sub-accounts
      if (isExpandable && isExpanded) {
        const cuentas3 = getCuentas3ForCategory(fila.id)

        cuentas3.forEach(c3 => {
          const c3Key = `c3-${c3}`
          const isC3Expanded = expanded.has(c3Key)
          const nombre3 = ACCOUNT_GROUPS_3[c3]?.name || `Cuenta ${c3}`

          const pM = getPresCuenta3(c3, mesSeleccionado)
          const rM = getRealCuenta3(c3, mesSeleccionado)
          const pA = getPresCuenta3Acum(c3)
          const rA = getRealCuenta3Acum(c3)
          const vM = calcVar(rM, pM)
          const vA = calcVar(rA, pA)

          const subcuentas = getSubcuentasFor3(c3)
          const hasSubdetail = subcuentas.length > 1

          rows.push(
            <tr
              key={c3Key}
              className={`bg-gray-50 text-sm hover:bg-gray-100 ${hasSubdetail ? 'cursor-pointer select-none' : ''}`}
              onClick={hasSubdetail ? () => toggleExpand(c3Key) : undefined}
            >
              <td className="p-2 pl-10">
                <span className="flex items-center gap-1">
                  {hasSubdetail && (
                    <span className="text-xs text-gray-400 w-4 inline-block">{isC3Expanded ? '▼' : '▶'}</span>
                  )}
                  <span className="text-gray-500 font-mono text-xs mr-1">{c3}</span>
                  {nombre3}
                </span>
              </td>
              <td className="p-2 text-right text-gray-500">{formatCurrency(pM)}</td>
              <td
                className="p-2 text-right font-medium cursor-pointer hover:bg-blue-50 hover:underline"
                onClick={(e) => { e.stopPropagation(); exportarCuenta3(c3, true) }}
                title="Clic para exportar detalle"
              >
                {formatCurrency(rM)}
              </td>
              <td className="p-2 text-right">{formatVar(vM, esGasto)}</td>
              <td className="p-2 text-right bg-slate-50 text-gray-500">{formatCurrency(pA)}</td>
              <td
                className="p-2 text-right bg-slate-50 font-medium cursor-pointer hover:bg-blue-100 hover:underline"
                onClick={(e) => { e.stopPropagation(); exportarCuenta3(c3, false) }}
                title="Clic para exportar detalle acumulado"
              >
                {formatCurrency(rA)}
              </td>
              <td className="p-2 text-right bg-slate-50">{formatVar(vA, esGasto)}</td>
            </tr>
          )

          // Expanded 3-digit: show 9-digit subcuentas
          if (hasSubdetail && isC3Expanded) {
            subcuentas.forEach(sub => {
              const spM = getPresSubcuenta(sub, mesSeleccionado)
              const srM = getRealSubcuenta(sub, mesSeleccionado)
              const spA = getPresSubcuentaAcum(sub)
              const srA = getRealSubcuentaAcum(sub)
              const svM = calcVar(srM, spM)
              const svA = calcVar(srA, spA)

              // Usar nombre del plan de cuentas si existe, sino la descripción del movimiento
              const subNombre = planCuentas[sub] || realSubcuentas[sub]?.descripcion || ''
              rows.push(
                <tr key={`sub-${sub}`} className="bg-gray-100/50 text-xs hover:bg-gray-100">
                  <td className="p-1.5 pl-16">
                    <span className="text-gray-400 font-mono mr-1">{sub}</span>
                    {subNombre && <span className="text-gray-500 truncate" title={subNombre}>{subNombre}</span>}
                  </td>
                  <td className="p-1.5 text-right text-gray-400">{formatCurrency(spM)}</td>
                  <td
                    className="p-1.5 text-right cursor-pointer hover:bg-blue-50 hover:underline"
                    onClick={() => exportarSubcuenta(sub, true)}
                    title="Clic para exportar detalle"
                  >
                    {formatCurrency(srM)}
                  </td>
                  <td className="p-1.5 text-right">{formatVar(svM, esGasto)}</td>
                  <td className="p-1.5 text-right bg-slate-50 text-gray-400">{formatCurrency(spA)}</td>
                  <td
                    className="p-1.5 text-right bg-slate-50 cursor-pointer hover:bg-blue-100 hover:underline"
                    onClick={() => exportarSubcuenta(sub, false)}
                    title="Clic para exportar detalle acumulado"
                  >
                    {formatCurrency(srA)}
                  </td>
                  <td className="p-1.5 text-right bg-slate-50">{formatVar(svA, esGasto)}</td>
                </tr>
              )
            })
          }
        })
      }
    })

    return rows
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
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  )
}
