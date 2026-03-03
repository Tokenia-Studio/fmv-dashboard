import React from 'react'

export default function PlanificacionFilters({ filters, setFilters, meses, clientes }) {
  const update = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const limpiar = () => setFilters({ mes: 'todos', cliente: 'todos', busqueda: '', semaforo: 'todos' })

  const semaforoButtons = [
    { id: 'todos', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
    { id: 'green', label: 'En plazo', color: 'bg-green-100 text-green-700' },
    { id: 'yellow', label: 'Alerta', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'red', label: 'Retrasadas', color: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Mes */}
        <select
          value={filters.mes || 'todos'}
          onChange={e => update('mes', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
        >
          <option value="todos">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* Cliente */}
        <select
          value={filters.cliente || 'todos'}
          onChange={e => update('cliente', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none max-w-[200px]"
        >
          <option value="todos">Todos los clientes</option>
          {clientes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar orden, descripción..."
          value={filters.busqueda || ''}
          onChange={e => update('busqueda', e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none w-48"
        />

        {/* Semáforo (demo) */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-3">
          {semaforoButtons.map(s => (
            <button
              key={s.id}
              onClick={() => update('semaforo', s.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                filters.semaforo === s.id
                  ? s.color + ' ring-2 ring-offset-1 ring-gray-300'
                  : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {s.label}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-1">FASE 2</span>
        </div>

        {/* Limpiar */}
        <button
          onClick={limpiar}
          className="ml-auto px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Limpiar
        </button>
      </div>
    </div>
  )
}
