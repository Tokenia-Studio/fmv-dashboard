// ============================================
// UPLOAD PDF - Subir PDF para procesamiento
// ============================================

import React, { useState, useRef, useEffect } from 'react'
import { supabase, documental } from '../../lib/supabase'

const POLL_INTERVAL = 8000 // 8 segundos

export default function UploadPDF({ onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false) // PDF subido, esperando procesamiento
  const [fileName, setFileName] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [dots, setDots] = useState('')
  const inputRef = useRef(null)
  const pollRef = useRef(null)
  const batchCountRef = useRef(0)

  // Animación de puntos suspensivos mientras procesa
  useEffect(() => {
    if (!processing) return
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 600)
    return () => clearInterval(interval)
  }, [processing])

  // Polling: detectar cuándo aparece un nuevo lote (= procesamiento terminado)
  useEffect(() => {
    if (!processing) {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const stats = await documental.getStats()
        // Si hay más lotes que cuando empezamos → procesamiento terminado
        if (stats.total > batchCountRef.current) {
          setProcessing(false)
          setFileName(null)
          if (onUploaded) onUploaded()
        }
      } catch {}
    }, POLL_INTERVAL)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [processing, onUploaded])

  const handleFile = async (file) => {
    if (!file) return
    if (processing || uploading) return // Bloquear mientras hay uno en curso
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }

    setUploading(true)
    setError(null)
    setFileName(file.name)

    try {
      // Guardar conteo actual de lotes para detectar cuándo termine
      const stats = await documental.getStats()
      batchCountRef.current = stats.total

      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `pendiente/${timestamp}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('doc-entrada')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Transición a estado "procesando en segundo plano"
      setUploading(false)
      setProcessing(true)
    } catch (err) {
      console.error('Error subiendo PDF:', err)
      setError('Error al subir: ' + (err.message || err))
      setUploading(false)
      setFileName(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (processing || uploading) return
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    if (!processing && !uploading) setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

  const handleClick = () => {
    if (processing || uploading) return
    inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    handleFile(file)
    e.target.value = ''
  }

  // Estado: procesando en segundo plano
  if (processing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl animate-spin">⚙️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800">
                Procesando en segundo plano{dots}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {fileName}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Clasificando páginas con IA · Los resultados aparecerán automáticamente
              </p>
            </div>
            <div className="shrink-0">
              <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          </div>

          {/* Barra de progreso indeterminada */}
          <div className="mt-4 h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Subir PDF escaneado</h3>
      </div>

      <div className="p-6">
        {/* Drop zone */}
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : uploading
                ? 'border-gray-200 bg-gray-50 cursor-wait pointer-events-none'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          {uploading ? (
            <>
              <div className="text-3xl mb-3 animate-spin">⏳</div>
              <p className="text-gray-600 font-medium">Subiendo "{fileName}"...</p>
              <p className="text-xs text-gray-400 mt-2">No cierres esta página</p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-3">📤</div>
              <p className="text-gray-600 font-medium">
                Arrastra un PDF aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-gray-400 mt-2">
                El servicio lo procesará automáticamente (split + clasificación + agrupación)
              </p>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
