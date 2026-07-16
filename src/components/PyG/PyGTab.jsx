// ============================================
// PYG TAB - Pestaña principal de PyG
// ============================================

import React, { useState, useEffect, useMemo } from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import ResumenMensual from './ResumenMensual'
import TablaDetallePyG from './TablaDetallePyG'
import GraficosComparativos from './GraficosComparativos'
import { formatPercent } from '../../utils/formatters'
import { calcularTotalesPyG } from '../../utils/calculations'
import { MONTHS } from '../../utils/constants'

export default function PyGTab() {
  const { pyg, totalesPyG, añoActual } = useData()

  // Filtro "acumulado hasta el mes N": evita que el mes en curso a medias y
  // los apuntes con fecha futura que exporta BC desvirtúen los totales
  const [mesHasta, setMesHasta] = useState(12)

  // Por defecto: en el año en curso, hasta el último mes cerrado; en años pasados, año completo
  useEffect(() => {
    const hoy = new Date()
    setMesHasta(añoActual === hoy.getFullYear() ? Math.max(1, hoy.getMonth()) : 12)
  }, [añoActual])

  const pygFiltrado = useMemo(() => pyg.slice(0, mesHasta), [pyg, mesHasta])
  const totales = useMemo(
    () => (mesHasta >= 12 ? totalesPyG : calcularTotalesPyG(pygFiltrado)),
    [mesHasta, totalesPyG, pygFiltrado]
  )

  const añoConDatos = pyg.some(m => m.ventas !== 0 || m.resultado !== 0)
  const mesesConDatos = pygFiltrado.filter(m => m.ventas !== 0 || m.resultado !== 0)
  const sufijoPeriodo = mesHasta < 12 ? ` · ene–${MONTHS[mesHasta - 1].slice(0, 3).toLowerCase()}` : ''

  if (!añoConDatos) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos para {añoActual}</h2>
        <p className="text-gray-500">Carga un diario contable en la pestaña "Cargar"</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Filtro de periodo acumulado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Acumulado hasta:</span>
          <select
            value={mesHasta}
            onChange={e => setMesHasta(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}{i === 11 ? ' (año completo)' : ''}</option>
            ))}
          </select>
        </label>
        {mesHasta < 12 && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Totales de enero a {MONTHS[mesHasta - 1].toLowerCase()} · los meses posteriores (en curso o apuntes futuros) no suman
          </span>
        )}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Ventas"
          valor={totales.ventas}
          subtitulo={mesHasta < 12 ? `ene–${MONTHS[mesHasta - 1].slice(0, 3).toLowerCase()}` : undefined}
          icono="💰"
          colorValor="text-green-600"
        />
        <KPICard
          titulo="Margen Bruto"
          valor={totales.margenBruto}
          subtitulo={`${formatPercent(totales.ventas ? (totales.margenBruto / totales.ventas) * 100 : 0)} s/ventas${sufijoPeriodo}`}
          icono="📊"
          colorValor="text-blue-600"
        />
        <KPICard
          titulo="EBITDA"
          valor={totales.ebitda}
          subtitulo={`${formatPercent(totales.ventas ? (totales.ebitda / totales.ventas) * 100 : 0)} s/ventas${sufijoPeriodo}`}
          icono="💹"
        />
        <KPICard
          titulo="Resultado"
          valor={totales.resultado}
          subtitulo={`${formatPercent(totales.ventas ? (totales.resultado / totales.ventas) * 100 : 0)} s/ventas${sufijoPeriodo}`}
          icono="📈"
        />
      </div>

      {/* Tabla resumen mensual */}
      <ResumenMensual datos={mesesConDatos} totales={totales} />

      {/* Tabla detalle PyG */}
      <TablaDetallePyG datos={mesesConDatos} totales={totales} />

      {/* Gráficos comparativos (año completo, no les afecta el filtro) */}
      <GraficosComparativos />
    </div>
  )
}
