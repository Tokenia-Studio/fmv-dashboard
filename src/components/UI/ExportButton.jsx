// ============================================
// EXPORT BUTTON - Botón de exportación
// ============================================

import React from 'react'
import { Download } from 'lucide-react'

export default function ExportButton({ onClick, label = 'Exportar', icon: Icon = Download, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                  bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200
                  transition-colors ${className}`}
    >
      <Icon size={15} />
      <span>{label}</span>
    </button>
  )
}
