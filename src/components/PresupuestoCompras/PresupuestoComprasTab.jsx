// ============================================
// PRESUPUESTO COMPRAS TAB - Contenedor principal
// ============================================

import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import TablaPresupuestoCompras from './TablaPresupuestoCompras'
import ConfigMapeo from './ConfigMapeo'

export default function PresupuestoComprasTab() {
  const { movimientos, presupuestos, añoActual } = useData()
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
  const [mostrarConfig, setMostrarConfig] = useState(false)

  const tieneDatos = movimientos.length > 0

  if (!tieneDatos) {
    return (
      <div className="card p-8 text-center">
        <p className="text-4xl mb-4">&#128230;</p>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin datos contables</h3>
        <p className="text-gray-500">Carga primero el diario contable en la pestaña Cargar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {mostrarConfig && (
        <ConfigMapeo onClose={() => setMostrarConfig(false)} />
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setMostrarConfig(!mostrarConfig)}
          className="px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 rounded-lg flex items-center gap-1.5"
        >
          <span>&#9881;</span>
          Configurar mapeo
        </button>
      </div>

      <TablaPresupuestoCompras
        mesSeleccionado={mesSeleccionado}
        onMesChange={setMesSeleccionado}
        año={añoActual}
      />
    </div>
  )
}
