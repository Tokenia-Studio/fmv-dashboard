// ============================================
// DETALLE PRESTAMOS - Deuda viva por préstamo
// Empareja el tramo C/P (52x) con su préstamo L/P (17x)
// vía asientos de traspaso; las 52x sueltas se listan aparte
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import { formatCurrency } from '../../utils/formatters'
import { TIPOS_FINANCIACION_MANUAL, TIPOS_FINANCIACION_OPCIONES } from '../../utils/constants'

// Naturaleza de cada línea: elección guardada en Supabase > mapa por
// defecto de constants > heurística por prefijo de cuenta
function tipoDe(p, tiposGuardados = {}) {
  const guardado = tiposGuardados[p.cuentaCP] || tiposGuardados[p.cuentaLP]
  if (guardado) return guardado
  const manual = TIPOS_FINANCIACION_MANUAL[p.cuentaCP] || TIPOS_FINANCIACION_MANUAL[p.cuentaLP]
  if (manual) return manual
  if (p.cuentaLP) return 'Préstamo bancario'
  const pref3 = (p.cuentaCP || '').substring(0, 3)
  if (['523', '524', '525', '528'].includes(pref3)) return 'Efectos / prov. inmovilizado'
  return 'Línea C/P'
}

const COLOR_TIPO = {
  'Préstamo bancario': 'bg-blue-50 text-blue-700',
  'Confirming proveedores': 'bg-amber-50 text-amber-700',
  'Financiación impuestos': 'bg-purple-50 text-purple-700',
  'Póliza de crédito': 'bg-cyan-50 text-cyan-700',
  'Empresa del grupo': 'bg-slate-100 text-slate-600',
  'Efectos / prov. inmovilizado': 'bg-orange-50 text-orange-700',
  'Línea C/P': 'bg-gray-100 text-gray-600'
}

