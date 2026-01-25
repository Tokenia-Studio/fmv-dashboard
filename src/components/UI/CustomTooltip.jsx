// ============================================
// CUSTOM TOOLTIP - Tooltip para gráficos Recharts
// ============================================

import React from 'react'
import { formatCurrency, mesKeyToNombre } from '../../utils/formatters'

export default function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="custom-tooltip">
      <p className="font-semibold text-gray-800 mb-2">
        {mesKeyToNombre(label) || label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-medium" style={{ color: entry.color }}>
              {formatter ? formatter(entry.value) : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
      {payload.length > 1 && (
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Total</span>
          <span className="font-bold text-gray-800">
            {formatCurrency(payload.reduce((sum, p) => sum + (p.value || 0), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
