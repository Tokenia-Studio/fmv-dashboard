// ============================================
// FOOTER - Pie del dashboard
// ============================================

import React from 'react'
import { BRAND } from '../../utils/constants'

export default function Footer() {
  return (
    <footer className="text-center py-4 text-xs text-gray-500 border-t border-gray-200 bg-white/50">
      <div className="flex items-center justify-center gap-3">
        <div className="w-5 h-5 bg-slate-800 rounded flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">{BRAND.name}</span>
        </div>
        <span>{BRAND.fullName} · Dashboard v2.0</span>
        <span className="text-gray-400">|</span>
        <span className="text-gray-400">Desarrollado por</span>
        <img src="/logo_tokenia_firma.png" alt="TOKENIA Automation" className="h-5 opacity-60" />
      </div>
    </footer>
  )
}
