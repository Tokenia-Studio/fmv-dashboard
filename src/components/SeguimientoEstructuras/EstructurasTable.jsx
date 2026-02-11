import React, { useState } from 'react'
import { ESTRUCTURAS_PAGE_SIZE } from '../../utils/constants'
import { calcDesv, getOverallSemaforo, sortSeries } from '../../utils/produccionCalculations'
import SemaforoBadge from './SemaforoBadge'

function SortHeader({ label, col, sortCol, sortAsc, onSort }) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2 text-left cursor-pointer hover:bg-slate-100 transition-colors select-none"
    >
      <span className="flex items-center gap-1">
        {label}
        {active && <span className="text-xs">{sortAsc ? '▲' : '▼'}</span>}
      </span>
    </th>
  )
}

function DesvCell({ real, teo }) {
  const desv = calcDesv(real, teo)
  if (desv == null) return <td className="px-3 py-2 text-gray-400 text-xs">-</td>
  const color = Math.abs(desv) <= 5 ? 'text-green-600' : Math.abs(desv) <= 15 ? 'text-yellow-600' : 'text-red-600'
  return (
    <td className={`px-3 py-2 text-xs font-semibold ${color}`}>
      {desv > 0 ? '+' : ''}{desv.toFixed(1)}%
    </td>
  )
}

export default function EstructurasTable({ series, onSelectSerie }) {
  const [sortCol, setSortCol] = useState('serie')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
    setPage(0)
  }

  const sorted = sortSeries(series, sortCol, sortAsc)
  const totalPages = Math.ceil(sorted.length / ESTRUCTURAS_PAGE_SIZE)
  const paged = sorted.slice(page * ESTRUCTURAS_PAGE_SIZE, (page + 1) * ESTRUCTURAS_PAGE_SIZE)

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <SortHeader label="Serie" col="serie" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Modelo" col="modelo" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <th className="px-3 py-2 text-left">OFs</th>
              <SortHeader label="Fecha" col="fechaIni" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Lat. Real" col="lateralReal" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Lat. Desv" col="lateralDesv" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Bas. Real" col="bastidorReal" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Bas. Desv" col="bastidorDesv" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Estado" col="semaforo" {...{ sortCol, sortAsc, onSort: handleSort }} />
            </tr>
          </thead>
          <tbody>
            {paged.map(s => {
              const sem = getOverallSemaforo(s)
              return (
                <tr
                  key={`${s.serie}-${s.ofLateral}`}
                  className="table-row cursor-pointer"
                  onClick={() => onSelectSerie(s)}
                >
                  <td className="px-3 py-2 font-medium">{s.serie}</td>
                  <td className="px-3 py-2 text-xs">{s.modelo}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {s.ofLateral && <div>L: {s.ofLateral}</div>}
                    {s.ofBastidor && <div>B: {s.ofBastidor}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {s.fechaIni || '-'}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium">
                    {s.lateral?.real != null ? `${s.lateral.real.toFixed(1)}h` : '-'}
                  </td>
                  <DesvCell real={s.lateral?.real} teo={s.lateral?.teo} />
                  <td className="px-3 py-2 text-xs font-medium">
                    {s.bastidor?.real != null && s.bastidor.real > 0 ? `${s.bastidor.real.toFixed(1)}h` : '-'}
                  </td>
                  <DesvCell real={s.bastidor?.real} teo={s.bastidor?.teo} />
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <SemaforoBadge semaforo={sem} />
                      {s.parcial && <span className="text-xs text-orange-500" title="OF parcial">P</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            {series.length} series | Pag {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
