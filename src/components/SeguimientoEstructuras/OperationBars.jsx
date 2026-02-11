import React from 'react'
import { calcDesv, getSemaforo } from '../../utils/produccionCalculations'

const SEMAFORO_COLORS = {
  green: { bar: 'bg-green-500', text: 'text-green-700' },
  yellow: { bar: 'bg-yellow-500', text: 'text-yellow-700' },
  red: { bar: 'bg-red-500', text: 'text-red-700' },
  gray: { bar: 'bg-gray-400', text: 'text-gray-500' }
}

export default function OperationBars({ ops, title }) {
  if (!ops || ops.length === 0) return null

  // Find max value for scaling
  const maxVal = Math.max(
    ...ops.map(o => Math.max(o.r || 0, o.t || 0)),
    1
  )

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="space-y-2">
        {ops.map(op => {
          const desv = calcDesv(op.r, op.t)
          const sem = getSemaforo(desv)
          const colors = SEMAFORO_COLORS[sem]
          const realPct = ((op.r || 0) / maxVal) * 100
          const teoPct = ((op.t || 0) / maxVal) * 100

          return (
            <div key={op.n} className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-600 w-20">{op.n}</span>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>Real: <strong className={colors.text}>{op.r != null ? op.r.toFixed(1) : '-'}h</strong></span>
                  <span>Teo: <strong>{op.t != null ? op.t.toFixed(1) : '-'}h</strong></span>
                  {desv != null && (
                    <span className={`font-semibold ${colors.text}`}>
                      {desv > 0 ? '+' : ''}{desv.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-4 bg-gray-100 rounded overflow-hidden">
                {/* Theoretical bar (background) */}
                {op.t != null && (
                  <div
                    className="absolute h-full bg-gray-300 rounded opacity-60"
                    style={{ width: `${teoPct}%` }}
                  />
                )}
                {/* Real bar (foreground) */}
                {op.r != null && (
                  <div
                    className={`absolute h-full rounded ${colors.bar} opacity-80`}
                    style={{ width: `${realPct}%` }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
