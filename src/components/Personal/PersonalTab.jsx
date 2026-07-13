// ============================================
// PERSONAL TAB - Ratios de personal y productividad
// ============================================

import React, { useState, useCallback, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { useData } from '../../context/DataContext'
import { calcularPyG } from '../../utils/calculations'
import KPICard from '../UI/KPICard'
import { formatCurrency, formatPercent, formatCompact, mesKeyToNombre, formatNumber } from '../../utils/formatters'
import { MONTHS_SHORT, CHART_COLORS, ACCOUNT_GROUPS_3 } from '../../utils/constants'
import { calcularHorasLaborables, calcularDiasLaborables, obtenerCalendarioParaAño } from '../../utils/calendario'
import { BENCHMARKS_SECTOR, evaluarBenchmark, posicionEnEscala, rangoSaludableTexto } from '../../utils/benchmarksSector'

// Subcuentas del grupo 64
const PERSONAL_SUBCUENTAS = {
  '640': { name: 'Sueldos y salarios', color: '#8b5cf6' },
  '641': { name: 'Indemnizaciones', color: '#ef4444' },
  '642': { name: 'Seg. Social empresa', color: '#3b82f6' },
  '643': { name: 'Retribuc. largo plazo', color: '#f59e0b' },
  '644': { name: 'Retribuc. instrumentos', color: '#10b981' },
  '645': { name: 'Retribuc. al personal', color: '#ec4899' },
  '649': { name: 'Otros gastos sociales', color: '#6b7280' }
}

function PersonalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-medium" style={{ color: entry.color }}>
              {typeof entry.value === 'number'
                ? entry.name.includes('%') || entry.name.includes('Ratio')
                  ? formatPercent(entry.value)
                  : entry.name.includes('Trab') || entry.name.includes('Plantilla')
                    ? entry.value
                    : formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PersonalTab() {
  const {
    pyg, totalesPyG, movimientos, añoActual,
    trabajadoresMensuales, cargarTrabajadores, guardarTrabajador,
    horasManuales, guardarHorasMes,
    calendariosLaborales
  } = useData()

  const [editMes, setEditMes] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editHorasMes, setEditHorasMes] = useState(null)
  const [editHorasValue, setEditHorasValue] = useState('')
  const [mesProd, setMesProd] = useState('año') // periodo de las tarjetas de productividad
  const [saving, setSaving] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const mesesConDatos = pyg.filter(m => m.ventas !== 0 || m.resultado !== 0)
  const trabajadoresAño = trabajadoresMensuales[añoActual] || {}
  const horasManualesAño = horasManuales?.[añoActual] || {}
  const trabajadoresAñoAnterior = trabajadoresMensuales[añoActual - 1] || {}
  const tieneTrabajadores = Object.keys(trabajadoresAño).length > 0

  // Desglose subcuentas 64x por mes
  const desglose64 = useMemo(() => {
    const result = {}
    for (let m = 1; m <= 12; m++) {
      result[m] = {}
      Object.keys(PERSONAL_SUBCUENTAS).forEach(sc => { result[m][sc] = 0 })
    }
    movimientos.forEach(mov => {
      if (!mov.mes.startsWith(String(añoActual))) return
      const sc3 = mov.cuenta?.substring(0, 3)
      if (!PERSONAL_SUBCUENTAS[sc3]) return
      const mesNum = parseInt(mov.mes.split('-')[1])
      const neto = mov.debe - mov.haber
      result[mesNum][sc3] = (result[mesNum][sc3] || 0) + neto
    })
    return result
  }, [movimientos, añoActual])

  // Datos mensuales combinados
  const datosMensuales = useMemo(() => {
    return MONTHS_SHORT.map((mes, idx) => {
      const mesNum = idx + 1
      const pygMes = mesesConDatos.find(d => parseInt(d.mes.split('-')[1]) === mesNum)
      const numTrab = trabajadoresAño[mesNum]
      const numTrabAnt = trabajadoresAñoAnterior[mesNum]
      const ventas = pygMes?.ventas || 0
      const personal = pygMes?.personal || 0
      const ebitda = pygMes?.ebitda || 0
      const margenBruto = pygMes?.margenBruto || 0

      return {
        mes,
        mesNum,
        ventas,
        personal,
        ebitda,
        margenBruto,
        trabajadores: numTrab || null,
        trabajadoresAnt: numTrabAnt || null,
        // Ratios (solo si hay trabajadores)
        personalSobreVentas: ventas ? (personal / ventas) * 100 : null,
        costeMedioEmpleado: numTrab ? personal / numTrab : null,
        ventasPorEmpleado: numTrab ? ventas / numTrab : null,
        ebitdaPorEmpleado: numTrab ? ebitda / numTrab : null,
        margenBrutoPorEmpleado: numTrab ? margenBruto / numTrab : null,
        coberturaLaboral: personal ? ventas / personal : null,
        // Desglose 64x
        sueldos: desglose64[mesNum]?.['640'] || 0,
        segSocial: desglose64[mesNum]?.['642'] || 0,
        indemnizaciones: desglose64[mesNum]?.['641'] || 0,
        otrosGastos: (desglose64[mesNum]?.['643'] || 0) + (desglose64[mesNum]?.['644'] || 0) +
                     (desglose64[mesNum]?.['645'] || 0) + (desglose64[mesNum]?.['649'] || 0)
      }
    })
  }, [mesesConDatos, trabajadoresAño, trabajadoresAñoAnterior, desglose64])

  // Totales anuales
  const totales = useMemo(() => {
    const mesesConTrab = datosMensuales.filter(d => d.trabajadores)
    const plantillaMedia = mesesConTrab.length > 0
      ? mesesConTrab.reduce((s, d) => s + d.trabajadores, 0) / mesesConTrab.length
      : 0
    const totalPersonal = totalesPyG.personal || 0
    const totalVentas = totalesPyG.ventas || 0
    const totalEbitda = totalesPyG.ebitda || 0
    const totalMargenBruto = totalesPyG.margenBruto || 0
    const totalSueldos = datosMensuales.reduce((s, d) => s + d.sueldos, 0)
    const totalSegSocial = datosMensuales.reduce((s, d) => s + d.segSocial, 0)

    return {
      plantillaMedia: Math.round(plantillaMedia * 10) / 10,
      totalPersonal,
      totalVentas,
      personalSobreVentas: totalVentas ? (totalPersonal / totalVentas) * 100 : 0,
      costeMedioEmpleado: plantillaMedia ? totalPersonal / plantillaMedia : 0,
      ventasPorEmpleado: plantillaMedia ? totalVentas / plantillaMedia : 0,
      ebitdaPorEmpleado: plantillaMedia ? totalEbitda / plantillaMedia : 0,
      margenBrutoPorEmpleado: plantillaMedia ? totalMargenBruto / plantillaMedia : 0,
      coberturaLaboral: totalPersonal ? totalVentas / totalPersonal : 0,
      pesoSueldos: totalPersonal ? (totalSueldos / totalPersonal) * 100 : 0,
      pesoSegSocial: totalPersonal ? (totalSegSocial / totalPersonal) * 100 : 0,
      totalSueldos,
      totalSegSocial
    }
  }, [datosMensuales, totalesPyG])

  // Comparativa interanual
  const comparativaAnual = useMemo(() => {
    const años = Object.keys(trabajadoresMensuales).map(Number).sort()
    return años.map(año => {
      const trab = trabajadoresMensuales[año] || {}
      const mesesConTrab = Object.values(trab)
      const plantillaMedia = mesesConTrab.length > 0
        ? mesesConTrab.reduce((s, v) => s + v, 0) / mesesConTrab.length
        : 0

      const pygAño = calcularPyG(movimientos, año)
      const totalVentas = pygAño.reduce((s, m) => s + m.ventas, 0)
      const totalPersonal = pygAño.reduce((s, m) => s + m.personal, 0)
      const totalEbitda = pygAño.reduce((s, m) => s + m.ebitda, 0)

      return {
        año: String(año),
        plantillaMedia: Math.round(plantillaMedia * 10) / 10,
        totalPersonal,
        totalVentas,
        personalSobreVentas: totalVentas ? (totalPersonal / totalVentas) * 100 : 0,
        costeMedioEmpleado: plantillaMedia ? totalPersonal / plantillaMedia : 0,
        ventasPorEmpleado: plantillaMedia ? totalVentas / plantillaMedia : 0,
        ebitdaPorEmpleado: plantillaMedia ? totalEbitda / plantillaMedia : 0,
        coberturaLaboral: totalPersonal ? totalVentas / totalPersonal : 0
      }
    })
  }, [trabajadoresMensuales, movimientos])

  // ============================================
  // PRODUCTIVIDAD (horas calendario + gastos grupo 60/62)
  // ============================================
  const calendarioAño = useMemo(
    () => obtenerCalendarioParaAño(calendariosLaborales, añoActual),
    [calendariosLaborales, añoActual]
  )
  const horasLabMes = useMemo(() => calcularHorasLaborables(calendarioAño, añoActual), [calendarioAño, añoActual])
  const diasLabMes = useMemo(() => calcularDiasLaborables(calendarioAño, añoActual), [calendarioAño, añoActual])

  // Gastos por mes del grupo 6: 60 (proveedores), 62 (acreedores) y resto
  // (63 tributos, 65 otros, 66 financieros, 67 pérdidas, 68 amortizaciones,
  // 69 deterioros). Se excluyen el 64 completo (llega como Personal desde el
  // PyG) y el 61 (variación de existencias: BC lo usa para capitalizar coste
  // directo con importes enormes en el haber y no es un gasto operativo).
  const gastosPorMes = useMemo(() => {
    const result = {}
    for (let m = 1; m <= 12; m++) result[m] = { proveedores: 0, acreedores: 0, resto: 0 }
    movimientos.forEach(mov => {
      if (!mov.mes || !mov.mes.startsWith(String(añoActual))) return
      const cuenta = mov.cuenta || ''
      if (!cuenta.startsWith('6')) return
      const mesNum = parseInt(mov.mes.split('-')[1])
      const neto = (mov.debe || 0) - (mov.haber || 0)
      const g2 = cuenta.substring(0, 2)
      if (g2 === '60') result[mesNum].proveedores += neto
      else if (g2 === '62') result[mesNum].acreedores += neto
      else if (g2 !== '61' && g2 !== '64') result[mesNum].resto += neto
    })
    return result
  }, [movimientos, añoActual])

  const productividadMensual = useMemo(() => {
    // BC exporta apuntes con fecha futura (coste esperado, grupo 61/31):
    // los meses posteriores al actual se marcan y quedan fuera de tabla y ratios
    const hoy = new Date()
    const mesTope = añoActual === hoy.getFullYear() ? hoy.getMonth() + 1 : 12

    return datosMensuales.map(d => {
      const futuro = d.mesNum > mesTope
      const horas = horasLabMes[d.mesNum] || 0
      const dias = diasLabMes[d.mesNum] || 0
      const trab = d.trabajadores || 0
      // Horas manuales (si se han escrito) mandan sobre el cálculo por calendario
      const horasManual = horasManualesAño[d.mesNum]
      const horasTotales = horasManual > 0 ? horasManual : trab * horas
      // Personal completo (grupo 64: 640+641+642+649), igual que la línea del PyG
      const personalMes = d.personal || 0
      const proveedores = gastosPorMes[d.mesNum]?.proveedores || 0
      const acreedores = gastosPorMes[d.mesNum]?.acreedores || 0
      const resto = gastosPorMes[d.mesNum]?.resto || 0
      const totalGastos = personalMes + proveedores + acreedores + resto
      const ingresos = d.ventas || 0

      return {
        ...d,
        futuro,
        horasLab: horas,
        diasLab: dias,
        horasTotales,
        horasManual: horasManual > 0,
        personalCompleto: personalMes,
        proveedores,
        acreedores,
        resto,
        totalGastos,
        ingresos,
        gastosPorTrabajador: trab ? totalGastos / trab : null,
        // Coste laboral completo por hora (grupo 64 entero ÷ horas)
        gastosHoraManoObra: horasTotales ? personalMes / horasTotales : null,
        gastosHoraProveedores: horasTotales ? proveedores / horasTotales : null,
        gastosHoraAcreedores: horasTotales ? acreedores / horasTotales : null,
        gastosHoraTotal: horasTotales ? totalGastos / horasTotales : null,
        ingresosHora: horasTotales ? ingresos / horasTotales : null,
        ingresosPorTrabajador: trab ? ingresos / trab : null,
        ventasDiaLab: dias ? ingresos / dias : null,
        pctGastosVentas: ingresos ? (totalGastos / ingresos) * 100 : null
      }
    })
  }, [datosMensuales, horasLabMes, diasLabMes, gastosPorMes, horasManualesAño, añoActual])

  // Totales anuales productividad
  const productividadTotales = useMemo(() => {
    const mesesConDatosProd = productividadMensual.filter(d => !d.futuro && (d.ingresos !== 0 || d.totalGastos !== 0))
    const sum = (key) => mesesConDatosProd.reduce((s, d) => s + (d[key] || 0), 0)
    const totalHoras = sum('horasTotales')
    const totalDias = mesesConDatosProd.reduce((s, d) => s + (d.diasLab || 0), 0)
    const totalIngresos = sum('ingresos')
    const totalGastos = sum('totalGastos')
    const totalPersonal = sum('personalCompleto')
    const totalProveedores = sum('proveedores')
    const totalAcreedores = sum('acreedores')
    const totalResto = sum('resto')
    const plantillaMediaProd = mesesConDatosProd.filter(d => d.trabajadores).length > 0
      ? mesesConDatosProd.filter(d => d.trabajadores).reduce((s, d) => s + d.trabajadores, 0) / mesesConDatosProd.filter(d => d.trabajadores).length
      : 0
    return {
      totalHoras,
      totalDias,
      totalIngresos,
      totalGastos,
      totalPersonal,
      totalProveedores,
      totalAcreedores,
      totalResto,
      plantillaMediaProd,
      gastosHoraTotal: totalHoras ? totalGastos / totalHoras : 0,
      ingresosHora: totalHoras ? totalIngresos / totalHoras : 0,
      ingresosPorTrabajador: plantillaMediaProd ? totalIngresos / plantillaMediaProd : 0,
      ventasDiaLab: totalDias ? totalIngresos / totalDias : 0,
      pctGastosVentas: totalIngresos ? (totalGastos / totalIngresos) * 100 : 0
    }
  }, [productividadMensual])

  // KPIs de las tarjetas de productividad: media del año o un mes concreto
  // (útil cuando un mes viene incompleto, p.ej. sin nóminas contabilizadas)
  const mesesProdConDatos = productividadMensual.filter(d => !d.futuro && (d.ingresos !== 0 || d.totalGastos !== 0))
  const kpisProd = mesProd === 'año'
    ? productividadTotales
    : (productividadMensual.find(d => d.mesNum === mesProd) || productividadTotales)

  // ============================================
  // POSICIONAMIENTO SECTOR (benchmarks CNAE 25)
  // ============================================
  const posicionamientoSector = useMemo(() => {
    const totalVentas = totalesPyG.ventas || 0
    const totalPersonal = totalesPyG.personal || 0
    const totalEbitda = totalesPyG.ebitda || 0
    const totalMargenBruto = totalesPyG.margenBruto || 0

    const ventasPorEmpleado = totales.plantillaMedia ? totalVentas / totales.plantillaMedia : 0
    const ebitdaPorEmpleado = totales.plantillaMedia ? totalEbitda / totales.plantillaMedia : 0
    const coberturaLaboral = totalPersonal ? totalVentas / totalPersonal : 0
    const personalSobreVentas = totalVentas ? (totalPersonal / totalVentas) * 100 : 0
    const margenBrutoPct = totalVentas ? (totalMargenBruto / totalVentas) * 100 : 0
    const ebitdaPct = totalVentas ? (totalEbitda / totalVentas) * 100 : 0

    // Valores de productividad del bloque anterior
    const { ingresosHora, gastosHoraTotal, pctGastosVentas, totalProveedores, totalAcreedores } = productividadTotales
    const pctProveedoresVentas = totalVentas ? (totalProveedores / totalVentas) * 100 : 0
    const pctAcreedoresVentas = totalVentas ? (totalAcreedores / totalVentas) * 100 : 0
    const margenHora = productividadTotales.totalHoras ? (productividadTotales.totalIngresos - productividadTotales.totalGastos) / productividadTotales.totalHoras : 0
    const costeMedioEmpleado = totales.costeMedioEmpleado || 0

    return [
      // Costes y márgenes
      { key: 'personalSobreVentas', valor: personalSobreVentas, bench: BENCHMARKS_SECTOR.personalSobreVentas, format: 'percent', grupo: 'Costes' },
      { key: 'pctGastosVentas', valor: pctGastosVentas, bench: BENCHMARKS_SECTOR.pctGastosVentas, format: 'percent', grupo: 'Costes' },
      { key: 'pctProveedoresVentas', valor: pctProveedoresVentas, bench: BENCHMARKS_SECTOR.pctProveedoresVentas, format: 'percent', grupo: 'Costes' },
      { key: 'pctAcreedoresVentas', valor: pctAcreedoresVentas, bench: BENCHMARKS_SECTOR.pctAcreedoresVentas, format: 'percent', grupo: 'Costes' },
      { key: 'margenBrutoPct', valor: margenBrutoPct, bench: BENCHMARKS_SECTOR.margenBrutoPct, format: 'percent', grupo: 'Costes' },
      { key: 'ebitdaPct', valor: ebitdaPct, bench: BENCHMARKS_SECTOR.ebitdaPct, format: 'percent', grupo: 'Costes' },
      // Productividad por hora
      { key: 'ingresosHora', valor: ingresosHora, bench: BENCHMARKS_SECTOR.ingresosHora, format: 'euro', grupo: 'Hora' },
      { key: 'gastosHoraTotal', valor: gastosHoraTotal, bench: BENCHMARKS_SECTOR.gastosHoraTotal, format: 'euro', grupo: 'Hora' },
      { key: 'margenHora', valor: margenHora, bench: BENCHMARKS_SECTOR.margenHora, format: 'euro', grupo: 'Hora' },
      // Por empleado
      { key: 'ventasPorEmpleado', valor: ventasPorEmpleado, bench: BENCHMARKS_SECTOR.ventasPorEmpleado, format: 'currency', grupo: 'Empleado' },
      { key: 'ebitdaPorEmpleado', valor: ebitdaPorEmpleado, bench: BENCHMARKS_SECTOR.ebitdaPorEmpleado, format: 'currency', grupo: 'Empleado' },
      { key: 'coberturaLaboral', valor: coberturaLaboral, bench: BENCHMARKS_SECTOR.coberturaLaboral, format: 'x', grupo: 'Empleado' }
    ].map(row => ({
      ...row,
      evaluacion: evaluarBenchmark(row.valor, row.bench),
      posicion: posicionEnEscala(row.valor, row.bench)
    }))
  }, [totalesPyG, totales, productividadTotales])

  // Handlers
  const handleSaveTrabajador = async (mesNum) => {
    const val = parseInt(editValue)
    if (isNaN(val) || val < 0) return
    setSaving(true)
    const result = await guardarTrabajador(añoActual, mesNum, val)
    setSaving(false)
    setEditMes(null)
    setEditValue('')
    if (result.success) {
      setMensaje({ tipo: 'ok', texto: `Trabajadores de ${MONTHS_SHORT[mesNum - 1]} actualizados` })
    } else {
      setMensaje({ tipo: 'error', texto: result.error })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  // Guardar horas totales manuales de un mes (vacío = volver al cálculo automático)
  const handleSaveHoras = async (mesNum) => {
    const texto = editHorasValue.trim()
    const val = texto === '' ? null : parseFloat(texto.replace(/\./g, '').replace(',', '.'))
    if (val !== null && (isNaN(val) || val < 0)) return
    setSaving(true)
    const result = await guardarHorasMes(añoActual, mesNum, val)
    setSaving(false)
    setEditHorasMes(null)
    setEditHorasValue('')
    if (result.success) {
      setMensaje({ tipo: 'ok', texto: val === null ? `Horas de ${MONTHS_SHORT[mesNum - 1]} vuelven al cálculo automático` : `Horas de ${MONTHS_SHORT[mesNum - 1]} actualizadas` })
    } else {
      setMensaje({ tipo: 'error', texto: result.error })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  const handleFile = useCallback(async (file) => {
    const result = await cargarTrabajadores(file)
    if (result.success) {
      setMensaje({ tipo: 'ok', texto: `${result.count} registros cargados correctamente` })
    } else {
      setMensaje({ tipo: 'error', texto: result.error })
    }
    setTimeout(() => setMensaje(null), 5000)
  }, [cargarTrabajadores])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file)
  }, [handleFile])

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  // --- Color helpers ---
  const getPersonalColor = (pct) => {
    if (pct == null) return 'text-gray-400'
    if (pct > 40) return 'text-red-600 font-bold'
    if (pct > 35) return 'text-amber-600 font-semibold'
    return 'text-green-600'
  }

  // Formateo de valores según tipo para la tarjeta Posicionamiento
  const formatPosicionValor = (valor, format) => {
    if (valor == null || isNaN(valor)) return '-'
    if (format === 'percent') return formatPercent(valor)
    if (format === 'euro') return `${valor.toFixed(2)} €/h`
    if (format === 'currency') return formatCurrency(valor)
    if (format === 'x') return `${valor.toFixed(1)}x`
    return String(valor)
  }

  // Mapa color semáforo → clases tailwind
  const SEMAFORO_CLASES = {
    emerald: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', bar: 'bg-emerald-500' },
    green:   { bg: 'bg-green-100',   border: 'border-green-300',   text: 'text-green-700',   bar: 'bg-green-500' },
    amber:   { bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-700',   bar: 'bg-amber-500' },
    red:     { bg: 'bg-red-100',     border: 'border-red-300',     text: 'text-red-700',     bar: 'bg-red-500' },
    gray:    { bg: 'bg-gray-100',    border: 'border-gray-300',    text: 'text-gray-600',    bar: 'bg-gray-400' }
  }

  // ==========================================
  // RENDER
  // ==========================================

  if (mesesConDatos.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos para {añoActual}</h2>
        <p className="text-gray-500">Carga un diario contable en la pestaña "Cargar"</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-3 rounded-lg text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* ========== KPIs ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Plantilla Media"
          valor={totales.plantillaMedia}
          formato="number"
          icono="👥"
          subtitulo={`${Object.keys(trabajadoresAño).length} meses con datos`}
          colorValor="text-purple-600"
        />
        <KPICard
          titulo="Coste/Empleado"
          valor={totales.costeMedioEmpleado}
          icono="💶"
          subtitulo={tieneTrabajadores ? `${formatPercent(totales.pesoSueldos)} sueldos + ${formatPercent(totales.pesoSegSocial)} SS` : 'Sin datos de plantilla'}
          colorValor="text-blue-600"
        />
        <KPICard
          titulo="Ventas/Empleado"
          valor={totales.ventasPorEmpleado}
          icono="📈"
          subtitulo={tieneTrabajadores ? `Cobertura: ${totales.coberturaLaboral.toFixed(1)}x` : 'Sin datos de plantilla'}
          colorValor="text-green-600"
        />
        <KPICard
          titulo="Personal/Ventas"
          valor={totales.personalSobreVentas}
          formato="percent"
          icono="📊"
          subtitulo={totales.personalSobreVentas > 40 ? 'Por encima del umbral' : totales.personalSobreVentas > 35 ? 'Zona de alerta' : 'Dentro de rango'}
          colorValor={getPersonalColor(totales.personalSobreVentas)}
        />
      </div>

      {/* ========== TABLA RATIOS MENSUALES ========== */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📊</span>
            <span>Ratios de Personal por Mes - {añoActual}</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Mes</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Trabaj.</th>
                <th className="px-3 py-2 text-right font-semibold text-purple-600">Gto. Personal</th>
                <th className="px-3 py-2 text-right font-semibold text-green-600">Ventas</th>
                <th className="px-3 py-2 text-right font-semibold text-amber-600">Personal/Ventas</th>
                <th className="px-3 py-2 text-right font-semibold text-blue-600">Coste/Empl.</th>
                <th className="px-3 py-2 text-right font-semibold text-green-700">Ventas/Empl.</th>
                <th className="px-3 py-2 text-right font-semibold text-indigo-600">EBITDA/Empl.</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {datosMensuales.map((d, idx) => {
                const tieneDatosMes = d.ventas !== 0 || d.personal !== 0
                if (!tieneDatosMes && !d.trabajadores) return null

                return (
                  <tr key={d.mes} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-gray-700">{d.mes}</td>
                    <td className="px-3 py-2 text-right">
                      {editMes === d.mesNum ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTrabajador(d.mesNum)
                              if (e.key === 'Escape') { setEditMes(null); setEditValue('') }
                            }}
                            className="w-14 px-1 py-0.5 border rounded text-center text-xs"
                            autoFocus
                            min="0"
                          />
                          <button
                            onClick={() => handleSaveTrabajador(d.mesNum)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800 font-bold"
                          >
                            {saving ? '...' : 'OK'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditMes(d.mesNum); setEditValue(d.trabajadores || '') }}
                          className="text-purple-700 font-semibold hover:bg-purple-50 px-2 py-0.5 rounded cursor-pointer min-w-[2rem]"
                          title="Click para editar"
                        >
                          {d.trabajadores || '-'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-purple-700">{d.personal ? formatCurrency(d.personal) : '-'}</td>
                    <td className="px-3 py-2 text-right text-green-700">{d.ventas ? formatCurrency(d.ventas) : '-'}</td>
                    <td className={`px-3 py-2 text-right ${getPersonalColor(d.personalSobreVentas)}`}>
                      {d.personalSobreVentas != null ? formatPercent(d.personalSobreVentas) : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-blue-700">{d.costeMedioEmpleado ? formatCurrency(d.costeMedioEmpleado) : '-'}</td>
                    <td className="px-3 py-2 text-right text-green-700">{d.ventasPorEmpleado ? formatCurrency(d.ventasPorEmpleado) : '-'}</td>
                    <td className="px-3 py-2 text-right text-indigo-700">{d.ebitdaPorEmpleado ? formatCurrency(d.ebitdaPorEmpleado) : '-'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{d.coberturaLaboral ? `${d.coberturaLaboral.toFixed(1)}x` : '-'}</td>
                  </tr>
                )
              })}

              {/* Fila de totales */}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-3 py-2 text-gray-800">TOTAL / MEDIA</td>
                <td className="px-3 py-2 text-right text-purple-700">{totales.plantillaMedia || '-'}</td>
                <td className="px-3 py-2 text-right text-purple-700">{formatCurrency(totales.totalPersonal)}</td>
                <td className="px-3 py-2 text-right text-green-700">{formatCurrency(totales.totalVentas)}</td>
                <td className={`px-3 py-2 text-right ${getPersonalColor(totales.personalSobreVentas)}`}>
                  {formatPercent(totales.personalSobreVentas)}
                </td>
                <td className="px-3 py-2 text-right text-blue-700">{totales.costeMedioEmpleado ? formatCurrency(totales.costeMedioEmpleado) : '-'}</td>
                <td className="px-3 py-2 text-right text-green-700">{totales.ventasPorEmpleado ? formatCurrency(totales.ventasPorEmpleado) : '-'}</td>
                <td className="px-3 py-2 text-right text-indigo-700">{totales.ebitdaPorEmpleado ? formatCurrency(totales.ebitdaPorEmpleado) : '-'}</td>
                <td className="px-3 py-2 text-right text-gray-600">{totales.coberturaLaboral ? `${totales.coberturaLaboral.toFixed(1)}x` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== GRAFICOS ========== */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📈</span>
            <span>Evolución Mensual - {añoActual}</span>
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Gráfico 1: Personal/Ventas % con umbral */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📊</span> Personal / Ventas (%)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={datosMensuales.filter(d => d.personalSobreVentas != null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `${v}%`} domain={[0, 'auto']} />
                <Tooltip content={<PersonalTooltip />} />
                <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '35%', fill: '#f59e0b', fontSize: 10 }} />
                <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '40%', fill: '#ef4444', fontSize: 10 }} />
                <Bar dataKey="personalSobreVentas" name="% Personal/Ventas" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico 2: Ventas y Coste por empleado */}
          {tieneTrabajadores && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>💶</span> Productividad por Empleado
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosMensuales.filter(d => d.trabajadores)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => formatCompact(v).replace(' €', '')} />
                  <Tooltip content={<PersonalTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="ventasPorEmpleado" name="Ventas/Empl." fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costeMedioEmpleado" name="Coste/Empl." fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ebitdaPorEmpleado" name="EBITDA/Empl." fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico 3: Evolución plantilla */}
          {tieneTrabajadores && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>👥</span> Evolución Plantilla
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={datosMensuales.filter(d => d.trabajadores || d.trabajadoresAnt)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} domain={['auto', 'auto']} />
                  <Tooltip content={<PersonalTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area dataKey="trabajadores" name={`Plantilla ${añoActual}`} fill="#a855f7" fillOpacity={0.15} stroke="#a855f7" strokeWidth={2} />
                  <Line dataKey="trabajadoresAnt" name={`Plantilla ${añoActual - 1}`} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gráfico 4: Desglose costes laborales */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span> Desglose Costes Laborales
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosMensuales.filter(d => d.sueldos > 0 || d.segSocial > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => formatCompact(v).replace(' €', '')} />
                <Tooltip content={<PersonalTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="sueldos" name="Sueldos (640)" fill="#8b5cf6" stackId="a" />
                <Bar dataKey="segSocial" name="Seg. Social (642)" fill="#3b82f6" stackId="a" />
                <Bar dataKey="indemnizaciones" name="Indemnizac. (641)" fill="#ef4444" stackId="a" />
                <Bar dataKey="otrosGastos" name="Otros (643-649)" fill="#6b7280" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== COMPARATIVA INTERANUAL ========== */}
      {comparativaAnual.length > 1 && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>📅</span>
              <span>Comparativa Interanual</span>
            </h3>
            <span className="text-xs text-white/80 italic">Pasa el ratón sobre cada columna para ver su significado</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-help" title="Año natural al que corresponden los datos. La fila resaltada es el ejercicio actual.">Ejercicio</th>
                  <th className="px-4 py-3 text-right font-semibold text-purple-600 cursor-help" title="Promedio de trabajadores en plantilla durante el ejercicio (media de los 12 meses registrados en la tabla de trabajadores mensuales).">Plantilla Media</th>
                  <th className="px-4 py-3 text-right font-semibold text-purple-600 cursor-help" title="Gasto total de personal del ejercicio: suma de cuentas 640 (sueldos) + 641 (indemnizaciones) + 642 (Seguridad Social) + 643-649 (otros gastos sociales).">Gto. Personal</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-600 cursor-help" title="Importe neto de la cifra de negocios del ejercicio (cuenta 700/705). Es la base sobre la que se calculan los ratios de productividad.">Ventas</th>
                  <th className="px-4 py-3 text-right font-semibold text-amber-600 cursor-help" title="Peso del gasto de personal sobre ventas (Gto. Personal ÷ Ventas). Indica cuánto de cada euro vendido se destina a personal. Referencia sector metal: <35% óptimo, 35-45% aceptable, >45% tensionado.">Personal/Ventas</th>
                  <th className="px-4 py-3 text-right font-semibold text-blue-600 cursor-help" title="Coste medio anual por empleado (Gto. Personal ÷ Plantilla Media). Incluye salario bruto, Seguridad Social a cargo de la empresa, indemnizaciones y otros gastos sociales.">Coste/Empl.</th>
                  <th className="px-4 py-3 text-right font-semibold text-green-700 cursor-help" title="Productividad por empleado: facturación generada por cada trabajador (Ventas ÷ Plantilla Media). A mayor valor, mayor productividad.">Ventas/Empl.</th>
                  <th className="px-4 py-3 text-right font-semibold text-indigo-600 cursor-help" title="Beneficio operativo (EBITDA) generado por cada empleado (EBITDA ÷ Plantilla Media). Mide la capacidad de cada trabajador para generar resultado antes de amortizaciones, intereses e impuestos.">EBITDA/Empl.</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 cursor-help" title="Cobertura laboral: cuántas veces las ventas cubren el gasto de personal (Ventas ÷ Gto. Personal). Valores >2x indican margen holgado; <1,5x indica tensión estructural.">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {comparativaAnual.map(d => (
                  <tr key={d.año} className={`border-b hover:bg-gray-50 ${d.año === String(añoActual) ? 'bg-purple-50/50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-gray-800">{d.año}</td>
                    <td className="px-4 py-3 text-right text-purple-700 font-semibold">{d.plantillaMedia || '-'}</td>
                    <td className="px-4 py-3 text-right text-purple-700">{formatCurrency(d.totalPersonal)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{formatCurrency(d.totalVentas)}</td>
                    <td className={`px-4 py-3 text-right ${getPersonalColor(d.personalSobreVentas)}`}>
                      {formatPercent(d.personalSobreVentas)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700">{d.costeMedioEmpleado ? formatCurrency(d.costeMedioEmpleado) : '-'}</td>
                    <td className="px-4 py-3 text-right text-green-700">{d.ventasPorEmpleado ? formatCurrency(d.ventasPorEmpleado) : '-'}</td>
                    <td className="px-4 py-3 text-right text-indigo-700">{d.ebitdaPorEmpleado ? formatCurrency(d.ebitdaPorEmpleado) : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.coberturaLaboral ? `${d.coberturaLaboral.toFixed(1)}x` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Gráficos interanuales */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Evolución Ventas/Empleado por Ejercicio</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={comparativaAnual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="año" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => formatCompact(v).replace(' €', '')} />
                  <Tooltip content={<PersonalTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="ventasPorEmpleado" name="Ventas/Empl." fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="costeMedioEmpleado" name="Coste/Empl." fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal/Ventas (%) por Ejercicio</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={comparativaAnual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="año" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<PersonalTooltip />} />
                  <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="5 5" />
                  <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="5 5" />
                  <Bar dataKey="personalSobreVentas" name="% Personal/Ventas" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Line dataKey="plantillaMedia" name="Plantilla Media" stroke="#1a365d" strokeWidth={2} yAxisId={1} dot={{ r: 4 }} />
                  <YAxis yAxisId={1} orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========== PRODUCTIVIDAD (horas calendario + gastos) ========== */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Productividad y Costes por Hora — {añoActual}</span>
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/80 italic" title={calendarioAño?._estimado ? `No hay calendario propio para ${añoActual}. Se ha estimado reutilizando el calendario de ${calendarioAño._añoBase} con las fechas de festivos ajustadas al año en curso.` : ''}>
              {calendarioAño
                ? `Calendario laboral ${calendarioAño._estimado ? `(estimado desde ${calendarioAño._añoBase})` : ''}: ${calendarioAño.horas_dia}h/día · total ${Object.values(horasLabMes).reduce((s, h) => s + h, 0)}h`
                : 'Sin calendario laboral configurado (revisa FMV Producción → Admin → Calendario)'}
            </span>
            <select
              value={mesProd}
              onChange={(e) => setMesProd(e.target.value === 'año' ? 'año' : parseInt(e.target.value))}
              className="px-2 py-1 bg-white/20 text-white rounded border border-white/30 text-xs"
              title="Periodo de cálculo de las tarjetas: media del año o un mes concreto (útil si un mes viene incompleto)"
            >
              <option value="año" className="text-gray-800">Media del año</option>
              {mesesProdConDatos.map(d => (
                <option key={d.mesNum} value={d.mesNum} className="text-gray-800">{MONTHS_SHORT[d.mesNum - 1]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPIs resumen productividad */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 border-b">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="text-[10px] font-semibold text-blue-700 uppercase">Gastos/Hora{mesProd !== 'año' && ` · ${MONTHS_SHORT[mesProd - 1]}`}</div>
            <div className="text-xl font-bold text-blue-700">{formatCurrency(kpisProd.gastosHoraTotal)}</div>
            <div className="text-[10px] text-blue-600 mt-1">Total coste por hora trabajada</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="text-[10px] font-semibold text-green-700 uppercase">Ingresos/Hora{mesProd !== 'año' && ` · ${MONTHS_SHORT[mesProd - 1]}`}</div>
            <div className="text-xl font-bold text-green-700">{formatCurrency(kpisProd.ingresosHora)}</div>
            <div className="text-[10px] text-green-600 mt-1">Facturación por hora trabajada</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            <div className="text-[10px] font-semibold text-emerald-700 uppercase">Ingresos/Trabajador{mesProd !== 'año' && ` · ${MONTHS_SHORT[mesProd - 1]}`}</div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(kpisProd.ingresosPorTrabajador)}</div>
            <div className="text-[10px] text-emerald-600 mt-1">{mesProd === 'año' ? 'Facturación media anual por empleado' : 'Facturación del mes por empleado'}</div>
          </div>
          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
            <div className="text-[10px] font-semibold text-indigo-700 uppercase">Ventas/Día Lab.{mesProd !== 'año' && ` · ${MONTHS_SHORT[mesProd - 1]}`}</div>
            <div className="text-xl font-bold text-indigo-700">{formatCurrency(kpisProd.ventasDiaLab)}</div>
            <div className="text-[10px] text-indigo-600 mt-1">Facturación media por día laborable</div>
          </div>
          <div className={`rounded-lg p-3 border ${kpisProd.pctGastosVentas > 95 ? 'bg-red-50 border-red-100' : kpisProd.pctGastosVentas > 85 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
            <div className="text-[10px] font-semibold uppercase text-gray-700">% Gastos/Ventas{mesProd !== 'año' && ` · ${MONTHS_SHORT[mesProd - 1]}`}</div>
            <div className={`text-xl font-bold ${kpisProd.pctGastosVentas > 95 ? 'text-red-700' : kpisProd.pctGastosVentas > 85 ? 'text-amber-700' : 'text-green-700'}`}>
              {formatPercent(kpisProd.pctGastosVentas)}
            </div>
            <div className="text-[10px] text-gray-600 mt-1">Peso de gastos operativos sobre ventas</div>
          </div>
        </div>

        {/* Tabla mensual productividad */}
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-2 text-left font-semibold text-gray-600">Mes</th>
                <th className="px-2 py-2 text-right font-semibold text-purple-600 cursor-help" title="Nº de trabajadores en plantilla ese mes. Editable en la tabla de Ratios de Personal de arriba.">Trab.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600 cursor-help" title="Horas laborables del mes por persona, calculadas desde el calendario laboral (tabla prod_calendario compartida con FMV Producción). Descuenta fines de semana, festivos y vacaciones de agosto.">Horas Lab.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600 cursor-help" title="Días laborables equivalentes del mes (Horas Lab. ÷ horas/día del calendario). Un día de media jornada cuenta como 0,5.">Días Lab.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-700 cursor-help" title="Horas totales trabajadas por la plantilla. Por defecto se calculan como Trabajadores × Horas Lab., pero puedes escribirlas a mano haciendo clic en la celda (deja la celda vacía para volver al cálculo automático). Base para los costes e ingresos por hora.">Horas Tot. ✎</th>
                <th className="px-2 py-2 text-right font-semibold text-purple-700 cursor-help" title="Gasto de personal COMPLETO del mes (grupo 64: sueldos 640 + indemnizaciones 641 + Seg. Social empresa 642 + otros gastos sociales 643-649). Coincide con la línea Personal del PyG.">Personal</th>
                <th className="px-2 py-2 text-right font-semibold text-rose-700 cursor-help" title="Gastos de grupo 60 del mes (compras de materia prima, subcontrataciones, envases, etc.). Son costes directos dentro del margen bruto.">Proveed.</th>
                <th className="px-2 py-2 text-right font-semibold text-orange-700 cursor-help" title="Servicios exteriores (grupo 62): arrendamientos, reparaciones, suministros, etc. Son gastos por debajo del margen bruto.">Acreed.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-600 cursor-help" title="Resto de gastos del grupo 6: tributos (63), otros gastos de gestión (65), gastos financieros (66), pérdidas (67), amortizaciones (68) y deterioros (69). No incluye la variación de existencias (61), que es un ajuste contable y no un gasto operativo.">Resto Ind.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-800 cursor-help" title="Suma de Personal + Proveedores + Acreedores + Resto: TODOS los gastos del grupo 6 del mes.">Total Gtos.</th>
                <th className="px-2 py-2 text-right font-semibold text-green-700 cursor-help" title="Importe neto de la cifra de negocios del mes (ventas).">Ingresos</th>
                <th className="px-2 py-2 text-right font-semibold text-blue-600 cursor-help" title="Total Gastos ÷ Trabajadores. Coste total promedio por empleado en el mes.">Gtos./Trab.</th>
                <th className="px-2 py-2 text-right font-semibold text-blue-700 cursor-help" title="Coste laboral COMPLETO por hora trabajada (Personal ÷ Horas Totales): sueldos + Seg. Social de empresa + indemnizaciones + otros gastos sociales. Es lo que de verdad cuesta cada hora de plantilla.">Gtos./h Pers.</th>
                <th className="px-2 py-2 text-right font-semibold text-rose-700 cursor-help" title="Coste por hora trabajada — solo proveedores grupo 60 (Proveedores ÷ Horas Totales).">Gtos./h Prov.</th>
                <th className="px-2 py-2 text-right font-semibold text-orange-700 cursor-help" title="Coste por hora trabajada — solo acreedores / servicios exteriores (Acreedores ÷ Horas Totales).">Gtos./h Acr.</th>
                <th className="px-2 py-2 text-right font-semibold text-gray-900 cursor-help" title="Coste total por hora trabajada (Total Gastos ÷ Horas Totales).">Gtos./h Tot.</th>
                <th className="px-2 py-2 text-right font-semibold text-green-700 cursor-help" title="Facturación por hora trabajada (Ingresos ÷ Horas Totales). Comparar con Gtos./h Tot. para ver el margen por hora.">Ingr./Hora</th>
                <th className="px-2 py-2 text-right font-semibold text-emerald-700 cursor-help" title="Facturación mensual por empleado (Ingresos ÷ Trabajadores).">Ingr./Trab.</th>
                <th className="px-2 py-2 text-right font-semibold text-indigo-700 cursor-help" title="Facturación media por día laborable del mes (Ingresos ÷ Días Lab.).">Vtas./Día</th>
                <th className="px-2 py-2 text-right font-semibold text-amber-700 cursor-help" title="Peso de los gastos operativos (640 + 60 + 62) sobre las ventas. >95% indica margen muy ajustado.">% G/V</th>
              </tr>
            </thead>
            <tbody>
              {productividadMensual.map(d => {
                const tieneDatos = !d.futuro && (d.ingresos !== 0 || d.totalGastos !== 0)
                if (!tieneDatos) return null
                return (
                  <tr key={d.mes} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-2 py-2 font-medium text-gray-700">{d.mes}</td>
                    <td className="px-2 py-2 text-right text-purple-700">{d.trabajadores || '-'}</td>
                    <td className="px-2 py-2 text-right text-gray-600">{d.horasLab || '-'}</td>
                    <td className="px-2 py-2 text-right text-gray-600">{d.diasLab || '-'}</td>
                    <td
                      className={`px-2 py-2 text-right font-medium cursor-text hover:bg-blue-50 ${d.horasManual ? 'text-blue-700' : 'text-gray-800'}`}
                      onClick={() => {
                        if (editHorasMes === d.mesNum) return
                        setEditHorasMes(d.mesNum)
                        setEditHorasValue(d.horasManual ? String(d.horasTotales) : '')
                      }}
                      title={d.horasManual ? 'Horas escritas a mano (clic para editar; deja vacío para volver al cálculo automático)' : 'Clic para escribir las horas totales a mano'}
                    >
                      {editHorasMes === d.mesNum ? (
                        <input
                          autoFocus
                          type="text"
                          inputMode="decimal"
                          value={editHorasValue}
                          disabled={saving}
                          onChange={(e) => setEditHorasValue(e.target.value)}
                          onBlur={() => handleSaveHoras(d.mesNum)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveHoras(d.mesNum)
                            if (e.key === 'Escape') { setEditHorasMes(null); setEditHorasValue('') }
                          }}
                          className="w-16 px-1 py-0.5 text-right border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        <>{d.horasTotales ? formatNumber(d.horasTotales, 0) : '-'}{d.horasManual && <span className="ml-0.5 text-[9px] align-super">✎</span>}</>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right text-purple-700">{formatCurrency(d.personalCompleto)}</td>
                    <td className="px-2 py-2 text-right text-rose-700">{formatCurrency(d.proveedores)}</td>
                    <td className="px-2 py-2 text-right text-orange-700">{formatCurrency(d.acreedores)}</td>
                    <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(d.resto)}</td>
                    <td className="px-2 py-2 text-right text-gray-900 font-semibold">{formatCurrency(d.totalGastos)}</td>
                    <td className="px-2 py-2 text-right text-green-700 font-semibold">{formatCurrency(d.ingresos)}</td>
                    <td className="px-2 py-2 text-right text-blue-700">{d.gastosPorTrabajador != null ? formatCurrency(d.gastosPorTrabajador) : '-'}</td>
                    <td className="px-2 py-2 text-right text-blue-700">{d.gastosHoraManoObra != null ? formatCurrency(d.gastosHoraManoObra) : '-'}</td>
                    <td className="px-2 py-2 text-right text-rose-700">{d.gastosHoraProveedores != null ? formatCurrency(d.gastosHoraProveedores) : '-'}</td>
                    <td className="px-2 py-2 text-right text-orange-700">{d.gastosHoraAcreedores != null ? formatCurrency(d.gastosHoraAcreedores) : '-'}</td>
                    <td className="px-2 py-2 text-right text-gray-900 font-semibold">{d.gastosHoraTotal != null ? formatCurrency(d.gastosHoraTotal) : '-'}</td>
                    <td className="px-2 py-2 text-right text-green-700 font-semibold">{d.ingresosHora != null ? formatCurrency(d.ingresosHora) : '-'}</td>
                    <td className="px-2 py-2 text-right text-emerald-700">{d.ingresosPorTrabajador != null ? formatCurrency(d.ingresosPorTrabajador) : '-'}</td>
                    <td className="px-2 py-2 text-right text-indigo-700">{d.ventasDiaLab != null ? formatCurrency(d.ventasDiaLab) : '-'}</td>
                    <td className={`px-2 py-2 text-right font-semibold ${d.pctGastosVentas == null ? 'text-gray-400' : d.pctGastosVentas > 95 ? 'text-red-600' : d.pctGastosVentas > 85 ? 'text-amber-600' : 'text-green-600'}`}>
                      {d.pctGastosVentas != null ? formatPercent(d.pctGastosVentas) : '-'}
                    </td>
                  </tr>
                )
              })}
              {/* Fila total */}
              <tr className="bg-purple-50 border-t-2 border-purple-300 font-bold">
                <td className="px-2 py-2 text-gray-800">TOTAL</td>
                <td className="px-2 py-2 text-right text-purple-700">{productividadTotales.plantillaMediaProd ? Math.round(productividadTotales.plantillaMediaProd * 10) / 10 : '-'}</td>
                <td className="px-2 py-2 text-right text-gray-700">{Object.values(horasLabMes).reduce((s, h) => s + h, 0)}</td>
                <td className="px-2 py-2 text-right text-gray-700">{productividadTotales.totalDias ? productividadTotales.totalDias.toFixed(0) : '-'}</td>
                <td className="px-2 py-2 text-right text-gray-800">{productividadTotales.totalHoras ? formatNumber(productividadTotales.totalHoras, 0) : '-'}</td>
                <td className="px-2 py-2 text-right text-purple-700">{formatCurrency(productividadTotales.totalPersonal)}</td>
                <td className="px-2 py-2 text-right text-rose-700">{formatCurrency(productividadTotales.totalProveedores)}</td>
                <td className="px-2 py-2 text-right text-orange-700">{formatCurrency(productividadTotales.totalAcreedores)}</td>
                <td className="px-2 py-2 text-right text-gray-600">{formatCurrency(productividadTotales.totalResto)}</td>
                <td className="px-2 py-2 text-right text-gray-900">{formatCurrency(productividadTotales.totalGastos)}</td>
                <td className="px-2 py-2 text-right text-green-700">{formatCurrency(productividadTotales.totalIngresos)}</td>
                <td className="px-2 py-2 text-right text-blue-700">{productividadTotales.plantillaMediaProd ? formatCurrency(productividadTotales.totalGastos / productividadTotales.plantillaMediaProd) : '-'}</td>
                <td className="px-2 py-2 text-right text-blue-700">{productividadTotales.totalHoras ? formatCurrency(productividadTotales.totalPersonal / productividadTotales.totalHoras) : '-'}</td>
                <td className="px-2 py-2 text-right text-rose-700">{productividadTotales.totalHoras ? formatCurrency(productividadTotales.totalProveedores / productividadTotales.totalHoras) : '-'}</td>
                <td className="px-2 py-2 text-right text-orange-700">{productividadTotales.totalHoras ? formatCurrency(productividadTotales.totalAcreedores / productividadTotales.totalHoras) : '-'}</td>
                <td className="px-2 py-2 text-right text-gray-900">{formatCurrency(productividadTotales.gastosHoraTotal)}</td>
                <td className="px-2 py-2 text-right text-green-700">{formatCurrency(productividadTotales.ingresosHora)}</td>
                <td className="px-2 py-2 text-right text-emerald-700">{formatCurrency(productividadTotales.ingresosPorTrabajador)}</td>
                <td className="px-2 py-2 text-right text-indigo-700">{formatCurrency(productividadTotales.ventasDiaLab)}</td>
                <td className={`px-2 py-2 text-right ${productividadTotales.pctGastosVentas > 95 ? 'text-red-700' : productividadTotales.pctGastosVentas > 85 ? 'text-amber-700' : 'text-green-700'}`}>
                  {formatPercent(productividadTotales.pctGastosVentas)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Gráfico Ingresos/Hora vs Gastos/Hora */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Ingresos vs Gastos por hora <span className="text-[10px] font-normal text-gray-400">(líneas: umbrales sector metal)</span></h4>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={productividadMensual.filter(d => d.horasTotales > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `${v}€`} />
                <Tooltip content={<PersonalTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {/* Umbrales sector: Gastos/h saludable 42-52, tensión >55. Ingresos/h saludable 50-65 */}
                <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Gtos. tensión 55€', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }} />
                <ReferenceLine y={42} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Gtos. saludable ≤42€', position: 'insideTopRight', fontSize: 9, fill: '#10b981' }} />
                <ReferenceLine y={65} stroke="#059669" strokeDasharray="4 4" label={{ value: 'Ingr. excelente ≥65€', position: 'insideBottomRight', fontSize: 9, fill: '#059669' }} />
                <Bar dataKey="gastosHoraTotal" name="Gastos/Hora" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="ingresosHora" name="Ingresos/Hora" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">% Gastos sobre Ventas</h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={productividadMensual.filter(d => d.pctGastosVentas != null)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={v => `${v}%`} />
                <Tooltip content={<PersonalTooltip />} />
                <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '95%', fontSize: 10, fill: '#ef4444' }} />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: '85%', fontSize: 10, fill: '#f59e0b' }} />
                <Bar dataKey="pctGastosVentas" name="% Gastos/Ventas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========== POSICIONAMIENTO SECTOR ========== */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>🎯</span>
            <span>Posicionamiento Sector — Estructuras Metálicas / MIG-TIG</span>
          </h3>
          <span className="text-xs text-white/80 italic cursor-help" title="Fuentes: DBK Informe Sectorial Estructuras Metálicas, Banco de España Central de Balances (panel PYMEs CNAE 25), convenios colectivos del metal. Rangos orientativos para empresas 2-10M €.">
            CNAE 25.11 / 25.62 · PYMEs 2-10M €
          </span>
        </div>
        <div className="p-4">
          {['Costes', 'Hora', 'Empleado'].map(grupo => {
            const GRUPO_TITULOS = {
              Costes: { titulo: 'Costes y márgenes (% sobre ventas)', icono: '💰' },
              Hora: { titulo: 'Productividad por hora trabajada', icono: '⏱️' },
              Empleado: { titulo: 'Productividad por empleado (anual)', icono: '👤' }
            }
            const items = posicionamientoSector.filter(r => r.grupo === grupo)
            return (
              <div key={grupo} className="mb-5 last:mb-0">
                <h4 className="text-xs font-bold uppercase text-gray-600 mb-2 flex items-center gap-2">
                  <span>{GRUPO_TITULOS[grupo].icono}</span>
                  {GRUPO_TITULOS[grupo].titulo}
                </h4>
                <div className="space-y-2">
                  {items.map(row => {
                    const clases = SEMAFORO_CLASES[row.evaluacion.color] || SEMAFORO_CLASES.gray
                    return (
                      <div key={row.key} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${clases.bg} ${clases.border}`}>
                        {/* Label + tooltip */}
                        <div className="flex-shrink-0 w-44 cursor-help" title={row.bench.descripcion}>
                          <div className="text-xs font-semibold text-gray-800">{row.bench.label}</div>
                          <div className="text-[10px] text-gray-500">Saludable: {rangoSaludableTexto(row.bench)}</div>
                        </div>
                        {/* Valor FMV */}
                        <div className="flex-shrink-0 w-24 text-right">
                          <div className={`text-sm font-bold ${clases.text}`}>{formatPosicionValor(row.valor, row.format)}</div>
                          <div className="text-[10px] text-gray-500">FMV</div>
                        </div>
                        {/* Barra de posición */}
                        <div className="flex-1 min-w-[100px]">
                          <div className="relative h-4 rounded-full overflow-hidden bg-gradient-to-r from-red-200 via-amber-200 to-green-200 border border-gray-300">
                            <div
                              className="absolute top-0 h-full w-1 bg-gray-900 shadow-md"
                              style={{ left: `${row.posicion}%` }}
                              title={`Posición en escala sectorial: ${row.posicion.toFixed(0)}%`}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-gray-500 mt-0.5">
                            <span>Tensión</span>
                            <span>Saludable</span>
                            <span>Excelente</span>
                          </div>
                        </div>
                        {/* Pill estado */}
                        <div className="flex-shrink-0 w-24 text-right">
                          <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full ${clases.bg} ${clases.text} border ${clases.border}`}>
                            {row.evaluacion.label.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="mt-4 text-[10px] text-gray-500 italic border-t pt-3">
            Los rangos son orientativos y pueden variar según subsector (subcontratación pura vs. llave en mano),
            tamaño de empresa y ubicación geográfica. Úsalos como guía, no como regla estricta.
          </div>
        </div>
      </div>

      {/* ========== GUIA DE RATIOS ========== */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>💡</span>
            <span>Guía de Ratios</span>
          </h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <h4 className="font-semibold text-purple-800 mb-1">Personal / Ventas</h4>
              <p className="text-purple-700">Peso de los costes laborales sobre la facturación. Sector industrial: 25-35% es saludable, &gt;40% alerta.</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-1">Coste Medio por Empleado</h4>
              <p className="text-blue-700">Coste laboral total (sueldos + SS + otros) dividido entre plantilla media. Indica el coste real de cada trabajador.</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <h4 className="font-semibold text-green-800 mb-1">Ventas por Empleado</h4>
              <p className="text-green-700">Productividad comercial de la plantilla. Más facturación por empleado = mayor eficiencia operativa.</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
              <h4 className="font-semibold text-indigo-800 mb-1">EBITDA por Empleado</h4>
              <p className="text-indigo-700">Rentabilidad operativa por trabajador. Es el ratio clave: mide cuánto beneficio genera cada empleado.</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <h4 className="font-semibold text-amber-800 mb-1">Cobertura Laboral</h4>
              <p className="text-amber-700">Ventas / Gasto Personal. Indica cuántos euros de venta genera cada euro invertido en personal. &gt;3x es saludable.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-1">Peso Salarial vs SS</h4>
              <p className="text-gray-700">Proporción sueldos brutos (640) frente a Seg. Social empresa (642). Habitual: 70-75% sueldos, 25-30% SS.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== CARGA DE TRABAJADORES ========== */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>📤</span>
            <span>Cargar Datos de Plantilla</span>
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Puedes introducir el número de trabajadores de cada mes haciendo <strong>click en la columna "Trabaj."</strong> de la tabla superior,
            o cargar un Excel con el formato: columnas = años, filas 1-12 = meses (enero a diciembre).
          </p>

          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/30'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.xlsx,.xls'
              input.onchange = (e) => {
                if (e.target.files[0]) handleFile(e.target.files[0])
              }
              input.click()
            }}
          >
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-medium text-gray-700">
              Arrastra aquí el Excel de trabajadores mensuales
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o haz click para seleccionar archivo (.xlsx)
            </p>
          </div>

          {/* Resumen datos cargados */}
          {Object.keys(trabajadoresMensuales).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Datos cargados</h4>
              <div className="flex flex-wrap gap-3">
                {Object.entries(trabajadoresMensuales).sort(([a], [b]) => b - a).map(([año, meses]) => (
                  <div key={año} className="bg-white rounded px-3 py-1.5 border text-xs">
                    <span className="font-semibold text-gray-800">{año}</span>
                    <span className="text-gray-500 ml-1">({Object.keys(meses).length} meses)</span>
                    <span className="text-purple-600 ml-1">
                      media: {Math.round(Object.values(meses).reduce((s, v) => s + v, 0) / Object.keys(meses).length)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
