import React from 'react'
import { calcDesv, getSemaforo } from '../../utils/produccionCalculations'
import SemaforoBadge from './SemaforoBadge'
import OperationBars from './OperationBars'

function SectionHeader({ prefix, label, real, teo }) {
  const desv = calcDesv(real, teo)
  const sem = getSemaforo(desv)

  return (
    <div className="bg-slate-50 rounded-xl p-5 mb-1">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center text-sm font-bold">{prefix}</span>
        <h3 className="text-base font-bold text-slate-800">{label}</h3>
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-sm">
          Real: <strong className="text-lg">{real != null ? `${real.toFixed(1)} h` : '-'}</strong>
        </span>
        <span className="text-sm text-gray-500">
          Teorico: <strong>{teo != null ? `${teo.toFixed(1)} h` : 'Sin estandar'}</strong>
        </span>
        {desv != null && (
          <span className={`text-sm font-bold ${sem === 'green' ? 'text-green-600' : sem === 'yellow' ? 'text-yellow-600' : 'text-red-600'}`}>
            Desviacion: {desv > 0 ? '+' : ''}{desv.toFixed(1)}%
          </span>
        )}
        <SemaforoBadge semaforo={sem} size="md" />
      </div>
    </div>
  )
}

export default function EstructurasDetailModal({ serie, onClose }) {
  if (!serie) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Serie {serie.serie}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Modelo: <strong>{serie.modelo}</strong>
                {serie.fechaIni && (() => {
                  const fmt = d => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}` }
                  return <> &nbsp; Periodo: <strong>{fmt(serie.fechaIni)}</strong>{serie.fechaFin && serie.fechaFin !== serie.fechaIni ? ` a ${fmt(serie.fechaFin)}` : ''}</>
                })()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {serie.ofLateral && <>OF Lateral: <strong>{serie.ofLateral}</strong> ({serie.nSeriesLat} series) &nbsp;</>}
                {serie.ofBastidor && <>OF Bastidor: <strong>{serie.ofBastidor}</strong> ({serie.nSeriesBas} series)</>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-lg"
            >
              ×
            </button>
          </div>

          {/* Parcial warning */}
          {serie.parcial && (
            <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
              <strong>PARCIAL:</strong> Esta OF tiene series aun no enviadas.
              {serie.envLatInfo && <> Lateral: {serie.envLatInfo} enviadas.</>}
              {serie.envBasInfo && <> Bastidor: {serie.envBasInfo} enviadas.</>}
              {' '}Los datos de horas pueden estar sobrevalorados al dividir entre todas las series.
            </div>
          )}
        </div>

        {/* Lateral section */}
        {serie.lateral && (
          <div className="p-6 border-b border-gray-100">
            <SectionHeader
              prefix="L"
              label="LATERAL"
              real={serie.lateral.real}
              teo={serie.lateral.teo}
            />
            {serie.lateral.ops && serie.lateral.ops.length > 0 && (
              <div className="mt-4">
                <OperationBars ops={serie.lateral.ops} title="Operaciones Lateral" />
              </div>
            )}
          </div>
        )}

        {/* Bastidor section */}
        {serie.bastidor && (
          <div className="p-6">
            <SectionHeader
              prefix="B"
              label="BASTIDOR"
              real={serie.bastidor.real > 0 ? serie.bastidor.real : null}
              teo={serie.bastidor.teo}
            />
            {serie.bastidor.ops && serie.bastidor.ops.length > 0 && (
              <div className="mt-4">
                <OperationBars ops={serie.bastidor.ops} title="Operaciones Bastidor" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
