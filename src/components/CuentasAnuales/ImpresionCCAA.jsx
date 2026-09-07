// ============================================
// IMPRESION CCAA - Documento de impresión de las Cuentas Anuales
// Formato oficial PGC, sobrio, pensado para enviarse a terceros (bancos).
// Solo visible en @media print; la pantalla imprime este documento y nada más.
// ============================================

import React from 'react'
import { createPortal } from 'react-dom'
import { ESTRUCTURA_BALANCE, ESTRUCTURA_PYG_CCAA, BRAND, MONTHS } from '../../utils/constants'
import { calcularSubLinea } from '../../utils/calculations'

const fmtNum = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' })
const f = (v) => fmtNum.format(Math.abs(v) < 0.005 ? 0 : v)
const esCero = (a, b) => Math.abs(a) < 0.01 && Math.abs(b) < 0.01

function Membrete({ titulo, subtitulo }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-black pb-3">
      <div className="flex items-center gap-3">
        <div className="bg-fmv-900 rounded-lg p-2 w-14 h-14 flex items-center justify-center print-exact">
          <img src="/logo-fmv-icono.png" alt="" className="max-h-full w-auto" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight">{BRAND.fullName}</p>
          <p className="text-sm font-semibold mt-0.5">{titulo}</p>
        </div>
      </div>
      <p className="text-xs self-end">{subtitulo}</p>
    </div>
  )
}

function FilaDoc({ label, val, valAnt, nivel = 0, negrita = false, borde = false, pequena = false }) {
  const pl = ['', 'pl-4', 'pl-8', 'pl-12'][nivel] || ''
  return (
    <tr className={`break-inside-avoid ${negrita ? 'font-semibold' : ''} ${borde ? 'border-t border-black' : ''} ${pequena ? 'text-[9.5pt]' : ''}`}>
      <td className={`py-1 pr-2 ${pl}`}>{label}</td>
      <td className="py-1 text-right whitespace-nowrap w-28">{val != null ? f(val) : ''}</td>
      <td className="py-1 text-right whitespace-nowrap w-28">{valAnt != null ? f(valAnt) : ''}</td>
    </tr>
  )
}

