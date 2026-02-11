import React, { useState } from 'react'
import { ESTRUCTURAS_PAGE_SIZE } from '../../utils/constants'
import { calcDesv, getOverallSemaforo, getMaxDesv, sortSeries } from '../../utils/produccionCalculations'
import SemaforoBadge, { ParcialBadge } from './SemaforoBadge'

function SortHeader({ label, col, sortCol, sortAsc, onSort }) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      className="px-3 py-2 text-left cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        {active && <span className="text-xs">{sortAsc ? '▲' : '▼'}</span>}
      </span>
    </th>
  )
}

function HoursCell({ real, teo }) {
  if (real == null) return <td className="px-3 py-2 text-gray-400 text-xs">-</td>
  const desv = calcDesv(real, teo)
  const desvStr = desv != null ? `${desv > 0 ? '+' : ''}${desv.toFixed(1)}%` : ''
  const desvColor = desv == null ? '' : desv <= 5 ? 'text-green-600' : desv <= 15 ? 'text-yellow-600' : 'text-red-600'

  // Mini inline bar
  const maxRef = teo || real
  const realPct = maxRef > 0 ? Math.min((real / maxRef) * 100, 150) : 0
  const barColor = desv == null ? 'bg-gray-300' : desv <= 5 ? 'bg-green-400' : desv <= 15 ? 'bg-yellow-400' : 'bg-red-400'

  return (
    <td className="px-3 py-2">
      <div className="text-xs">
        <span className="font-medium">{real.toFixed(1)}</span>
        {teo != null && <span className="text-gray-400"> / {teo.toFixed(1)}</span>}
        {desvStr && <span className={`ml-1 font-semibold ${desvColor}`}>{desvStr}</span>}
      </div>
      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(realPct, 100)}%` }} />
      </div>
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
              <th className="px-3 py-2 text-left"></th>
              <SortHeader label="Modelo" col="modelo" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <th className="px-3 py-2 text-left">OF Lateral</th>
              <th className="px-3 py-2 text-left">OF Bastidor</th>
              <SortHeader label="Fecha" col="fechaIni" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Lateral (h)" col="lateralReal" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Bastidor (h)" col="bastidorReal" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Desv. Max" col="bastidorDesv" {...{ sortCol, sortAsc, onSort: handleSort }} />
              <SortHeader label="Estado" col="semaforo" {...{ sortCol, sortAsc, onSort: handleSort }} />
            </tr>
          </thead>
          <tbody>
            {paged.map(s => {
              const sem = getOverallSemaforo(s)
              const maxDesv = getMaxDesv(s)
              const maxDesvColor = maxDesv == null ? 'text-gray-400' : maxDesv <= 5 ? 'text-green-600' : maxDesv <= 15 ? 'text-yellow-600' : 'text-red-600'

              return (
                <tr
                  key={`${s.serie}-${s.ofLateral}`}
                  className="table-row cursor-pointer"
                  onClick={() => onSelectSerie(s)}
                >
                  <td className="px-3 py-2 font-bold">{s.serie}</td>
                  <td className="px-1 py-2">
                    <ParcialBadge serie={s} />
                  </td>
                  <td className="px-3 py-2 text-xs">{s.modelo}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {s.ofLateral || '-'}
                    {s.nSeriesLat > 0 && <span className="text-gray-300"> ({s.nSeriesLat})</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {s.ofBastidor || '-'}
                    {s.nSeriesBas > 0 && <span className="text-gray-300"> ({s.nSeriesBas})</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {s.fechaIni ? s.fechaIni.substring(5) : '-'}
                  </td>
                  <HoursCell real={s.lateral?.real} teo={s.lateral?.teo} />
                  <HoursCell real={s.bastidor?.real > 0 ? s.bastidor.real : null} teo={s.bastidor?.teo} />
                  <td className="px-3 py-2">
                    {maxDesv != null ? (
                      <span className={`text-xs font-bold ${maxDesvColor}`}>
                        {maxDesv > 0 ? '+' : ''}{maxDesv.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <SemaforoBadge semaforo={sem} />
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
