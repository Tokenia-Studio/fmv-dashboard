// ============================================
// HORIZONTE AMORTIZACION - Cuadros de amortización de los préstamos
// Proyecta el capital pendiente de cada préstamo bancario hasta su
// última cuota, para ver cuándo queda la deuda a cero.
// Los datos salen de los cuadros oficiales de cada entidad
// (src/data/cuadrosAmortizacion.js), NO de la contabilidad.
// ============================================

import React, { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { CUADROS_AMORTIZACION, FECHA_INICIO_CUADROS } from '../../data/cuadrosAmortizacion'
import { formatCurrency, formatCompact } from '../../utils/formatters'

const COLORES = ['#1a365d', '#0ea5e9', '#f97316', '#8b5cf6', '#22c55e', '#ef4444']

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function etiquetaMes(mesKey) {
  const [a, m] = mesKey.split('-')
  return `${MESES_CORTOS[Number(m) - 1]} ${a.slice(2)}`
}

// Nombre completo: abreviado "may 2031" se lee como el mes inglés
function etiquetaMesLarga(mesKey) {
  const [a, m] = mesKey.split('-')
  return `${MESES_LARGOS[Number(m) - 1]} ${a}`
}

// Suma el siguiente mes a una clave 'AAAA-MM'
function mesSiguiente(mesKey) {
  const [a, m] = mesKey.split('-').map(Number)
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
}

// Tooltip propio: en el apilado interesa el total de deuda viva, no la
// suma de las series visibles del gráfico
function TooltipHorizonte({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div className="custom-tooltip">
      <p className="font-semibold text-gray-800 mb-2">{etiquetaMesLarga(label)}</p>
      <div className="space-y-1">
        {payload.slice().reverse().map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-medium" style={{ color: entry.color }}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm">
        <span className="text-gray-600 font-medium">Deuda viva</span>
        <span className="font-bold text-gray-800">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

export default function HorizonteAmortizacion() {
  const [vista, setVista] = useState('mensual')

  const { serieMensual, serieAnual, ticks, resumen, porAño } = useMemo(() => {
    const prestamos = CUADROS_AMORTIZACION

    // Índice mes -> {capital, intereses} de cada préstamo
    const indice = prestamos.map(p => {
      const m = {}
      p.cuotas.forEach(([mes, capital, intereses]) => {
        if (!m[mes]) m[mes] = { capital: 0, intereses: 0 }
        m[mes].capital += capital
        m[mes].intereses += intereses
      })
      return m
    })

    const ultimoMes = prestamos
      .map(p => p.cuotas[p.cuotas.length - 1][0])
      .sort()
      .pop()

    // Recorrido mes a mes desde el saldo de partida hasta la última cuota
    const pendiente = prestamos.map(p => p.pendienteInicio)
    const filas = []
    let mes = FECHA_INICIO_CUADROS

    // Punto de partida: saldo a 31/12/2025, antes de pagar ninguna cuota
    filas.push({
      mes,
      total: pendiente.reduce((s, v) => s + v, 0),
      capitalMes: 0,
      interesesMes: 0,
      ...Object.fromEntries(prestamos.map((p, i) => [p.nombre, pendiente[i]]))
    })

    while (mes < ultimoMes) {
      mes = mesSiguiente(mes)
      let capitalMes = 0
      let interesesMes = 0
      prestamos.forEach((p, i) => {
        const cuota = indice[i][mes]
        if (cuota) {
          pendiente[i] = Math.max(0, pendiente[i] - cuota.capital)
          capitalMes += cuota.capital
          interesesMes += cuota.intereses
        }
      })
      filas.push({
        mes,
        total: pendiente.reduce((s, v) => s + v, 0),
        capitalMes,
        interesesMes,
        ...Object.fromEntries(prestamos.map((p, i) => [p.nombre, pendiente[i]]))
      })
    }

    // Vista anual: saldo a cierre de cada ejercicio (último mes disponible)
    const porAñoMap = new Map()
    filas.forEach(f => {
      const año = f.mes.slice(0, 4)
      const acc = porAñoMap.get(año) || { año, capital: 0, intereses: 0 }
      acc.capital += f.capitalMes
      acc.intereses += f.interesesMes
      acc.cierre = f            // la última fila del año manda
      porAñoMap.set(año, acc)
    })
    const años = [...porAñoMap.values()]
    const serieAnual = años.map(a => ({
      mes: `${a.año}-12`,
      etiqueta: a.año,
      total: a.cierre.total,
      ...Object.fromEntries(prestamos.map(p => [p.nombre, a.cierre[p.nombre]]))
    }))

    // Marcas del eje X: solo enero de cada año (+ el primer punto)
    const ticks = filas
      .filter((f, i) => i === 0 || f.mes.endsWith('-01'))
      .map(f => f.mes)

    const resumen = {
      deudaInicial: filas[0].total,
      ultimoMes,
      interesesPendientes: filas.reduce((s, f) => s + f.interesesMes, 0),
      cuotaMensual: prestamos.reduce((s, p) => s + p.cuotaMensual, 0),
      amortizacion12m: filas.slice(1, 13).reduce((s, f) => s + f.capitalMes, 0)
    }

    return { serieMensual: filas, serieAnual, ticks, resumen, porAño: años }
  }, [])

  const datos = vista === 'mensual' ? serieMensual : serieAnual

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between gap-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>📉</span>
          <span>Horizonte de amortización de préstamos</span>
        </h3>
        <div className="flex bg-white/15 rounded-lg p-0.5 text-xs font-medium">
          {['mensual', 'anual'].map(v => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                vista === v ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Cifras de cabecera */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-gray-500">Deuda bancaria a 31/12/2025</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(resumen.deudaInicial)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-gray-500">Cuota mensual conjunta</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(resumen.cuotaMensual)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-gray-500">Intereses pendientes</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(resumen.interesesPendientes)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <p className="text-xs text-gray-500">Deuda a cero en</p>
            <p className="text-lg font-bold text-green-700">{etiquetaMesLarga(resumen.ultimoMes)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={datos} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="mes"
              ticks={vista === 'mensual' ? ticks : undefined}
              tickFormatter={vista === 'mensual' ? etiquetaMes : (m) => m.slice(0, 4)}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(val) => formatCompact(val).replace(' €', '')}
            />
            <Tooltip content={<TooltipHorizonte />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {CUADROS_AMORTIZACION.map((p, i) => (
              <Area
                key={p.id}
                type="monotone"
                dataKey={p.nombre}
                stackId="deuda"
                stroke={COLORES[i % COLORES.length]}
                fill={COLORES[i % COLORES.length]}
                fillOpacity={0.75}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>

        {/* Detalle por ejercicio */}
        <div className="overflow-x-auto mt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="text-left py-2 px-2 font-semibold">Ejercicio</th>
                <th className="text-right py-2 px-2 font-semibold">Amortización de capital</th>
                <th className="text-right py-2 px-2 font-semibold">Intereses</th>
                <th className="text-right py-2 px-2 font-semibold">Total a pagar</th>
                <th className="text-right py-2 px-2 font-semibold">Deuda viva a cierre</th>
              </tr>
            </thead>
            <tbody>
              {porAño.map(a => (
                <tr key={a.año} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-1.5 px-2 font-medium text-gray-800">{a.año}</td>
                  <td className="text-right py-1.5 px-2 text-red-600">
                    {a.capital ? `−${formatCurrency(a.capital)}` : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 text-gray-600">
                    {a.intereses ? formatCurrency(a.intereses) : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 text-gray-700">
                    {a.capital ? formatCurrency(a.capital + a.intereses) : '—'}
                  </td>
                  <td className="text-right py-1.5 px-2 font-semibold text-slate-800">
                    {formatCurrency(a.cierre.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-800">
                <td className="py-2 px-2">Total pendiente</td>
                <td className="text-right py-2 px-2 text-red-700">
                  −{formatCurrency(porAño.reduce((s, a) => s + a.capital, 0))}
                </td>
                <td className="text-right py-2 px-2">
                  {formatCurrency(porAño.reduce((s, a) => s + a.intereses, 0))}
                </td>
                <td className="text-right py-2 px-2">
                  {formatCurrency(porAño.reduce((s, a) => s + a.capital + a.intereses, 0))}
                </td>
                <td className="text-right py-2 px-2">{formatCurrency(0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Préstamos incluidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {CUADROS_AMORTIZACION.map((p, i) => {
            const ultima = p.cuotas[p.cuotas.length - 1]
            // Algún préstamo (el de Volkswagen) cierra con una cuota final
            // muy superior a la mensual: conviene avisar de ese pago
            const cuotaFinal = ultima[1] > p.cuotaMensual * 1.5 ? ultima[1] : null
            return (
              <div key={p.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORES[i % COLORES.length] }} />
                  <span className="font-semibold text-gray-800 text-sm truncate" title={p.nombre}>{p.nombre}</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  {p.entidad !== p.nombre && `${p.entidad} · `}
                  {p.tipoDerivado && '≈'}{p.tipoInteres}% · cta. {p.cuentaLP}
                </p>
                <dl className="text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Pendiente 31/12/25</dt>
                    <dd className="font-medium text-gray-800">{formatCurrency(p.pendienteInicio)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Cuota mensual</dt>
                    <dd className="font-medium text-gray-800">{formatCurrency(p.cuotaMensual)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Última cuota</dt>
                    <dd className="font-medium text-gray-800">{etiquetaMesLarga(ultima[0])}</dd>
                  </div>
                  {cuotaFinal && (
                    <div className="flex justify-between">
                      <dt className="text-amber-700">Pago final</dt>
                      <dd className="font-semibold text-amber-700">{formatCurrency(cuotaFinal)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Proyección tomada de los cuadros de amortización de cada entidad, partiendo del capital
          pendiente a 31/12/2025 (cuadra con los saldos contables 17x + 52x de cada préstamo).
          No recoge confirming, pólizas ni financiación de impuestos, ni contempla nuevas
          operaciones o cancelaciones anticipadas.
        </p>
      </div>
    </div>
  )
}
