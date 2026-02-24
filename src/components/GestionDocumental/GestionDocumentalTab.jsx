// ============================================
// GESTION DOCUMENTAL TAB - Pestaña principal
// ============================================

import React, { useState, useEffect } from 'react'
import KPICard from '../UI/KPICard'
import BatchList from './BatchList'
import BatchReview from './BatchReview'
import { documental } from '../../lib/supabase'

export default function GestionDocumentalTab() {
  const [batches, setBatches] = useState([])
  const [stats, setStats] = useState({ procesados: 0, pendientes: 0, total: 0, docsTotal: 0 })
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [batchesRes, statsRes] = await Promise.all([
        documental.getBatches(),
        documental.getStats()
      ])
      if (batchesRes.data) setBatches(batchesRes.data)
      setStats(statsRes)
    } catch (err) {
      console.error('Error cargando gestión documental:', err)
    }
    setLoading(false)
  }

  // Si hay un lote seleccionado, mostrar la pantalla de revisión
  if (selectedBatchId) {
    return (
      <BatchReview
        batchId={selectedBatchId}
        onBack={() => {
          setSelectedBatchId(null)
          loadData()
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-500">Cargando gestión documental...</p>
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin lotes procesados</h2>
        <p className="text-gray-500">
          Cuando el servicio de gestión documental procese PDFs escaneados, aparecerán aquí para revisión.
        </p>
        <p className="text-gray-400 text-sm mt-4">
          El servicio vigila la carpeta de entrada del servidor y procesa automáticamente los PDFs.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Lotes procesados"
          valor={stats.procesados}
          icono="✅"
          colorValor="text-green-600"
        />
        <KPICard
          titulo="Pendientes revisión"
          valor={stats.pendientes}
          icono="⚠️"
          colorValor={stats.pendientes > 0 ? 'text-amber-600' : 'text-gray-600'}
        />
        <KPICard
          titulo="Total documentos"
          valor={stats.docsTotal}
          icono="📄"
          colorValor="text-blue-600"
        />
        <KPICard
          titulo="Lotes totales"
          valor={stats.total}
          icono="📦"
          colorValor="text-gray-600"
        />
      </div>

      {/* Lista de lotes */}
      <BatchList
        batches={batches}
        onSelectBatch={setSelectedBatchId}
      />
    </div>
  )
}
