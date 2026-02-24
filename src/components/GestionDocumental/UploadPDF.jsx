// ============================================
// UPLOAD PDF - Subir PDF para procesamiento
// ============================================

import React, { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function UploadPDF({ onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Nombre único para evitar colisiones
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

      setSuccess(`"${file.name}" subido correctamente. El servicio lo procesará automáticamente.`)
      if (onUploaded) onUploaded()
    } catch (err) {
      console.error('Error subiendo PDF:', err)
      setError('Error al subir: ' + (err.message || err))
    }

    setUploading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    handleFile(file)
    e.target.value = ''
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
                ? 'border-gray-200 bg-gray-50 cursor-wait'
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
              <p className="text-gray-600 font-medium">Subiendo...</p>
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

        {/* Mensajes */}
        {error && (
          <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}
