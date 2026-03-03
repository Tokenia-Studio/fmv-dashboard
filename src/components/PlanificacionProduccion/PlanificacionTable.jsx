import React, { useState, useMemo } from 'react'
import { sortOrdenes, getDemoSemaforo } from '../../utils/planificacionCalculations'
import OrdenDetailRow from './OrdenDetailRow'

const PAGE_SIZE = 50

const SEMAFORO_BADGE = {
  green: { bg: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  yellow: { bg: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  red: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

function SortHeader({ label, col, sortCol, sortAsc, onSort }) {
  const active = sortCol === col
  return (
    <th
      className="py-2 px-2 text-left text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      {active && <span className="ml-1">{sortAsc ? '▲' : '▼'}</span>}
    </th>
  )
}

function formatDate(d) {
  if (!d) return '-'
  const date = d instanceof Date ? d : new Date(d)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function PlanificacionTable({ ordenes }) {
  const [sortCol, setSortCol] = useState('fechaVencimiento')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState(null)

  const sorted = useMemo(() => {
    return sortOrdenes(ordenes, sortCol, sortAsc)
  }, [ordenes, sortCol, sortAsc])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (col) => {
    if (col === sortCol) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  // Reset page when ordenes change
  useMemo(() => setPage(0), [ordenes.length])

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortHeader label="N.Orden" col="id" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader label="Descripción" col="descripcion" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader label="Cliente" col="cliente" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader label="Cant." col="cantidad" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <SortHeader label="F. Entrega" col="fechaVencimiento" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <th className="py-2 px-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Op. Actual</th>
              <SortHeader label="Estado" col="estado" sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} />
              <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">Plano</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(orden => {
              const isExpanded = expandedId === orden.id
              const semaforo = getDemoSemaforo(orden.id)
              const badge = SEMAFORO_BADGE[semaforo]

              return (
                <React.Fragment key={orden.id}>
                  <tr
                    onClick={() => toggleExpand(orden.id)}
                    className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                      isExpanded ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-2 px-2 font-mono text-xs font-medium text-slate-700">
                      <span className="mr-1 text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                      {orden.id}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-700 max-w-[250px] truncate" title={orden.descripcion}>
                      {orden.descripcion}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-600 max-w-[150px] truncate" title={orden.clienteNombre}>
                      {orden.clienteNombre}
                    </td>
                    <td className="py-2 px-2 text-xs text-right text-gray-600">{orden.cantidad || '-'}</td>
                    <td className="py-2 px-2 text-xs text-gray-600 whitespace-nowrap">
                      {formatDate(orden.fechaVencimiento)}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-500 max-w-[150px] truncate" title={orden.currentOpDesc}>
                      {orden.currentOpNo ? `${orden.currentOpNo} - ${orden.currentOpDesc || ''}` : '-'}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {semaforo === 'green' ? 'OK' : semaforo === 'yellow' ? 'Alerta' : 'Retraso'}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {orden.blueprintsLink && orden.blueprintsLink.startsWith('http') ? (
                        <a
                          href={orden.blueprintsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-blue-500 hover:text-blue-700 text-xs underline"
                        >
                          Ver plano
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && <OrdenDetailRow orden={orden} />}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          <span>{sorted.length} órdenes total</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>Pág. {page + 1} de {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 rounded bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
