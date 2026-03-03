import React, { useState, useMemo } from 'react'
import { usePlanificacion } from '../../context/PlanificacionContext'
import { filterOrdenes, calcularKPIs, extraerMesesUnicos, extraerClientesUnicos } from '../../utils/planificacionCalculations'
import PlanificacionUploader from './PlanificacionUploader'
import PlanificacionKPIs from './PlanificacionKPIs'
import PlanificacionFilters from './PlanificacionFilters'
import PlanificacionTable from './PlanificacionTable'

export default function PlanificacionProduccionTab() {
  const { ordenes, dataLoaded, fechaCarga, stats } = usePlanificacion()
  const [filters, setFilters] = useState({ mes: 'todos', cliente: 'todos', busqueda: '', semaforo: 'todos' })
  const [showUploader, setShowUploader] = useState(false)

  const meses = useMemo(() => extraerMesesUnicos(ordenes), [ordenes])
  const clientes = useMemo(() => extraerClientesUnicos(ordenes), [ordenes])

  const filtered = useMemo(() => filterOrdenes(ordenes, filters), [ordenes, filters])
  const kpis = useMemo(() => calcularKPIs(filtered), [filtered])

  if (!dataLoaded || ordenes.length === 0 || showUploader) {
    return <PlanificacionUploader onVolver={dataLoaded && ordenes.length > 0 ? () => setShowUploader(false) : null} />
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Planificación Producción</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {fechaCarga && (
              <span>
                Datos: {new Date(fechaCarga).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span>{stats.totalOrdenes} órdenes | {stats.totalRutas} con rutas | {stats.totalVinculos} vínculos</span>
          </div>
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Recargar ficheros
        </button>
      </div>

      <PlanificacionKPIs kpis={kpis} />
      <PlanificacionFilters filters={filters} setFilters={setFilters} meses={meses} clientes={clientes} />
      <PlanificacionTable ordenes={filtered} />
    </div>
  )
}
