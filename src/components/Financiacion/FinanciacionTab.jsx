// ============================================
// FINANCIACION TAB - Pestaña de Financiación
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import EvolucionDeuda from './EvolucionDeuda'
import GastosFinancieros from './GastosFinancieros'
import RatiosPanel from './RatiosPanel'
import { formatCurrency, formatNumber } from '../../utils/formatters'

export default function FinanciacionTab() {
  const { financiacion, añoActual } = useData()
  const { kpis, ratios, meses } = financiacion

  const tieneDeuda = kpis.deudaTotal > 0 || meses.some(m => m.deudaTotal > 0)

  if (!tieneDeuda && kpis.gastosFinYTD === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🏦</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos de Financiación</h2>
        <p className="text-gray-500">No se encontraron cuentas de deuda (17x, 52x) ni gastos financieros (66x)</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          titulo="Deuda Corto Plazo"
          valor={kpis.deudaCorto}
          subtitulo="Vence en < 1 año (cta. 52x)"
          icono="📅"
          colorValor="text-red-600"
        />
        <KPICard
          titulo="Deuda Largo Plazo"
          valor={kpis.deudaLargo}
          subtitulo="Vence en > 1 año (cta. 17x)"
          icono="📆"
          colorValor="text-orange-600"
        />
        <KPICard
          titulo="Deuda Total"
          valor={kpis.deudaTotal}
          subtitulo="Suma corto + largo plazo"
          icono="🏦"
          colorValor="text-slate-800"
        />
        <KPICard
          titulo="Deuda Neta"
          valor={kpis.deudaNeta}
          subtitulo="Deuda total - Tesorería"
          icono="💳"
        />
        <KPICard
          titulo="Gastos Fin. YTD"
          valor={kpis.gastosFinYTD}
          subtitulo="Intereses + comisiones (cta. 66x)"
          icono="💸"
          colorValor="text-red-600"
        />
        <KPICard
          titulo="Tesorería"
          valor={kpis.tesoreria}
          subtitulo="Saldo en bancos (cta. 57x)"
          icono="💰"
          colorValor="text-green-600"
        />
      </div>

      {/* Panel de Ratios */}
      <RatiosPanel ratios={ratios} kpis={kpis} />

      {/* Gráfico evolución deuda */}
      <EvolucionDeuda datos={meses} año={añoActual} />

      {/* Gráfico gastos financieros */}
      <GastosFinancieros datos={meses} año={añoActual} />
    </div>
  )
}
