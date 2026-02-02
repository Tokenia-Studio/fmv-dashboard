// ============================================
// CARGA PRESUPUESTO - Upload de archivo
// ============================================

import React, { useRef, useState } from 'react'
import { useData } from '../../context/DataContext'

export default function CargaPresupuesto() {
  const { cargarPresupuesto, presupuestos, añoActual, años } = useData()
  const fileInputRef = useRef(null)
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [añoSeleccionado, setAñoSeleccionado] = useState(añoActual)

  const tienePresupuesto = presupuestos && presupuestos.length > 0

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setCargando(true)
    setResultado(null)

    const res = await cargarPresupuesto(file, añoSeleccionado)

    setCargando(false)
    setResultado(res)

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>📤</span>
            Cargar Presupuesto
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {tienePresupuesto
              ? `Presupuesto cargado: ${presupuestos.length} lineas para ${añoActual}`
              : 'Sube un archivo Excel con el presupuesto'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de año */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Año:</label>
            <select
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              {/* Mostrar años disponibles + año actual + siguiente */}
              {[...new Set([...años, añoActual, añoActual + 1, 2024, 2025, 2026])].sort((a, b) => b - a).map(año => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="presupuesto-upload"
          />

          <label
            htmlFor="presupuesto-upload"
            className={`px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors
                       ${cargando
                         ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                         : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {cargando ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚙️</span>
                Cargando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>📂</span>
                {tienePresupuesto ? 'Reemplazar' : 'Seleccionar archivo'}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Resultado de la carga */}
      {resultado && (
        <div className={`mt-4 p-3 rounded-lg ${resultado.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {resultado.success ? (
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>Presupuesto {añoSeleccionado} cargado: {resultado.count} lineas</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>❌</span>
              <span>Error: {resultado.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
