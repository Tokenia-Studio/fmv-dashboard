// ============================================
// HISTORICO MODAL - Gestión del histórico documental
// Borrar por rango de fechas, proveedor o todo
// ============================================

import React, { useState, useEffect } from 'react'
import { documental } from '../../lib/supabase'

export default function HistoricoModal({ isOpen, onClose, onDeleted }) {
  const [mode, setMode] = useState('todo') // 'todo' | 'fechas' | 'proveedor'
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [proveedores, setProveedores] = useState([])
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadProveedores()
      loadStats()
      setConfirmText('')
      setResult(null)
      setMode('todo')
    }
  }, [isOpen])

  const loadProveedores = async () => {
    const { data } = await documental.getProveedoresUnicos()
    if (data) setProveedores(data)
  }

  const loadStats = async () => {
    const s = await documental.getStats()
    setStats(s)
  }

  const canDelete = () => {
    if (mode === 'todo') return confirmText === 'BORRAR'
    if (mode === 'fechas') return fechaDesde && fechaHasta && confirmText === 'BORRAR'
    if (mode === 'proveedor') return proveedor && confirmText === 'BORRAR'
    return false
  }

  const handleDelete = async () => {
    if (!canDelete()) return

    setDeleting(true)
    setResult(null)

    try {
      let res
      if (mode === 'todo') {
        res = await documental.deleteAllHistory()
      } else if (mode === 'fechas') {
        res = await documental.deleteByDateRange(fechaDesde, fechaHasta)
      } else if (mode === 'proveedor') {
        res = await documental.deleteByProveedor(proveedor)
      }

      if (res?.error) {
        setResult({ type: 'error', message: 'Error: ' + res.error.message })
      } else {
        setResult({ type: 'success', message: `Eliminados ${res?.count || 0} registro(s) correctamente.` })
        setConfirmText('')
        loadStats()
        if (onDeleted) onDeleted()
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Error inesperado: ' + err.message })
    }

    setDeleting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Gestión del histórico</h2>
            {stats && (
              <p className="text-xs text-gray-400 mt-1">
                {stats.total} lotes · {stats.docsTotal} documentos en total
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Modo de borrado */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de borrado</label>
            <div className="flex gap-2">
              {[
                { id: 'todo', label: 'Todo el histórico' },
                { id: 'fechas', label: 'Por fechas' },
                { id: 'proveedor', label: 'Por proveedor' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setMode(opt.id); setConfirmText(''); setResult(null) }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    mode === opt.id
                      ? 'bg-red-50 border-red-200 text-red-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtros según modo */}
          {mode === 'fechas' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Desde</label>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={e => setFechaDesde(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={e => setFechaHasta(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          )}

          {mode === 'proveedor' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proveedor</label>
              {proveedores.length > 0 ? (
                <select
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={proveedor}
                  onChange={e => setProveedor(e.target.value)}
                  placeholder="Nombre del proveedor..."
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500"
                />
              )}
            </div>
          )}

          {/* Aviso */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 font-medium mb-1">Acción irreversible</p>
            <p className="text-xs text-red-600">
              {mode === 'todo' && 'Se eliminarán TODOS los lotes, documentos y previews del almacenamiento.'}
              {mode === 'fechas' && `Se eliminarán los lotes procesados entre ${fechaDesde || '...'} y ${fechaHasta || '...'}.`}
              {mode === 'proveedor' && `Se eliminarán todos los documentos del proveedor "${proveedor || '...'}".`}
            </p>
          </div>

          {/* Confirmación */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Escribe <strong>BORRAR</strong> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="BORRAR"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 focus:border-red-500 font-mono"
            />
          </div>

          {/* Resultado */}
          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              result.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {result.message}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete() || deleting}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
