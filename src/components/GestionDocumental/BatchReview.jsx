// ============================================
// BATCH REVIEW - Pantalla de revisión de un lote
// ============================================

import React, { useState, useEffect } from 'react'
import DocumentTable from './DocumentTable'
import DocumentPreview from './DocumentPreview'
import { documental } from '../../lib/supabase'

export default function BatchReview({ batchId, onBack }) {
  const [batch, setBatch] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    loadBatch()
  }, [batchId])

  const loadBatch = async () => {
    setLoading(true)
    const { data, error } = await documental.getBatch(batchId)
    if (data) {
      setBatch(data)
      setDocuments(data.doc_documents || [])
    }
    setLoading(false)
  }

  const handleUpdateDocument = async (docId, updates) => {
    const { error } = await documental.updateDocument(docId, updates)
    if (!error) {
      setDocuments(prev =>
        prev.map(d => d.id === docId ? { ...d, ...updates, estado: 'corregido' } : d)
      )
      if (selectedDoc?.id === docId) {
        setSelectedDoc(prev => ({ ...prev, ...updates, estado: 'corregido' }))
      }
    }
  }

  const handleArchive = async () => {
    if (!confirm('¿Confirmar archivado? Los documentos se moverán a su carpeta destino.')) return

    setArchiving(true)
    const { error } = await documental.archiveBatch(batchId)
    if (!error) {
      onBack()
    } else {
      alert('Error al archivar: ' + error.message)
    }
    setArchiving(false)
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-500">Cargando lote...</p>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Lote no encontrado</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Volver</button>
      </div>
    )
  }

  const pendientes = documents.filter(d => d.estado === 'revisar').length
  const isArchivable = batch.estado === 'pendiente_revision'

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            ← Volver a lotes
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            {batch.fichero_origen}
          </h2>
          <p className="text-sm text-gray-500">
            {batch.total_paginas} páginas · {batch.total_documentos} documentos
            {pendientes > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {pendientes} pendiente{pendientes > 1 ? 's' : ''} de revisión
              </span>
            )}
          </p>
        </div>

        {isArchivable && (
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
          >
            {archiving ? 'Archivando...' : 'Confirmar y archivar ✓'}
          </button>
        )}
      </div>

      {/* Contenido: tabla + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de documentos */}
        <DocumentTable
          documents={documents}
          selectedDocId={selectedDoc?.id}
          onSelectDoc={setSelectedDoc}
        />

        {/* Preview del documento seleccionado */}
        {selectedDoc ? (
          <DocumentPreview
            document={selectedDoc}
            batchId={batchId}
            onUpdate={handleUpdateDocument}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[400px]">
            <p className="text-gray-400">Selecciona un documento para ver el detalle</p>
          </div>
        )}
      </div>
    </div>
  )
}