export default function ImpresionCCAA({ cuentasAnuales, año, mesHasta, conDesglose, saltoPagina = false, comparativoCompleto = false }) {
  if (!cuentasAnuales) return null

  const añoAnterior = año - 1
  const balActual = cuentasAnuales.balance?.[año] || {}
  const balAnterior = cuentasAnuales.balance?.[añoAnterior] || {}
  const pygActual = cuentasAnuales.pyg?.[año] || {}
  const pygAnterior = cuentasAnuales.pyg?.[añoAnterior] || {}

  const getVal = (datos, id) => datos[id]?.total || 0
  const getCuentas = (datos, id) => datos[id]?.cuentas || {}

  const corte = mesHasta < 12
  const ultimoDia = new Date(año, mesHasta, 0).getDate()
  const mesNombre = MONTHS[mesHasta - 1].toLowerCase()
  const fechaCorte = `${ultimoDia} de ${mesNombre} de ${año}`
  const cabBalActual = corte ? `${String(ultimoDia).padStart(2, '0')}/${String(mesHasta).padStart(2, '0')}/${año}` : `31/12/${año}`
  const cabBalAnterior = `31/12/${añoAnterior}`
  const periodoPyG = corte ? `enero–${mesNombre}` : 'ejercicio completo'
  const tituloBalance = `Balance de Situación al ${fechaCorte}`
  const tituloPyG = corte
    ? `Cuenta de Pérdidas y Ganancias — ${periodoPyG} ${año}`
    : `Cuenta de Pérdidas y Ganancias — Ejercicio ${año}`

  // --- Filas del Balance (jerarquía completa, sin cuentas de 9 dígitos) ---
  const filasBalance = []

  const pushLinea = (lineId, nivel) => {
    const line = ESTRUCTURA_BALANCE.find(b => b.id === lineId)
    if (!line) return
    const val = getVal(balActual, line.id)
    const valAnt = getVal(balAnterior, line.id)
    if (esCero(val, valAnt)) return

    filasBalance.push(<FilaDoc key={line.id} label={line.label} val={val} valAnt={valAnt} nivel={nivel} />)

    if (conDesglose && line.children) {
      const cuentasAct = getCuentas(balActual, line.id)
      const cuentasAnt = getCuentas(balAnterior, line.id)
      line.children.forEach(child => {
        const cVal = calcularSubLinea(cuentasAct, child.cuentas).total
        const cAnt = calcularSubLinea(cuentasAnt, child.cuentas).total
        if (esCero(cVal, cAnt)) return
        filasBalance.push(
          <FilaDoc key={child.id} label={child.label} val={cVal} valAnt={cAnt} nivel={nivel + 1} pequena />
        )
      })
    }
  }

  ESTRUCTURA_BALANCE.forEach(item => {
    if (item.type === 'section') {
      filasBalance.push(
        <tr key={item.id} className="break-inside-avoid">
          <td colSpan={3} className="pt-4 pb-1 font-bold text-[11pt] border-b-2 border-gray-800">{item.label}</td>
        </tr>
      )
      return
    }
    if (item.type === 'total') {
      filasBalance.push(
        <FilaDoc key={item.id} label={item.label} val={getVal(balActual, item.id)} valAnt={getVal(balAnterior, item.id)} negrita borde />
      )
      return
    }
    if (item.type === 'group') {
      filasBalance.push(
        <FilaDoc key={item.id} label={item.label} val={getVal(balActual, item.id)} valAnt={getVal(balAnterior, item.id)} negrita />
      )
      item.subtotalDe?.forEach(childId => {
        const child = ESTRUCTURA_BALANCE.find(b => b.id === childId)
        if (!child) return
        if (child.type === 'subgroup') {
          filasBalance.push(
            <FilaDoc key={child.id} label={child.label} val={getVal(balActual, child.id)} valAnt={getVal(balAnterior, child.id)} negrita nivel={1} />
          )
          child.subtotalDe?.forEach(subId => pushLinea(subId, 2))
          return
        }
        pushLinea(childId, 1)
      })
    }
  })

  // --- Filas del PyG ---
  const filasPyG = []
  ESTRUCTURA_PYG_CCAA.forEach(item => {
    const val = getVal(pygActual, item.id)
    const valAnt = getVal(pygAnterior, item.id)

    if (item.type === 'subtotal' || item.type === 'total') {
      filasPyG.push(
        <FilaDoc key={item.id} label={item.label} val={val} valAnt={valAnt} negrita borde />
      )
      return
    }

    if (esCero(val, valAnt)) return
    filasPyG.push(<FilaDoc key={item.id} label={item.label} val={val} valAnt={valAnt} />)

    if (conDesglose && item.children) {
      const cuentasAct = getCuentas(pygActual, item.id)
      const cuentasAnt = getCuentas(pygAnterior, item.id)
      item.children.forEach(child => {
        const cVal = calcularSubLinea(cuentasAct, child.cuentas).total
        const cAnt = calcularSubLinea(cuentasAnt, child.cuentas).total
        if (esCero(cVal, cAnt)) return
        filasPyG.push(
          <FilaDoc key={child.id} label={child.label} val={cVal} valAnt={cAnt} nivel={1} pequena />
        )
      })
    }
  })

  const notaPie = corte
    ? `Estados financieros intermedios a ${fechaCorte}, elaborados a partir de los registros contables de la sociedad. Balance comparado con el cierre del ejercicio ${añoAnterior}; cuenta de resultados comparada con ${comparativoCompleto ? `el ejercicio ${añoAnterior} completo` : 'el mismo periodo del ejercicio anterior'}. Importes expresados en euros.`
    : `Estados financieros del ejercicio ${año}, elaborados a partir de los registros contables de la sociedad. Importes expresados en euros.`

  // Portal al <body>: el documento vive fuera del árbol de la app, y el CSS
  // de impresión (index.css) oculta #root cuando este documento está presente
  return createPortal(
    <div className={`ccaa-print-doc text-black text-[10.5pt] ${saltoPagina ? 'break-before-page' : ''}`}>
      {/* ===== BALANCE ===== */}
      <Membrete titulo={tituloBalance} subtitulo="(Importes en euros)" />
      <table className="w-full border-collapse">
        <thead>
          {/* Espaciador: thead se repite en cada página → margen superior */}
          <tr aria-hidden="true"><td colSpan={3} style={{ height: '9mm' }} /></tr>
          <tr className="text-[9.5pt]">
            <th className="text-left font-medium pb-1"></th>
            <th className="text-right font-semibold pb-1 w-28">{cabBalActual}</th>
            <th className="text-right font-semibold pb-1 w-28">{cabBalAnterior}</th>
          </tr>
        </thead>
        <tbody>{filasBalance}</tbody>
        <tfoot>
          {/* Espaciador: tfoot se repite en cada página → margen inferior */}
          <tr aria-hidden="true"><td colSpan={3} style={{ height: '12mm' }} /></tr>
        </tfoot>
      </table>

      {/* ===== PYG (página nueva; padding propio porque el de la página
          solo cubre la primera) ===== */}
      <div className="break-before-page" style={{ paddingTop: '16mm' }}>
        <Membrete titulo={tituloPyG} subtitulo="(Importes en euros)" />
        <table className="w-full border-collapse">
          <thead>
            <tr aria-hidden="true"><td colSpan={3} style={{ height: '9mm' }} /></tr>
            <tr className="text-[9.5pt]">
              <th className="text-left font-medium pb-1"></th>
              <th className="text-right font-semibold pb-1 w-28">{corte ? `${periodoPyG} ${año}` : año}</th>
              <th className="text-right font-semibold pb-1 w-28">{corte ? (comparativoCompleto ? `Ejercicio ${añoAnterior}` : `${periodoPyG} ${añoAnterior}`) : añoAnterior}</th>
            </tr>
          </thead>
          <tbody>{filasPyG}</tbody>
          <tfoot>
            <tr aria-hidden="true"><td colSpan={3} style={{ height: '12mm' }} /></tr>
          </tfoot>
        </table>
      </div>

      {/* Nota al pie */}
      <p className="mt-6 pt-2 border-t border-gray-400 text-[8.5pt]">
        {notaPie}
      </p>
    </div>,
    document.body
  )
}
