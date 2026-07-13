// ============================================
// FLUJOS DEUDA - Nueva financiación vs amortización mensual
// Solo datos reales (hasta el último mes con movimientos)
// ============================================

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import { formatCompact, formatCurrency, mesKeyToNombre } from '../../utils/formatters'
import { MONTHS_SHORT } from '../../utils/constants'
import { exportarLibroMovimientos } from '../../utils/exportExcel'
import CustomTooltip from '../UI/CustomTooltip'
import { useData } from '../../context/DataContext'

export default function FlujosDeuda({ datos, año, proyeccion, deudaInicial = 0 }) {
  const { movimientos, proveedores } = useData()

  // Click en barra, cifra o fila → exportar los movimientos de deuda (17x/52x)
  // del mes, separados por naturaleza. parte: 'nueva' | 'amortizacion' | 'todo'
  const exportarMes = (mesKey, parte = 'todo') => {
    if (!mesKey) return
    const movsMes = movimientos.filter(m => {
      const g = m.cuenta.substring(0, 2)
      return m.mes === mesKey && (g === '17' || g === '52')
    })
    if (movsMes.length === 0) return

    const clasificar = (m) => {
      if (/traspaso/i.test(m.descripcion || '')) return 'traspaso'
      return (m.haber - m.debe) > 0 ? 'nueva' : 'amortizacion'
    }
    const hojas = []
    if (parte !== 'amortizacion') {
      hojas.push({ nombre: 'Nueva financiacion', movimientos: movsMes.filter(m => clasificar(m) === 'nueva') })
    }
    if (parte !== 'nueva') {
      hojas.push({ nombre: 'Amortizacion', movimientos: movsMes.filter(m => clasificar(m) === 'amortizacion') })
    }
    if (parte === 'todo') {
      hojas.push({ nombre: 'Traspasos LP a CP', movimientos: movsMes.filter(m => clasificar(m) === 'traspaso') })
    }

    const sufijo = parte === 'nueva' ? 'NuevaFin' : parte === 'amortizacion' ? 'Amortizacion' : 'Deuda'
    exportarLibroMovimientos(hojas, `${sufijo}_${mesKeyToNombre(mesKey)}_${año}`, proveedores)
  }

  // Solo meses reales (los futuros no aportan nada aquí)
  const ultimoMesReal = proyeccion?.ultimoMesReal ?? 12
  const filas = MONTHS_SHORT.slice(0, ultimoMesReal).map((mesNombre, idx) => {
    const mesNum = idx + 1
    const mesKey = `${año}-${String(mesNum).padStart(2, '0')}`
    const datosMes = datos.find(d => d.mes === mesKey) || {}

    return {
      mes: mesNombre,
      mesKey,
      nuevaFinanciacion: datosMes.nuevaFinanciacion || 0,
      amortizacion: datosMes.amortizacion || 0,
      traspaso: datosMes.traspasoLPCP || 0,
      deudaViva: datosMes.deudaTotal || 0
    }
  })

  const datosGrafico = filas.map(f => ({
    mes: f.mes,
    mesKey: f.mesKey,
    'Financiación nueva': f.nuevaFinanciacion,
    'Amortización': -f.amortizacion
  }))

  const hayFlujos = filas.some(f => f.nuevaFinanciacion !== 0 || f.amortizacion !== 0)
  if (!hayFlujos) return null

  const totalNueva = filas.reduce((s, f) => s + f.nuevaFinanciacion, 0)
  const totalAmort = filas.reduce((s, f) => s + f.amortizacion, 0)
  const totalTraspaso = filas.reduce((s, f) => s + f.traspaso, 0)

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>🔁</span>
          <span>Préstamos: lo que entra vs lo que se devuelve</span>
        </h3>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(val) => formatCompact(val).replace(' €', '')}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />

            <Bar dataKey="Financiación nueva" stackId="flujo" fill="#22c55e" radius={[3, 3, 0, 0]}
              cursor="pointer" onClick={(d) => exportarMes(d?.mesKey, 'nueva')} />
            <Bar dataKey="Amortización" stackId="flujo" fill="#ef4444" radius={[0, 0, 3, 3]}
              cursor="pointer" onClick={(d) => exportarMes(d?.mesKey, 'amortizacion')} />
          </BarChart>
        </ResponsiveContainer>

        <p className="text-xs text-gray-500 text-center mt-2">
          Verde: préstamos recibidos · Rojo: cuotas devueltas al banco (sin contar traspasos internos L/P→C/P)
          {' · Click en la cifra verde: exporta solo la financiación nueva · Cifra roja: solo la amortización · Resto de la fila: todo el mes en hojas separadas'}
        </p>

        {/* Tabla mensual: entradas y salidas por separado, con signo */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600">
                <th className="text-left py-2 px-2 font-semibold">Mes</th>
                <th className="text-right py-2 px-2 font-semibold">Financiación nueva</th>
                <th className="text-right py-2 px-2 font-semibold">Amortización</th>
                <th className="text-right py-2 px-2 font-semibold">Neto</th>
                <th className="text-right py-2 px-2 font-semibold text-gray-400" title="Reclasificación L/P→C/P: no es entrada ni salida de caja">Reclasif. L/P→C/P</th>
                <th className="text-right py-2 px-2 font-semibold">Deuda viva fin de mes</th>
              </tr>
            </thead>
            <tbody>
              {/* Punto de partida: sin esta fila, inicial + neto ≠ final a ojo */}
              <tr className="border-b border-gray-200 bg-slate-50 text-slate-600">
                <td className="py-1.5 px-2 font-medium" colSpan={5}>Deuda al cierre de {año - 1}</td>
                <td className="text-right py-1.5 px-2 font-semibold">{formatCurrency(deudaInicial)}</td>
              </tr>
              {filas.map(f => {
                const neto = f.nuevaFinanciacion - f.amortizacion
                return (
                  <tr
                    key={f.mes}
                    onClick={() => exportarMes(f.mesKey)}
                    title="Click para exportar los movimientos de deuda del mes"
                    className="border-b border-gray-100 cursor-pointer hover:bg-blue-50/50"
                  >
                    <td className="py-1.5 px-2">{f.mes}</td>
                    <td
                      onClick={(e) => {
                        if (!f.nuevaFinanciacion) return
                        e.stopPropagation()
                        exportarMes(f.mesKey, 'nueva')
                      }}
                      title={f.nuevaFinanciacion ? 'Click: exportar solo la financiación nueva del mes' : undefined}
                      className={`text-right py-1.5 px-2 ${f.nuevaFinanciacion > 0 ? 'text-green-600 font-medium hover:bg-green-50 hover:underline' : ''}`}
                    >
                      {f.nuevaFinanciacion ? `+${formatCurrency(f.nuevaFinanciacion)}` : '—'}
                    </td>
                    <td
                      onClick={(e) => {
                        if (!f.amortizacion) return
                        e.stopPropagation()
                        exportarMes(f.mesKey, 'amortizacion')
                      }}
                      title={f.amortizacion ? 'Click: exportar solo la amortización del mes' : undefined}
                      className={`text-right py-1.5 px-2 ${f.amortizacion > 0 ? 'text-red-600 font-medium hover:bg-red-50 hover:underline' : ''}`}
                    >
                      {f.amortizacion ? `−${formatCurrency(f.amortizacion)}` : '—'}
                    </td>
                    <td className={`text-right py-1.5 px-2 ${neto > 0 ? 'text-green-600' : neto < 0 ? 'text-red-600' : ''}`}>
                      {neto ? `${neto > 0 ? '+' : '−'}${formatCurrency(Math.abs(neto))}` : '—'}
                    </td>
                    <td className="text-right py-1.5 px-2 text-gray-400">
                      {f.traspaso ? formatCurrency(f.traspaso) : '—'}
                    </td>
                    <td className="text-right py-1.5 px-2 font-medium">
                      {formatCurrency(f.deudaViva)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-800">
                <td className="py-2 px-2">Total</td>
                <td className="text-right py-2 px-2 text-green-700">+{formatCurrency(totalNueva)}</td>
                <td className="text-right py-2 px-2 text-red-700">−{formatCurrency(totalAmort)}</td>
                <td className="text-right py-2 px-2">
                  {(() => {
                    const neto = totalNueva - totalAmort
                    return `${neto >= 0 ? '+' : '−'}${formatCurrency(Math.abs(neto))}`
                  })()}
                </td>
                <td className="text-right py-2 px-2 text-gray-400 font-normal">{totalTraspaso ? formatCurrency(totalTraspaso) : '—'}</td>
                <td className="text-right py-2 px-2" title={`Deuda inicial ${formatCurrency(deudaInicial)} + neto = deuda actual`}>
                  {formatCurrency(deudaInicial + totalNueva - totalAmort)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
