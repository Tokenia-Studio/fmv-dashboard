import React, { useState, useRef } from 'react'
import { usePlanificacion } from '../../context/PlanificacionContext'
import { useData } from '../../context/DataContext'

function DropZone({ label, icon, file, onFile, accept }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
        ${dragOver ? 'border-blue-400 bg-blue-50' :
          file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])}
        className="hidden"
      />
      <div className="text-3xl mb-2">{file ? '✅' : icon}</div>
      <p className="font-medium text-gray-700 text-sm">{label}</p>
      {file ? (
        <p className="text-xs text-green-600 mt-1 truncate">{file.name}</p>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Arrastra o haz clic</p>
      )}
    </div>
  )
}

export default function PlanificacionUploader({ onVolver }) {
  const { cargarDatosPlanificacion, loading, loadingMessage } = usePlanificacion()
  const { setTab } = useData()
  const [ordenesFile, setOrdenesFile] = useState(null)
  const [rutasFile, setRutasFile] = useState(null)
  const [vinculosFile, setVinculosFile] = useState(null)
  const [result, setResult] = useState(null)

  const handleProcesar = async () => {
    if (!ordenesFile || !rutasFile || !vinculosFile) return
    setResult(null)
    const res = await cargarDatosPlanificacion(ordenesFile, rutasFile, vinculosFile)
    setResult(res)
    if (res.success && onVolver) onVolver()
  }

  const handleVolver = () => {
    if (onVolver) onVolver()
    else setTab('pyg')
  }

  const ready = ordenesFile && rutasFile && vinculosFile && !loading

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-xl font-bold text-slate-800">Planificación Producción</h2>
          <p className="text-sm text-gray-500 mt-2">
            Sube los 3 ficheros de Business Central para generar el dashboard de producción
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <DropZone
            label="Órdenes Producción"
            icon="📦"
            file={ordenesFile}
            onFile={setOrdenesFile}
            accept=".xlsx,.xls"
          />
          <DropZone
            label="Rutas Producción"
            icon="🔄"
            file={rutasFile}
            onFile={setRutasFile}
            accept=".xlsx,.xls"
          />
          <DropZone
            label="Vínculos Productos"
            icon="🔗"
            file={vinculosFile}
            onFile={setVinculosFile}
            accept=".xlsx,.xls"
          />
        </div>

        {loading && (
          <div className="mb-4 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-xl">⚙️</div>
              <span className="text-sm text-blue-700">{loadingMessage || 'Procesando...'}</span>
            </div>
          </div>
        )}

        {result && (
          <div className={`mb-4 rounded-lg p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            {result.success ? (
              <div className="text-sm text-green-700">
                <strong>Procesado:</strong> {result.totalOrdenes} órdenes, {result.totalRutas} con rutas, {result.totalVinculos} vínculos
              </div>
            ) : (
              <div className="text-sm text-red-700">
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleVolver}
            className="px-6 py-3 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleProcesar}
            disabled={!ready}
            className="flex-1 btn-primary py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Procesar datos'}
          </button>
        </div>
      </div>
    </div>
  )
}
