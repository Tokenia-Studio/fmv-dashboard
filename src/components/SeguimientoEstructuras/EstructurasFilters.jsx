import React from 'react'

const SEMAFORO_OPTIONS = [
  { value: 'todos', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
  { value: 'green', label: 'OK', color: 'bg-green-100 text-green-700' },
  { value: 'yellow', label: 'Alerta', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'red', label: 'Fuera', color: 'bg-red-100 text-red-700' },
  { value: 'gray', label: 'S/D', color: 'bg-gray-100 text-gray-500' }
]

export default function EstructurasFilters({ filters, setFilters, modelos }) {
  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))

  return (
    <div className="card p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Modelo dropdown */}
        <div>
          <select
            value={filters.modelo || ''}
            onChange={e => update('modelo', e.target.value || null)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          >
            <option value="">Todos los modelos</option>
            {modelos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Semáforo buttons */}
        <div className="flex gap-1">
          {SEMAFORO_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => update('semaforo', opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${filters.semaforo === opt.value
                  ? `${opt.color} ring-2 ring-offset-1 ring-slate-400`
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Texto (serie/OF) */}
        <div>
          <input
            type="text"
            value={filters.texto || ''}
            onChange={e => update('texto', e.target.value || null)}
            placeholder="Serie u OF..."
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm w-36
                       focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={filters.fechaDesde || ''}
            onChange={e => update('fechaDesde', e.target.value || null)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm
                       focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <span className="text-gray-400 text-xs">a</span>
          <input
            type="date"
            value={filters.fechaHasta || ''}
            onChange={e => update('fechaHasta', e.target.value || null)}
            className="px-2 py-1.5 rounded-lg border border-gray-300 text-sm
                       focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
        </div>

        {/* Reset */}
        <button
          onClick={() => setFilters({ semaforo: 'todos' })}
          className="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
