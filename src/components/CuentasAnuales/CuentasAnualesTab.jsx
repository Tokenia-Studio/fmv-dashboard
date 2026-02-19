// ============================================
// CUENTAS ANUALES TAB - Balance + PyG oficial PGC
// ============================================

import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import TablaBalanceCCAA from './TablaBalanceCCAA'
import TablaPyGCCAA from './TablaPyGCCAA'

export default function CuentasAnualesTab() {
  const { movimientos } = useData()
  const [vistaActiva, setVistaActiva] = useState('balance')

  if (movimientos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-5xl mb-4">📑</p>
        <p className="text-lg font-medium">No hay datos cargados</p>
        <p className="text-sm">Carga un diario contable para ver las Cuentas Anuales</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Toggle Balance / PyG */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setVistaActiva('balance')}
          className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${
            vistaActiva === 'balance'
              ? 'bg-white text-blue-700 shadow-md'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Balance de Situacion
        </button>
        <button
          onClick={() => setVistaActiva('pyg')}
          className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${
            vistaActiva === 'pyg'
              ? 'bg-white text-blue-700 shadow-md'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Cuenta de PyG
        </button>
      </div>

      {/* Tabla activa */}
      {vistaActiva === 'balance'
        ? <TablaBalanceCCAA />
        : <TablaPyGCCAA />
      }
    </div>
  )
}
