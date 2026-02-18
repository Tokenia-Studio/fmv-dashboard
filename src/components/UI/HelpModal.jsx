// ============================================
// HELP MODAL - Modal de ayuda por pestaña
// ============================================

import React from 'react'
import { HELP_CONTENT } from '../../utils/helpContent'

export default function HelpModal({ tabActiva, onClose }) {
  const help = HELP_CONTENT[tabActiva]

  if (!help) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{help.titulo}</h2>
            <p className="text-sm text-slate-500 mt-1">{help.descripcion}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 ml-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content sections */}
        <div className="p-6 space-y-6">
          {help.secciones.map((seccion, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                {seccion.titulo}
              </h3>

              {seccion.contenido && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {seccion.contenido}
                </p>
              )}

              {seccion.tabla && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        {seccion.tabla.cabeceras.map((cab, i) => (
                          <th key={i} className="text-left px-3 py-2 bg-slate-50 text-slate-600 font-medium border border-slate-200">
                            {cab}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {seccion.tabla.filas.map((fila, i) => (
                        <tr key={i}>
                          {fila.map((celda, j) => (
                            <td key={j} className="px-3 py-2 text-slate-600 border border-slate-200">
                              {celda}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-slate-400 text-center">
            Pulse fuera del modal o el botón × para cerrar
          </p>
        </div>
      </div>
    </div>
  )
}
