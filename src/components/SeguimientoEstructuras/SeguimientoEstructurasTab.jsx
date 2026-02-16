import React, { useState, useMemo } from 'react'
import { useProduccion } from '../../context/ProduccionContext'
import { calcularKPIsEstructuras, filterSeries } from '../../utils/produccionCalculations'
import EstructurasUploader from './EstructurasUploader'
import EstructurasKPIs from './EstructurasKPIs'
import EstructurasFilters from './EstructurasFilters'
import EstructurasTable from './EstructurasTable'
import EstructurasDetailModal from './EstructurasDetailModal'

export default function SeguimientoEstructurasTab() {
  const { seriesData, dataLoaded, fechaCarga, limpiarDatosEstructuras } = useProduccion()
  const [filters, setFilters] = useState({ semaforo: 'todos' })
  const [selectedSerie, setSelectedSerie] = useState(null)
  const [showUploader, setShowUploader] = useState(false)

  // List of unique models
  const modelos = useMemo(() => {
    const set = new Set(seriesData.map(s => s.modelo))
    return [...set].sort()
  }, [seriesData])

  // Filtered series
  const filtered = useMemo(() => {
    return filterSeries(seriesData, filters)
  }, [seriesData, filters])

  // KPIs from filtered data
  const kpis = useMemo(() => {
    return calcularKPIsEstructuras(filtered)
  }, [filtered])

  // Show uploader if no data or user requested it
  if (!dataLoaded || seriesData.length === 0 || showUploader) {
    return <EstructurasUploader onVolver={dataLoaded && seriesData.length > 0 ? () => setShowUploader(false) : null} />
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Seguimiento Estructuras</h2>
          {fechaCarga && (
            <p className="text-xs text-gray-400">
              Datos cargados: {new Date(fechaCarga).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowUploader(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Recargar ficheros
        </button>
      </div>

      {/* KPIs */}
      <EstructurasKPIs kpis={kpis} />

      {/* Filters */}
      <EstructurasFilters
        filters={filters}
        setFilters={setFilters}
        modelos={modelos}
      />

      {/* Table */}
      <EstructurasTable
        series={filtered}
        onSelectSerie={setSelectedSerie}
      />

      {/* Detail modal */}
      {selectedSerie && (
        <EstructurasDetailModal
          serie={selectedSerie}
          onClose={() => setSelectedSerie(null)}
        />
      )}
    </div>
  )
}
