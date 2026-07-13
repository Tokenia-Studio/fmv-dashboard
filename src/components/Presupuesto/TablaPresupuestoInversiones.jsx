// ============================================
// TABLA PRESUPUESTO INVERSIONES - CAPEX (grupo 2) vs presupuesto
// Misma estructura de columnas que el PyG Presupuesto vs Real.
// Real = altas de inmovilizado (debe − haber). Se excluyen 28x/29x
// (amortización acumulada y deterioros: no son inversión).
// ============================================

import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatExcelNumber, getValueClass } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import { exportarLibroMovimientos } from '../../utils/exportExcel'
import ExportButton from '../UI/ExportButton'

// Familias del grupo 2 con fila propia (solo se pintan las que tienen datos)
const FAMILIAS = [
  { prefijo: '20', label: 'Inmovilizado intangible', icon: '💡' },
  { prefijo: '21', label: 'Inmovilizado material', icon: '🏭' },
  { prefijo: '22', label: 'Inversiones inmobiliarias', icon: '🏢' },
  { prefijo: '23', label: 'Inmovilizado en curso y anticipos', icon: '🚧' },
  { prefijo: '24', label: 'Inversiones financieras en el grupo', icon: '📈' },
  { prefijo: '25', label: 'Otras inversiones financieras L/P', icon: '📈' },
  { prefijo: '26', label: 'Fianzas y depósitos L/P', icon: '🔒' },
  { prefijo: '27', label: 'Otras cuentas grupo 2', icon: '📦' }
]

// Nombres PGC de las cuentas 3 dígitos más habituales del grupo 2
const NOMBRES_CUENTA_2 = {
  '200': 'Investigación', '201': 'Desarrollo', '202': 'Concesiones administrativas',
  '203': 'Propiedad industrial', '204': 'Fondo de comercio', '205': 'Derechos de traspaso',
  '206': 'Aplicaciones informáticas', '209': 'Anticipos inmov. intangible',
  '210': 'Terrenos y bienes naturales', '211': 'Construcciones',
  '212': 'Instalaciones técnicas', '213': 'Maquinaria', '214': 'Utillaje',
  '215': 'Otras instalaciones', '216': 'Mobiliario',
  '217': 'Equipos procesos información', '218': 'Elementos de transporte',
  '219': 'Otro inmovilizado material',
  '220': 'Inversiones en terrenos', '221': 'Inversiones en construcciones',
  '230': 'Adaptación de terrenos', '231': 'Construcciones en curso',
  '232': 'Instalaciones en curso', '233': 'Maquinaria en montaje',
  '237': 'Anticipos inmov. material', '239': 'Anticipos inmov. en curso',
  '240': 'Participaciones grupo', '250': 'Participaciones L/P',
  '251': 'Valores renta fija L/P', '252': 'Créditos L/P',
  '260': 'Fianzas constituidas L/P', '265': 'Depósitos constituidos L/P'
}

// ¿La cuenta es inversión (grupo 2 sin amortización acumulada ni deterioros)?
const esCuentaInversion = (cuenta) =>
  cuenta.startsWith('2') && !cuenta.startsWith('28') && !cuenta.startsWith('29')

// Interpreta un importe escrito a mano en formato español ("12.500", "12500,50")
const parsearImporte = (texto) => {
  const limpio = String(texto).replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpio)
  return isNaN(n) ? null : n
}

// Celda de presupuesto editable a mano (guarda al salir o con Enter)
function CeldaPpto({ valor, onGuardar }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')

  const empezar = (e) => {
    e.stopPropagation()
    setTexto(valor ? String(Math.round(valor * 100) / 100).replace('.', ',') : '')
    setEditando(true)
  }

  const confirmar = () => {
    setEditando(false)
    const n = texto.trim() === '' ? 0 : parsearImporte(texto)
    if (n === null || n === valor) return
    onGuardar(n)
  }

  if (editando) {
    return (
      <td className="p-1 text-right bg-blue-50" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmar()
            if (e.key === 'Escape') setEditando(false)
          }}
          className="w-24 px-1 py-0.5 text-right text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </td>
    )
  }

  return (
    <td
      className="p-2 text-right text-gray-500 cursor-text hover:bg-blue-50"
      onClick={empezar}
      title="Clic para escribir el presupuesto de este mes"
    >
      {valor ? formatCurrency(valor) : <span className="text-gray-300">✎ —</span>}
    </td>
  )
}

