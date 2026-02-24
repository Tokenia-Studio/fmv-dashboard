// ============================================
// GESTION DOCUMENTAL TAB - Pestaña principal
// ============================================

import React, { useState, useEffect } from 'react'
import KPICard from '../UI/KPICard'
import BatchList from './BatchList'
import ReviewPanel from './ReviewPanel'
import HistoricoModal from './HistoricoModal'
import UploadPDF from './UploadPDF'
import { documental } from '../../lib/supabase'

export default function GestionDocumentalTab() {
  const [batches, setBatches] = useState([])
  const [stats, setStats] = useState({ procesados: 0, pendientes: 0, total: 0, docsTotal: 0 })
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [showHistorico, setShowHistorico] = useState(false)
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

  // Si hay un lote seleccionado, mostrar la pantalla de revisión agrupada
  if (selectedBatchId) {
    return (
      <ReviewPanel
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
      <div className="space-y-6 animate-fadeIn">
        <UploadPDF onUploaded={loadData} />
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Sin lotes procesados</h2>
          <p className="text-gray-500 text-sm">
            Sube un PDF escaneado o espera a que el servicio procese los de la carpeta de entrada.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs + botón histórico */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
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
        <button
          onClick={() => setShowHistorico(true)}
          className="shrink-0 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
          title="Gestionar histórico"
        >
          Histórico
        </button>
      </div>

      {/* Subir PDF */}
      <UploadPDF onUploaded={loadData} />

      {/* Lista de lotes */}
      <BatchList
        batches={batches}
        onSelectBatch={setSelectedBatchId}
      />

      {/* Modal histórico */}
      <HistoricoModal
        isOpen={showHistorico}
        onClose={() => setShowHistorico(false)}
        onDeleted={loadData}
      />
    </div>
  )
}