export default function DetallePrestamos({ prestamos, año }) {
  const { planCuentas, tiposFinanciacion, guardarTipoFinanciacion } = useData()

  if (!prestamos || prestamos.prestamos.length === 0) return null
  const { prestamos: lista, totales } = prestamos

  // Préstamos bancarios primero; el resto es otra financiación
  // (Valdepinto tiene cuenta 17x pero es deuda con empresa del grupo)
  const bancarios = lista.filter(p => tipoDe(p, tiposFinanciacion) === 'Préstamo bancario')
  const otras = lista.filter(p => tipoDe(p, tiposFinanciacion) !== 'Préstamo bancario')

  const cambiarTipo = (p, tipo) => {
    // Se guarda sobre la cuenta más representativa de la línea
    guardarTipoFinanciacion(p.cuentaCP || p.cuentaLP, tipo)
  }

  // Nombre a mostrar: plan de cuentas (oficial) > descripción más repetida > nº de cuenta
  const nombreDe = (p) => {
    const oficial = (p.cuentaLP && planCuentas?.[p.cuentaLP]) || (p.cuentaCP && planCuentas?.[p.cuentaCP])
    if (oficial) return oficial
    if (p.nombre) return p.nombre
    return p.cuentaLP ? `Préstamo ${p.cuentaLP}` : `Financiación C/P ${p.cuentaCP}`
  }

  const filaGrupo = (titulo, items) => {
    const suma = (campo) => items.reduce((s, p) => s + (p[campo] || 0), 0)
    return (
      <tr className="bg-slate-100/80 text-slate-700 font-bold">
        <td className="py-1.5 px-2 text-xs uppercase tracking-wide" colSpan={4}>{titulo}</td>
        <td className="text-right py-1.5 px-2">{suma('saldoLP') ? formatCurrency(suma('saldoLP')) : '—'}</td>
        <td className="text-right py-1.5 px-2">{suma('saldoCP') ? formatCurrency(suma('saldoCP')) : '—'}</td>
        <td className="text-right py-1.5 px-2">{formatCurrency(suma('saldoTotal'))}</td>
        <td className="text-right py-1.5 px-2 text-red-700">{suma('amortizadoAño') ? `−${formatCurrency(suma('amortizadoAño'))}` : '—'}</td>
        <td className="text-right py-1.5 px-2 text-green-700">{suma('nuevaFinAño') ? `+${formatCurrency(suma('nuevaFinAño'))}` : '—'}</td>
        <td className="text-right py-1.5 px-2 text-gray-400 font-normal">{suma('reclasificadoAño') ? formatCurrency(suma('reclasificadoAño')) : '—'}</td>
      </tr>
    )
  }

  const fila = (p, i) => (
    <tr key={`${p.cuentaLP || ''}-${p.cuentaCP || ''}-${i}`} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-1.5 px-2 font-medium text-gray-800 max-w-[280px] truncate" title={nombreDe(p)}>
        {nombreDe(p)}
      </td>
      <td className="py-1.5 px-2">
        <select
          value={tipoDe(p, tiposFinanciacion)}
          onChange={(e) => cambiarTipo(p, e.target.value)}
          title="Cambiar el tipo de esta línea (se guarda para todos los usuarios)"
          className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap border-0 cursor-pointer appearance-auto focus:ring-1 focus:ring-blue-400 ${COLOR_TIPO[tipoDe(p, tiposFinanciacion)] || COLOR_TIPO['Línea C/P']}`}
        >
          {TIPOS_FINANCIACION_OPCIONES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </td>
      <td className="py-1.5 px-2 text-gray-500 font-mono text-xs">{p.cuentaLP || '—'}</td>
      <td className="py-1.5 px-2 text-gray-500 font-mono text-xs">{p.cuentaCP || '—'}</td>
      <td className="text-right py-1.5 px-2">{p.saldoLP ? formatCurrency(p.saldoLP) : '—'}</td>
      <td className="text-right py-1.5 px-2">{p.saldoCP ? formatCurrency(p.saldoCP) : '—'}</td>
      <td className="text-right py-1.5 px-2 font-semibold text-slate-800">{formatCurrency(p.saldoTotal)}</td>
      <td className="text-right py-1.5 px-2 text-red-600">
        {p.amortizadoAño ? `−${formatCurrency(p.amortizadoAño)}` : '—'}
      </td>
      <td className="text-right py-1.5 px-2 text-green-600">
        {p.nuevaFinAño ? `+${formatCurrency(p.nuevaFinAño)}` : '—'}
      </td>
      <td className="text-right py-1.5 px-2 text-gray-400">
        {p.reclasificadoAño ? formatCurrency(p.reclasificadoAño) : '—'}
      </td>
    </tr>
  )

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📋</span>
          <span>Deuda viva por préstamo</span>
        </h3>
      </div>

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="text-left py-2 px-2 font-semibold">Préstamo / línea</th>
                <th className="text-left py-2 px-2 font-semibold">Tipo</th>
                <th className="text-left py-2 px-2 font-semibold">Cta. L/P</th>
                <th className="text-left py-2 px-2 font-semibold">Cta. C/P</th>
                <th className="text-right py-2 px-2 font-semibold">Pendiente L/P</th>
                <th className="text-right py-2 px-2 font-semibold">Pendiente C/P</th>
                <th className="text-right py-2 px-2 font-semibold">Deuda viva</th>
                <th className="text-right py-2 px-2 font-semibold">Amortizado {año}</th>
                <th className="text-right py-2 px-2 font-semibold">Recibido {año}</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-400" title="Reclasificación L/P→C/P: no es entrada ni salida de caja">Reclasif. L/P→C/P</th>
              </tr>
            </thead>
            <tbody>
              {bancarios.length > 0 && filaGrupo('Préstamos bancarios (largo + corto)', bancarios)}
              {bancarios.map(fila)}
              {otras.length > 0 && filaGrupo('Otra financiación', otras)}
              {otras.map(fila)}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-800">
                <td className="py-2 px-2" colSpan={4}>Total</td>
                <td className="text-right py-2 px-2">{formatCurrency(totales.saldoLP)}</td>
                <td className="text-right py-2 px-2">{formatCurrency(totales.saldoCP)}</td>
                <td className="text-right py-2 px-2">{formatCurrency(totales.saldoTotal)}</td>
                <td className="text-right py-2 px-2 text-red-700">−{formatCurrency(totales.amortizadoAño)}</td>
                <td className="text-right py-2 px-2 text-green-700">+{formatCurrency(totales.nuevaFinAño)}</td>
                <td className="text-right py-2 px-2 text-gray-400 font-normal">{totales.reclasificadoAño ? formatCurrency(totales.reclasificadoAño) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Deuda viva = saldo acumulado de todos los ejercicios cargados (17x largo plazo, 52x corto plazo).
          El tramo C/P se asocia a su préstamo por los asientos de traspaso L/P→C/P.
          El tipo de cada línea es editable con el desplegable y se guarda para todos los usuarios.
        </p>
      </div>
    </div>
  )
}