export default function TablaPresupuestoInversiones({ mesSeleccionado, onMesChange, año }) {
  const { movimientos, presupuestos, proveedores, planCuentas, guardarPresupuestoCelda } = useData()
  const [expanded, setExpanded] = useState(new Set())
  // Cuentas añadidas a mano para presupuestar aunque aún no tengan datos
  const [cuentasExtra, setCuentasExtra] = useState([])
  const [nuevaCuenta, setNuevaCuenta] = useState('')

  const toggleExpand = (key) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Real por subcuenta (9 dígitos): alta de inmovilizado = debe − haber
  const realSubcuentas = useMemo(() => {
    const result = {}
    movimientos.forEach(mov => {
      if (!mov.mes.startsWith(String(año))) return
      if (!esCuentaInversion(mov.cuenta)) return
      const sub = mov.cuenta
      if (!result[sub]) {
        result[sub] = { cuenta3: sub.substring(0, 3), meses: {}, descripcion: mov.descripcion || '' }
        for (let m = 1; m <= 12; m++) result[sub].meses[m] = 0
      }
      if (!result[sub].descripcion && mov.descripcion) result[sub].descripcion = mov.descripcion
      const mes = parseInt(mov.mes.split('-')[1])
      result[sub].meses[mes] += mov.debe - mov.haber
    })
    return result
  }, [movimientos, año])

  // Real agregado a 3 dígitos
  const realCuenta3 = useMemo(() => {
    const result = {}
    Object.values(realSubcuentas).forEach(data => {
      if (!result[data.cuenta3]) {
        result[data.cuenta3] = { meses: {} }
        for (let m = 1; m <= 12; m++) result[data.cuenta3].meses[m] = 0
      }
      for (let m = 1; m <= 12; m++) result[data.cuenta3].meses[m] += data.meses[m]
    })
    return result
  }, [realSubcuentas])

  // Presupuesto del grupo 2 indexado por cuenta (3 o 9 dígitos) y agregado a 3
  const presPorCuenta = useMemo(() => {
    const result = {}
    presupuestos.forEach(p => {
      if (!esCuentaInversion(String(p.cuenta))) return
      const cuenta = String(p.cuenta)
      if (!result[cuenta]) result[cuenta] = { meses: {} }
      result[cuenta].meses[p.mes] = (result[cuenta].meses[p.mes] || 0) + p.importe
    })
    return result
  }, [presupuestos])

  const presCuenta3 = useMemo(() => {
    const result = {}
    Object.entries(presPorCuenta).forEach(([cuenta, data]) => {
      const c3 = cuenta.substring(0, 3)
      if (!result[c3]) result[c3] = { meses: {} }
      Object.entries(data.meses).forEach(([mes, imp]) => {
        result[c3].meses[mes] = (result[c3].meses[mes] || 0) + imp
      })
    })
    return result
  }, [presPorCuenta])

  // Helpers de valor mes / acumulado
  const real3 = (c3, m) => realCuenta3[c3]?.meses[m] || 0
  const pres3 = (c3, m) => presCuenta3[c3]?.meses[m] || 0
  const realSub = (sub, m) => realSubcuentas[sub]?.meses[m] || 0
  const presSub = (sub, m) => presPorCuenta[sub]?.meses[m] || 0
  const acum = (fn, id) => {
    let total = 0
    for (let m = 1; m <= mesSeleccionado; m++) total += fn(id, m)
    return total
  }

  // Cuentas 3 dígitos con datos (o añadidas a mano), agrupadas por familia
  const cuentas3ConDatos = useMemo(() => {
    const todas = new Set([...Object.keys(realCuenta3), ...Object.keys(presCuenta3)])
    const conDatos = [...todas].filter(c3 => {
      const hayReal = realCuenta3[c3] && Object.values(realCuenta3[c3].meses).some(v => Math.abs(v) > 0.005)
      const hayPres = presCuenta3[c3] && Object.values(presCuenta3[c3].meses).some(v => Math.abs(v) > 0.005)
      return hayReal || hayPres
    })
    return [...new Set([...conDatos, ...cuentasExtra])].sort()
  }, [realCuenta3, presCuenta3, cuentasExtra])

  const añadirCuenta = () => {
    if (!nuevaCuenta) return
    setCuentasExtra(prev => [...new Set([...prev, nuevaCuenta])])
    // Expandir la familia para que se vea la cuenta recién añadida
    setExpanded(prev => new Set([...prev, `fam-${nuevaCuenta.substring(0, 2)}`]))
    setNuevaCuenta('')
  }

  const familiasVisibles = FAMILIAS
    .map(f => ({ ...f, cuentas: cuentas3ConDatos.filter(c3 => c3.startsWith(f.prefijo)) }))
    .filter(f => f.cuentas.length > 0)

  // Valores de una familia (suma de sus cuentas 3 dígitos)
  const familia = (f, fn, m) => f.cuentas.reduce((s, c3) => s + fn(c3, m), 0)
  const familiaAcum = (f, fn) => {
    let total = 0
    for (let m = 1; m <= mesSeleccionado; m++) total += familia(f, fn, m)
    return total
  }

  // Total inversiones
  const totalMes = (fn) => cuentas3ConDatos.reduce((s, c3) => s + fn(c3, mesSeleccionado), 0)
  const totalAcum = (fn) => cuentas3ConDatos.reduce((s, c3) => s + acum(fn, c3), 0)

  const calcVar = (real, pres) => {
    if (!pres || pres === 0) return null
    return ((real - pres) / Math.abs(pres)) * 100
  }

  // En inversión, gastar más de lo presupuestado es desviación mala (rojo)
  const formatVar = (valor) => {
    if (valor === null || valor === undefined) return <span className="text-gray-400">-</span>
    const color = valor <= 0 ? 'text-green-600' : 'text-red-600'
    return <span className={color}>{valor >= 0 ? '+' : ''}{valor.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
  }

  const nombre3 = (c3) => planCuentas[c3] || NOMBRES_CUENTA_2[c3] || `Cuenta ${c3}`

  // Export de movimientos de una cuenta (prefijo) en el mes o acumulado
  const exportarMovs = (prefijo, esMes) => {
    const movs = movimientos.filter(mov => {
      if (!mov.mes.startsWith(String(año))) return false
      if (!mov.cuenta.startsWith(prefijo) || !esCuentaInversion(mov.cuenta)) return false
      const m = parseInt(mov.mes.split('-')[1])
      return esMes ? m === mesSeleccionado : m <= mesSeleccionado
    })
    if (movs.length === 0) {
      alert('No hay movimientos para exportar')
      return
    }
    const periodo = esMes ? MONTHS_SHORT[mesSeleccionado - 1] : `Ene-${MONTHS_SHORT[mesSeleccionado - 1]}`
    exportarLibroMovimientos(
      [{ nombre: `Inversiones ${prefijo}`, movimientos: movs }],
      `Inversiones_${prefijo}_${año}_${periodo}`,
      proveedores
    )
  }

  // Export del resumen de la tabla
  const exportarResumen = () => {
    const filas = []
    familiasVisibles.forEach(f => {
      filas.push({
        Concepto: f.label,
        'Ppto. Mes': formatExcelNumber(familia(f, pres3, mesSeleccionado)),
        'Real Mes': formatExcelNumber(familia(f, real3, mesSeleccionado)),
        'Ppto. Acum': formatExcelNumber(familiaAcum(f, pres3)),
        'Real Acum': formatExcelNumber(familiaAcum(f, real3))
      })
      f.cuentas.forEach(c3 => {
        filas.push({
          Concepto: `  ${c3} ${nombre3(c3)}`,
          'Ppto. Mes': formatExcelNumber(pres3(c3, mesSeleccionado)),
          'Real Mes': formatExcelNumber(real3(c3, mesSeleccionado)),
          'Ppto. Acum': formatExcelNumber(acum(pres3, c3)),
          'Real Acum': formatExcelNumber(acum(real3, c3))
        })
      })
    })
    filas.push({
      Concepto: 'TOTAL INVERSIONES',
      'Ppto. Mes': formatExcelNumber(totalMes(pres3)),
      'Real Mes': formatExcelNumber(totalMes(real3)),
      'Ppto. Acum': formatExcelNumber(totalAcum(pres3)),
      'Real Acum': formatExcelNumber(totalAcum(real3))
    })
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [{ wch: 38 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inversiones vs Ppto')
    XLSX.writeFile(wb, `Inversiones_Ppto_vs_Real_${año}_${MONTHS_SHORT[mesSeleccionado - 1]}.xlsx`)
  }

  const sinDatos = familiasVisibles.length === 0

  // Subcuentas de una cuenta 3 dígitos (con datos)
  const subcuentasDe = (c3) => {
    const subs = new Set()
    Object.entries(realSubcuentas).forEach(([sub, d]) => { if (d.cuenta3 === c3) subs.add(sub) })
    Object.keys(presPorCuenta).forEach(sub => { if (sub.length > 3 && sub.startsWith(c3)) subs.add(sub) })
    return [...subs].sort()
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>🏗️</span>
          <span>Inversiones (CAPEX) Presupuesto vs Real {año}</span>
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
          <ExportButton onClick={exportarResumen} label="Exportar" className="text-white bg-white/20 hover:bg-white/30" />
        </div>
      </div>

      {sinDatos ? (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">🏗️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin inversiones en {año}</h3>
          <p className="text-gray-500 mb-4">No hay movimientos ni presupuesto en cuentas del grupo 2 (sin contar 28x/29x)</p>
          <div className="flex items-center justify-center gap-2">
            <select
              value={nuevaCuenta}
              onChange={(e) => setNuevaCuenta(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 text-gray-700"
            >
              <option value="">+ Añadir cuenta a presupuestar…</option>
              {Object.entries(NOMBRES_CUENTA_2).map(([c3, nombre]) => (
                <option key={c3} value={c3}>{c3} — {nombre}</option>
              ))}
            </select>
            <button
              onClick={añadirCuenta}
              disabled={!nuevaCuenta}
              className="text-sm px-3 py-1 rounded bg-brand-primary text-white disabled:opacity-40"
            >
              Añadir
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-auto max-h-[82vh]">
            <table className="w-full text-sm">
              <thead className="table-header sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 text-left min-w-[240px]">Concepto</th>
                  <th className="p-3 text-right">Ppto. Mes</th>
                  <th className="p-3 text-right">Real Mes</th>
                  <th className="p-3 text-right">Var.</th>
                  <th className="p-3 text-right bg-slate-200">Ppto. Acum</th>
                  <th className="p-3 text-right bg-slate-200">Real Acum</th>
                  <th className="p-3 text-right bg-slate-200">Var.</th>
                </tr>
              </thead>
              <tbody>
                {familiasVisibles.map(f => {
                  const fKey = `fam-${f.prefijo}`
                  const isExpanded = expanded.has(fKey)
                  const pM = familia(f, pres3, mesSeleccionado)
                  const rM = familia(f, real3, mesSeleccionado)
                  const pA = familiaAcum(f, pres3)
                  const rA = familiaAcum(f, real3)

                  const filas = [(
                    <tr
                      key={fKey}
                      className="bg-amber-50 font-semibold cursor-pointer select-none hover:bg-amber-100"
                      onClick={() => toggleExpand(fKey)}
                    >
                      <td className="p-3">
                        <span className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 w-4 inline-block">{isExpanded ? '▼' : '▶'}</span>
                          <span className="mr-1">{f.icon}</span>
                          {f.label}
                        </span>
                      </td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(pM)}</td>
                      <td
                        className="p-3 text-right font-medium cursor-pointer hover:bg-blue-50 hover:underline"
                        onClick={(e) => { e.stopPropagation(); exportarMovs(f.prefijo, true) }}
                        title="Clic para exportar detalle del mes"
                      >
                        {formatCurrency(rM)}
                      </td>
                      <td className="p-3 text-right">{formatVar(calcVar(rM, pM))}</td>
                      <td className="p-3 text-right bg-slate-50 text-gray-600">{formatCurrency(pA)}</td>
                      <td
                        className="p-3 text-right bg-slate-50 font-medium cursor-pointer hover:bg-blue-100 hover:underline"
                        onClick={(e) => { e.stopPropagation(); exportarMovs(f.prefijo, false) }}
                        title="Clic para exportar detalle acumulado"
                      >
                        {formatCurrency(rA)}
                      </td>
                      <td className="p-3 text-right bg-slate-50">{formatVar(calcVar(rA, pA))}</td>
                    </tr>
                  )]

                  if (isExpanded) {
                    f.cuentas.forEach(c3 => {
                      const c3Key = `c3-${c3}`
                      const isC3Expanded = expanded.has(c3Key)
                      const subs = subcuentasDe(c3)
                      const haySubs = subs.length > 1

                      filas.push(
                        <tr
                          key={c3Key}
                          className={`bg-gray-50 hover:bg-gray-100 ${haySubs ? 'cursor-pointer select-none' : ''}`}
                          onClick={haySubs ? () => toggleExpand(c3Key) : undefined}
                        >
                          <td className="p-2 pl-10">
                            <span className="flex items-center gap-1">
                              {haySubs && (
                                <span className="text-xs text-gray-400 w-4 inline-block">{isC3Expanded ? '▼' : '▶'}</span>
                              )}
                              <span className="text-gray-500 font-mono text-xs mr-1">{c3}</span>
                              {nombre3(c3)}
                            </span>
                          </td>
                          <CeldaPpto
                            valor={pres3(c3, mesSeleccionado)}
                            onGuardar={(importe) => guardarPresupuestoCelda(c3, mesSeleccionado, importe)}
                          />
                          <td
                            className="p-2 text-right font-medium cursor-pointer hover:bg-blue-50 hover:underline"
                            onClick={(e) => { e.stopPropagation(); exportarMovs(c3, true) }}
                            title="Clic para exportar detalle del mes"
                          >
                            {formatCurrency(real3(c3, mesSeleccionado))}
                          </td>
                          <td className="p-2 text-right">{formatVar(calcVar(real3(c3, mesSeleccionado), pres3(c3, mesSeleccionado)))}</td>
                          <td className="p-2 text-right bg-slate-50 text-gray-500">{formatCurrency(acum(pres3, c3))}</td>
                          <td
                            className="p-2 text-right bg-slate-50 font-medium cursor-pointer hover:bg-blue-100 hover:underline"
                            onClick={(e) => { e.stopPropagation(); exportarMovs(c3, false) }}
                            title="Clic para exportar detalle acumulado"
                          >
                            {formatCurrency(acum(real3, c3))}
                          </td>
                          <td className="p-2 text-right bg-slate-50">{formatVar(calcVar(acum(real3, c3), acum(pres3, c3)))}</td>
                        </tr>
                      )

                      if (haySubs && isC3Expanded) {
                        subs.forEach(sub => {
                          const subNombre = planCuentas[sub] || realSubcuentas[sub]?.descripcion || ''
                          filas.push(
                            <tr key={`sub-${sub}`} className="bg-gray-100/50 text-xs hover:bg-gray-100">
                              <td className="p-1.5 pl-16">
                                <span className="text-gray-400 font-mono mr-1">{sub}</span>
                                {subNombre && <span className="text-gray-500 truncate" title={subNombre}>{subNombre}</span>}
                              </td>
                              <td className="p-1.5 text-right text-gray-400">{formatCurrency(presSub(sub, mesSeleccionado))}</td>
                              <td
                                className="p-1.5 text-right cursor-pointer hover:bg-blue-50 hover:underline"
                                onClick={() => exportarMovs(sub, true)}
                                title="Clic para exportar detalle del mes"
                              >
                                {formatCurrency(realSub(sub, mesSeleccionado))}
                              </td>
                              <td className="p-1.5 text-right">{formatVar(calcVar(realSub(sub, mesSeleccionado), presSub(sub, mesSeleccionado)))}</td>
                              <td className="p-1.5 text-right bg-slate-50 text-gray-400">{formatCurrency(acum(presSub, sub))}</td>
                              <td
                                className="p-1.5 text-right bg-slate-50 cursor-pointer hover:bg-blue-100 hover:underline"
                                onClick={() => exportarMovs(sub, false)}
                                title="Clic para exportar detalle acumulado"
                              >
                                {formatCurrency(acum(realSub, sub))}
                              </td>
                              <td className="p-1.5 text-right bg-slate-50">{formatVar(calcVar(acum(realSub, sub), acum(presSub, sub)))}</td>
                            </tr>
                          )
                        })
                      }
                    })
                  }

                  return filas
                })}

                {/* Total inversiones */}
                <tr className="total-row text-base font-bold border-t-2 border-amber-300">
                  <td className="p-3">🏗️ TOTAL INVERSIONES</td>
                  <td className="p-3 text-right">{formatCurrency(totalMes(pres3))}</td>
                  <td className={`p-3 text-right ${getValueClass(-totalMes(real3))}`}>{formatCurrency(totalMes(real3))}</td>
                  <td className="p-3 text-right">{formatVar(calcVar(totalMes(real3), totalMes(pres3)))}</td>
                  <td className="p-3 text-right bg-slate-50">{formatCurrency(totalAcum(pres3))}</td>
                  <td className={`p-3 text-right bg-slate-50 ${getValueClass(-totalAcum(real3))}`}>{formatCurrency(totalAcum(real3))}</td>
                  <td className="p-3 text-right bg-slate-50">{formatVar(calcVar(totalAcum(real3), totalAcum(pres3)))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Real = altas de inmovilizado (debe − haber) del grupo 2, sin amortización acumulada (28x) ni deterioros (29x).
              El presupuesto se escribe a mano en las celdas "Ppto. Mes" (cambia de mes con el selector). Clic en cifras Real para exportar.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={nuevaCuenta}
                onChange={(e) => setNuevaCuenta(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
              >
                <option value="">+ Añadir cuenta a presupuestar…</option>
                {Object.entries(NOMBRES_CUENTA_2)
                  .filter(([c3]) => !cuentas3ConDatos.includes(c3))
                  .map(([c3, nombre]) => (
                    <option key={c3} value={c3}>{c3} — {nombre}</option>
                  ))}
              </select>
              <button
                onClick={añadirCuenta}
                disabled={!nuevaCuenta}
                className="text-xs px-3 py-1 rounded bg-brand-primary text-white disabled:opacity-40"
              >
                Añadir
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
