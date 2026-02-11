import React from 'react'
import { calcDesv, getOverallSemaforo } from '../../utils/produccionCalculations'
import SemaforoBadge from './SemaforoBadge'
import OperationBars from './OperationBars'

export default function EstructurasDetailModal({ serie, onClose }) {
  if (!serie) return null

  const sem = getOverallSemaforo(serie)
  const latDesv = calcDesv(serie.lateral?.real, serie.lateral?.teo)
  const basDesv = calcDesv(serie.bastidor?.real, serie.bastidor?.teo)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Serie {serie.serie}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{serie.modelo}</p>
            </div>
            <div className="flex items-center gap-3">
              <SemaforoBadge semaforo={sem} size="md" />
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Info general */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-gray-100">
          <div>
            <span className="text-xs text-gray-500 block">OF Lateral</span>
            <span className="text-sm font-medium">{serie.ofLateral || '-'}</span>
            {serie.nSeriesLat > 0 && (
              <span className="text-xs text-gray-400 block">{serie.nSeriesLat} series</span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 block">OF Bastidor</span>
            <span className="text-sm font-medium">{serie.ofBastidor || '-'}</span>
            {serie.nSeriesBas > 0 && (
              <span className="text-xs text-gray-400 block">{serie.nSeriesBas} series</span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Fechas</span>
            <span className="text-sm font-medium">{serie.fechaIni || '-'}</span>
            {serie.fechaFin && serie.fechaFin !== serie.fechaIni && (
              <span className="text-xs text-gray-400 block">a {serie.fechaFin}</span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Estado</span>
            <span className="text-sm font-medium">{serie.enviado ? 'Enviado' : 'Pendiente'}</span>
            {serie.parcial && (
              <span className="text-xs text-orange-500 block">
                OF parcial {serie.envLatInfo || serie.envBasInfo || ''}
              </span>
            )}
          </div>
        </div>

        {/* Resumen totales */}
        <div className="p-6 grid grid-cols-2 gap-6 border-b border-gray-100">
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Lateral</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {serie.lateral?.real != null ? `${serie.lateral.real.toFixed(1)}h` : '-'}
              </span>
              <span className="text-sm text-gray-500">
                / {serie.lateral?.teo != null ? `${serie.lateral.teo.toFixed(1)}h` : 'S/E'}
              </span>
              {latDesv != null && (
                <span className={`text-sm font-semibold ${latDesv > 5 ? 'text-red-600' : latDesv > -5 ? 'text-green-600' : 'text-green-600'}`}>
                  {latDesv > 0 ? '+' : ''}{latDesv.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Bastidor</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {serie.bastidor?.real > 0 ? `${serie.bastidor.real.toFixed(1)}h` : '-'}
              </span>
              <span className="text-sm text-gray-500">
                / {serie.bastidor?.teo != null ? `${serie.bastidor.teo.toFixed(1)}h` : 'S/E'}
              </span>
              {basDesv != null && (
                <span className={`text-sm font-semibold ${basDesv > 5 ? 'text-red-600' : basDesv > -5 ? 'text-green-600' : 'text-green-600'}`}>
                  {basDesv > 0 ? '+' : ''}{basDesv.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Desglose operaciones */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {serie.lateral?.ops && serie.lateral.ops.length > 0 && (
            <OperationBars ops={serie.lateral.ops} title="Operaciones Lateral" />
          )}
          {serie.bastidor?.ops && serie.bastidor.ops.length > 0 && (
            <OperationBars ops={serie.bastidor.ops} title="Operaciones Bastidor" />
          )}
        </div>
      </div>
    </div>
  )
}
