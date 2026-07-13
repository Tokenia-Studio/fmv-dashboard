// ============================================
// PUENTE CAJA - ¿Dónde va el dinero?
// Puente beneficio → variación de tesorería (waterfall + tabla mensual)
// ============================================

import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList
} from 'recharts'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatCompact, mesKeyToNombre } from '../../utils/formatters'
import { MONTHS_SHORT, CASHFLOW_BUCKETS, CASHFLOW_TESORERIA_PREFIJO } from '../../utils/constants'
import { exportarLibroMovimientos } from '../../utils/exportExcel'

const COLOR_ENTRA = '#22c55e'
const COLOR_SALE = '#ef4444'
const COLOR_TOTAL = '#1a365d'

// Misma lógica de clasificación que calcularPuenteCaja (primer prefijo que coincide)
function bucketDeCuenta(cuenta) {
  if (cuenta.startsWith(CASHFLOW_TESORERIA_PREFIJO)) return null
  const b = CASHFLOW_BUCKETS.find(b => b.prefijos.some(p => cuenta.startsWith(p)))
  return b ? b.id : 'otros'
}

export default function PuenteCajaSection() {
  const { puenteCaja, añoActual, movimientos, proveedores } = useData()
  const [periodo, setPeriodo] = useState('año') // 'año' | 1..12

  const datosWaterfall = useMemo(() => {
    if (!puenteCaja) return []
    const valorDe = (b) => periodo === 'año' ? b.total : b.meses[periodo]
    const items = puenteCaja.buckets
      .map(b => ({ id: b.id, nombre: b.label, descripcion: b.descripcion, valor: valorDe(b) }))
      .filter(i => Math.abs(i.valor) >= 0.005)

    let acumulado = 0
    const filas = items.map(i => {
      const desde = acumulado
      acumulado += i.valor
      return {
        ...i,
        base: Math.min(desde, acumulado),
        tramo: Math.abs(i.valor),
        esTotal: false
      }
    })
    filas.push({
      id: 'delta',
      nombre: 'Δ Tesorería',
      descripcion: 'Lo que de verdad varió el banco',
      valor: acumulado,
      base: Math.min(0, acumulado),
      tramo: Math.abs(acumulado),
      esTotal: true
    })
    return filas
  }, [puenteCaja, periodo])

  if (!puenteCaja) return null

  const mesesConDatos = Array.from({ length: 12 }, (_, i) => i + 1)
    .filter(m => Math.abs(puenteCaja.meses[m].deltaReal) >= 0.005 ||
                 puenteCaja.buckets.some(b => Math.abs(b.meses[m]) >= 0.005))

  if (mesesConDatos.length === 0) return null

  const descuadre = Math.abs(puenteCaja.totalCalc - puenteCaja.totalReal) >= 0.01

  // Export de los movimientos de un bucket en un periodo, con formato
  // español (#.##0,00) y fila TOTAL — misma plantilla que en Financiación
  const exportarBucket = (bucketId, mes) => {
    const mesKey = mes ? `${añoActual}-${String(mes).padStart(2, '0')}` : null
    const nombre = CASHFLOW_BUCKETS.find(b => b.id === bucketId)?.label || bucketId
    const movsBucket = movimientos.filter(m =>
      (mesKey ? m.mes === mesKey : m.mes.startsWith(String(añoActual))) &&
      bucketDeCuenta(m.cuenta) === bucketId
    )
    exportarLibroMovimientos(
      [{ nombre, movimientos: movsBucket }],
      `Puente_${nombre.replace(/[^a-zA-Z0-9]+/g, '_')}_${mesKey ? mesKeyToNombre(mesKey) : añoActual}`,
      proveedores
    )
  }

  // KPIs narrativos
  const v = (id) => {
    const b = puenteCaja.buckets.find(b => b.id === id)
    return periodo === 'año' ? b.total : b.meses[periodo]
  }
  const generado = v('beneficio') + v('amortizaciones')
  const circulante = v('clientes') + v('existencias') + v('proveedores') + v('publicas')
  const invertido = v('inversiones')
  const financiacion = v('financiacion')
  const deltaTesoreria = periodo === 'año' ? puenteCaja.totalCalc : puenteCaja.meses[periodo].deltaCalc

  const tooltipPuente = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-semibold text-gray-800">{d.nombre}</p>
        <p className={`font-bold ${d.esTotal ? 'text-brand-primary' : d.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {d.valor >= 0 ? '+' : ''}{formatCurrency(d.valor)}
        </p>
        <p className="text-xs text-gray-500 mt-1">{d.descripcion}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de periodo */}
      <div className="card overflow-hidden">
        <div className="card-header flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>🔎</span>
            <span>¿Dónde va el dinero? — Puente beneficio → caja</span>
          </h3>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value === 'año' ? 'año' : parseInt(e.target.value))}
            className="text-sm rounded px-2 py-1 text-gray-800 bg-white"
          >
            <option value="año">Año completo {añoActual}</option>
            {mesesConDatos.map(m => (
              <option key={m} value={m}>{MONTHS_SHORT[m - 1]} {añoActual}</option>
            ))}
          </select>
        </div>

        {/* Tarjetas narrativas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 pb-0">
          {[
            { titulo: 'Genera el negocio', valor: generado, nota: 'Beneficio + amortizaciones' },
            { titulo: 'Circulante', valor: circulante, nota: 'Clientes, stock, proveedores, Hacienda' },
            { titulo: 'Inversiones', valor: invertido, nota: 'Maquinaria e instalaciones' },
            { titulo: 'Financiación', valor: financiacion, nota: 'Préstamos nuevos − cuotas' },
            { titulo: 'Variación de caja', valor: deltaTesoreria, nota: 'Lo que varió el banco', total: true }
          ].map(k => (
            <div key={k.titulo} className={`rounded-lg border p-3 ${k.total ? 'border-brand-primary bg-blue-50' : 'border-gray-200'}`}>
              <p className="text-xs text-gray-500">{k.titulo}</p>
              <p className={`text-lg font-bold ${k.total ? 'text-brand-primary' : k.valor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {k.valor >= 0 ? '+' : ''}{formatCompact(k.valor)}
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">{k.nota}</p>
            </div>
          ))}
        </div>

        {/* Waterfall */}
        <div className="p-4">
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={datosWaterfall} margin={{ top: 24, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="nombre"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(val) => formatCompact(val).replace(' €', '')}
              />
              <Tooltip content={tooltipPuente} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />

              {/* Barra invisible de apoyo (offset del waterfall) */}
              <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="tramo" stackId="wf" radius={[3, 3, 3, 3]}>
                {datosWaterfall.map(d => (
                  <Cell
                    key={d.id}
                    fill={d.esTotal ? COLOR_TOTAL : d.valor >= 0 ? COLOR_ENTRA : COLOR_SALE}
                  />
                ))}
                <LabelList
                  dataKey="valor"
                  position="top"
                  formatter={(val) => `${val >= 0 ? '+' : ''}${formatCompact(val).replace(' €', '')}`}
                  style={{ fontSize: 10, fill: '#374151' }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 text-center mt-1">
            Verde: entra dinero en el banco · Rojo: sale dinero · Azul: variación total del periodo
          </p>
        </div>
      </div>

      {/* Tabla mensual del puente */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>🧮</span>
            <span>Puente mensual — en qué se distribuye el dinero</span>
          </h3>
        </div>

        {descuadre && (
          <div className="bg-red-50 text-red-700 text-sm px-4 py-2 border-b border-red-200">
            ⚠ El puente no cuadra con la variación real de bancos
            (dif. {formatCurrency(puenteCaja.totalCalc - puenteCaja.totalReal)}). Revisar datos cargados.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="table-header">
              <tr>
                <th className="p-2 text-left whitespace-nowrap">Concepto</th>
                {mesesConDatos.map(m => (
                  <th key={m} className="p-2 text-right">{MONTHS_SHORT[m - 1]}</th>
                ))}
                <th className="p-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {puenteCaja.buckets.filter(b => Math.abs(b.total) >= 0.005).map(b => (
                <tr key={b.id} className="table-row">
                  <td className="p-2 font-medium whitespace-nowrap" title={b.descripcion}>{b.label}</td>
                  {mesesConDatos.map(m => (
                    <td
                      key={m}
                      className={`p-2 text-right cursor-pointer hover:bg-blue-50 ${b.meses[m] >= 0 ? 'text-gray-700' : 'text-red-600'}`}
                      onClick={() => exportarBucket(b.id, m)}
                      title="Click para exportar movimientos"
                    >
                      {Math.abs(b.meses[m]) >= 0.005 ? formatCompact(b.meses[m]) : '—'}
                    </td>
                  ))}
                  <td
                    className={`p-2 text-right font-semibold cursor-pointer hover:bg-blue-50 ${b.total >= 0 ? 'text-gray-800' : 'text-red-600'}`}
                    onClick={() => exportarBucket(b.id, null)}
                    title="Click para exportar movimientos del año"
                  >
                    {formatCompact(b.total)}
                  </td>
                </tr>
              ))}
              {/* Verificación */}
              <tr className="border-t-2 border-brand-primary bg-blue-50 font-bold">
                <td className="p-2 whitespace-nowrap">Δ Tesorería (puente)</td>
                {mesesConDatos.map(m => (
                  <td key={m} className={`p-2 text-right ${puenteCaja.meses[m].deltaCalc >= 0 ? 'text-brand-primary' : 'text-red-700'}`}>
                    {formatCompact(puenteCaja.meses[m].deltaCalc)}
                  </td>
                ))}
                <td className={`p-2 text-right ${puenteCaja.totalCalc >= 0 ? 'text-brand-primary' : 'text-red-700'}`}>
                  {formatCompact(puenteCaja.totalCalc)}
                </td>
              </tr>
              <tr className="text-gray-500">
                <td className="p-2 whitespace-nowrap">Δ Bancos real (57)</td>
                {mesesConDatos.map(m => (
                  <td key={m} className="p-2 text-right">{formatCompact(puenteCaja.meses[m].deltaReal)}</td>
                ))}
                <td className="p-2 text-right">{formatCompact(puenteCaja.totalReal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 px-4 py-2">
          De los cuales, intereses pagados (ya dentro del beneficio): {formatCurrency(-puenteCaja.interesesTotal)} ·
          Click en una celda para exportar el detalle a Excel
        </p>
      </div>
    </div>
  )
}
