import React from 'react'
import KPICard from '../UI/KPICard'

export default function EstructurasKPIs({ kpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <KPICard
        titulo="Total Series"
        valor={kpis.total}
        icono="🏗️"
        formato="raw"
        colorValor="text-slate-800"
      />
      <KPICard
        titulo="OK"
        valor={kpis.verdes}
        icono="🟢"
        formato="raw"
        colorValor="text-green-600"
        subtitulo={kpis.total > 0 ? `${((kpis.verdes / kpis.total) * 100).toFixed(0)}%` : ''}
      />
      <KPICard
        titulo="Alerta"
        valor={kpis.amarillas}
        icono="🟡"
        formato="raw"
        colorValor="text-yellow-600"
        subtitulo={kpis.total > 0 ? `${((kpis.amarillas / kpis.total) * 100).toFixed(0)}%` : ''}
      />
      <KPICard
        titulo="Fuera"
        valor={kpis.rojas}
        icono="🔴"
        formato="raw"
        colorValor="text-red-600"
        subtitulo={kpis.total > 0 ? `${((kpis.rojas / kpis.total) * 100).toFixed(0)}%` : ''}
      />
      <KPICard
        titulo="Parciales"
        valor={kpis.parciales}
        icono="⚠️"
        formato="raw"
        colorValor="text-orange-600"
        subtitulo="OFs mixtas"
      />
    </div>
  )
}
