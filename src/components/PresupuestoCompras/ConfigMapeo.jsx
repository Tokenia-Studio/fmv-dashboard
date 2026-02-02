// ============================================
// CONFIG MAPEO - Mapeo grupo contable -> cuenta
// ============================================

import React, { useState, useEffect } from 'react'
import { useData } from '../../context/DataContext'

export default function ConfigMapeo({ onClose }) {
  const { mapeoGrupoCuenta, guardarMapeo } = useData()
  const [filas, setFilas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    if (mapeoGrupoCuenta && mapeoGrupoCuenta.length > 0) {
      setFilas(mapeoGrupoCuenta.map(m => ({ ...m })))
    }
  }, [mapeoGrupoCuenta])

  const handleChange = (idx, field, value) => {
    setFilas(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const handleGuardar = async () => {
    setGuardando(true)
    setMensaje(null)
    try {
      await guardarMapeo(filas)
      setMensaje({ tipo: 'success', texto: 'Mapeo guardado correctamente' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
    setGuardando(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>&#9881;</span>
          <span>Mapeo Grupo Contable &rarr; Cuenta</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-3 py-1 text-sm bg-green-500/80 text-white rounded hover:bg-green-500 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-1 text-sm bg-white/20 text-white rounded hover:bg-white/30">
              Cerrar
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div className={`p-3 text-sm ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="p-2 text-left">Grupo Contable</th>
              <th className="p-2 text-left">Cuenta Asignada</th>
              <th className="p-2 text-left">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, idx) => (
              <tr key={fila.grupo_contable} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono font-medium">{fila.grupo_contable}</td>
                <td className="p-2">
                  <input
                    type="text"
                    value={fila.cuenta || ''}
                    onChange={(e) => handleChange(idx, 'cuenta', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm font-mono"
                    placeholder="Ej: 600000000"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={fila.descripcion || ''}
                    onChange={(e) => handleChange(idx, 'descripcion', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Descripción"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
