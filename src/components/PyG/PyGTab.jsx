// ============================================
// PYG TAB - Pestaña principal de PyG
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import ResumenMensual from './ResumenMensual'
import TablaDetallePyG from './TablaDetallePyG'
import GraficosComparativos from './GraficosComparativos'
import { formatPercent } from '../../utils/formatters'

export default function PyGTab() {
  const { pyg, totalesPyG, añoActual } = useData()

  const mesesConDatos = pyg.filter(m => m.ventas !== 0 || m.resultado !== 0)

  if (mesesConDatos.length === 0) {
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
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Ventas"
          valor={totalesPyG.ventas}
          icono="💰"
          colorValor="text-green-600"
        />
        <KPICard
          titulo="Margen Bruto"
          valor={totalesPyG.margenBruto}
          subtitulo={`${formatPercent(totalesPyG.ventas ? (totalesPyG.margenBruto / totalesPyG.ventas) * 100 : 0)} s/ventas`}
          icono="📊"
          colorValor="text-blue-600"
        />
        <KPICard
          titulo="EBITDA"
          valor={totalesPyG.ebitda}
          subtitulo={`${formatPercent(totalesPyG.ventas ? (totalesPyG.ebitda / totalesPyG.ventas) * 100 : 0)} s/ventas`}
          icono="💹"
        />
        <KPICard
          titulo="Resultado"
          valor={totalesPyG.resultado}
          subtitulo={`${formatPercent(totalesPyG.ventas ? (totalesPyG.resultado / totalesPyG.ventas) * 100 : 0)} s/ventas`}
          icono="📈"
        />
      </div>

      {/* Tabla resumen mensual */}
      <ResumenMensual datos={mesesConDatos} totales={totalesPyG} />

      {/* Tabla detalle PyG */}
      <TablaDetallePyG datos={mesesConDatos} totales={totalesPyG} />

      {/* Gráficos comparativos */}
      <GraficosComparativos />
    </div>
  )
}
