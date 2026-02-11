import React from 'react'

const SEMAFORO_CONFIG = {
  green: { label: 'OK', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  yellow: { label: 'ALERTA', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  red: { label: 'FUERA', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  gray: { label: 'S/D', bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }
}

export default function SemaforoBadge({ semaforo, size = 'sm' }) {
  const config = SEMAFORO_CONFIG[semaforo] || SEMAFORO_CONFIG.gray
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
