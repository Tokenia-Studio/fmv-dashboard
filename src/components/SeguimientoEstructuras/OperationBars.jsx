import React from 'react'
import { calcDesv, getSemaforo } from '../../utils/produccionCalculations'

export default function OperationBars({ ops, title }) {
  if (!ops || ops.length === 0) return null

  // Max value for scaling bars
  const maxVal = Math.max(...ops.map(o => Math.max(o.r || 0, o.t || 0)), 1)

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      <div className="space-y-4">
        {ops.map(op => {
          const desv = calcDesv(op.r, op.t)
          const sem = getSemaforo(desv)
          const desvColor = sem === 'green' ? 'text-green-600' : sem === 'yellow' ? 'text-yellow-600' : sem === 'red' ? 'text-red-600' : 'text-gray-400'
          const barColor = sem === 'green' ? 'bg-green-500' : sem === 'yellow' ? 'bg-yellow-500' : sem === 'red' ? 'bg-red-500' : 'bg-gray-400'
          const realPct = ((op.r || 0) / maxVal) * 100
          const teoPct = ((op.t || 0) / maxVal) * 100

          return (
            <div key={op.n}>
              {/* Operation name + values */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700 w-24">{op.n}</span>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{op.r != null ? `${op.r.toFixed(1)} h` : '-'} vs {op.t != null ? `${op.t.toFixed(1)} h` : '-'}</span>
                  {desv != null && (
                    <span className={`font-bold ${desvColor} w-16 text-right`}>
                      {desv > 0 ? '+' : ''}{desv.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              {/* Real bar */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-gray-400 w-8">Real</span>
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className={`h-full ${barColor} rounded flex items-center`}
                    style={{ width: `${Math.max(realPct, 0.5)}%` }}
                  >
                    {op.r != null && realPct > 8 && (
                      <span className="text-[10px] text-white font-bold pl-2">{op.r.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Teo bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-8">Teo</span>
                <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
                  <div
                    className="h-full bg-gray-400 rounded flex items-center"
                    style={{ width: `${Math.max(teoPct, 0.5)}%` }}
                  >
                    {op.t != null && teoPct > 8 && (
                      <span className="text-[10px] text-white font-bold pl-2">{op.t.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
