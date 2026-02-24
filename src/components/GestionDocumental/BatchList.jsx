// ============================================
// BATCH LIST - Lista de lotes procesados
// ============================================

import React from 'react'

const ESTADO_BADGE = {
  procesando: { label: 'Procesando', color: 'bg-blue-100 text-blue-700' },
  pendiente_revision: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700' },
  archivado: { label: 'Archivado', color: 'bg-green-100 text-green-700' }
}

export default function BatchList({ batches, onSelectBatch }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Lotes escaneados</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Fichero</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Páginas</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Documentos</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Estado</th>
              <th className="text-left px-6 py-3 text-gray-500 font-medium">Fecha</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {batches.map(batch => {
              const badge = ESTADO_BADGE[batch.estado] || ESTADO_BADGE.procesando
              return (
                <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {batch.fichero_origen}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {batch.total_paginas || 0}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {batch.total_documentos || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    {formatDate(batch.created_at)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onSelectBatch(batch.id)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                    >
                      {batch.estado === 'pendiente_revision' ? 'Revisar' : 'Ver'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
