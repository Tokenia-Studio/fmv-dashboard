// ============================================
// DOCUMENT TABLE - Tabla de documentos de un lote
// ============================================

import React from 'react'

const TIPO_ICON = {
  factura: '🧾',
  albaran: '📋',
  desconocido: '❓'
}

const ESTADO_BADGE = {
  ok: { label: 'OK', color: 'bg-green-100 text-green-700' },
  revisar: { label: 'Revisar', color: 'bg-amber-100 text-amber-700' },
  corregido: { label: 'Corregido', color: 'bg-blue-100 text-blue-700' },
  archivado: { label: 'Archivado', color: 'bg-gray-100 text-gray-600' }
}

export default function DocumentTable({ documents, selectedDocId, onSelectDoc }) {
  if (!documents.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-400">Sin documentos en este lote</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">Documentos ({documents.length})</h3>
      </div>

      <div className="overflow-y-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">#</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Proveedor</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nº Factura</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Conf.</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {documents.map((doc, idx) => {
              const badge = ESTADO_BADGE[doc.estado] || ESTADO_BADGE.ok
              const isSelected = doc.id === selectedDocId
              const confianza = Math.round((doc.confianza || 0) * 100)

              return (
                <tr
                  key={doc.id}
                  onClick={() => onSelectDoc(doc)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-l-2 border-l-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      {TIPO_ICON[doc.tipo] || '❓'}
                      <span className="capitalize">{doc.tipo}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {doc.proveedor_nombre || <span className="text-gray-400 italic">no detectado</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {doc.numero_factura || doc.numero_albaran || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-mono ${
                      confianza >= 80 ? 'text-green-600' :
                      confianza >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {confianza}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
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
