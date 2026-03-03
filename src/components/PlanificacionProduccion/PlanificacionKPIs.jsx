import React from 'react'

function KPICard({ label, value, sub, color, demo }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm ${demo ? 'border border-dashed border-gray-300' : 'border border-gray-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        {demo && <span className="text-[10px] text-gray-400 font-medium">FASE 2</span>}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function PlanificacionKPIs({ kpis }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <KPICard
        label="Total Órdenes"
        value={kpis.total}
        color="text-slate-800"
      />
      <KPICard
        label="En Plazo"
        value={`${kpis.pctPlazo}%`}
        sub={`${kpis.enPlazo} órdenes`}
        color="text-green-600"
        demo
      />
      <KPICard
        label="Alerta"
        value={`${kpis.pctAlerta}%`}
        sub={`${kpis.alerta} órdenes`}
        color="text-yellow-600"
        demo
      />
      <KPICard
        label="Retrasadas"
        value={`${kpis.pctRetrasadas}%`}
        sub={`${kpis.retrasadas} órdenes`}
        color="text-red-600"
        demo
      />
    </div>
  )
}
