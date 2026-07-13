// ============================================
// PRESUPUESTO TAB - Pestaña Presupuesto vs Real
// Sub-pestañas: PyG | Inversiones (CAPEX)
// ============================================

import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import TablaPresupuesto from './TablaPresupuesto'
import TablaPresupuestoInversiones from './TablaPresupuestoInversiones'
import CargaPresupuesto from './CargaPresupuesto'

export default function PresupuestoTab() {
  const { presupuestos, añoActual, pyg3Digitos } = useData()
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
  const [mostrarCarga, setMostrarCarga] = useState(false)
  const [subTab, setSubTab] = useState('pyg') // 'pyg' | 'inversiones'

  const tienePresupuesto = presupuestos && presupuestos.length > 0
  const tieneDatos = pyg3Digitos && Object.keys(pyg3Digitos).length > 0

  // Si no hay datos contables, mostrar mensaje
  if (!tieneDatos) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <CargaPresupuesto />
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos contables</h2>
          <p className="text-gray-500">Carga un diario contable primero para ver el presupuesto vs real</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 animate-fadeIn">
      {/* Sub-pestañas + info de carga */}
      <div className="flex items-center justify-between px-1 flex-wrap gap-2">
        <div className="flex gap-1">
          {[
            { id: 'pyg', label: '📊 PyG' },
            { id: 'inversiones', label: '🏗️ Inversiones (CAPEX)' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
                subTab === t.id
                  ? 'bg-brand-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {tienePresupuesto ? `Ppto cargado: ${presupuestos.length} lineas (${añoActual})` : `Sin presupuesto para ${añoActual}`}
          </span>
          <button
            onClick={() => setMostrarCarga(!mostrarCarga)}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 transition-colors"
          >
            {mostrarCarga ? 'Ocultar' : tienePresupuesto ? 'Recargar presupuesto' : 'Cargar presupuesto'}
          </button>
        </div>
      </div>
      {mostrarCarga && <CargaPresupuesto />}

      {subTab === 'pyg' ? (
        tienePresupuesto ? (
          <TablaPresupuesto
            mesSeleccionado={mesSeleccionado}
            onMesChange={setMesSeleccionado}
            año={añoActual}
          />
        ) : (
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Sin presupuesto cargado para {añoActual}
            </h3>
            <p className="text-gray-500">
              Selecciona el año y carga un archivo Excel con el presupuesto
            </p>
          </div>
        )
      ) : (
        // Inversiones: se muestra aunque no haya presupuesto cargado
        // (el real de grupo 2 ya cuenta la película del CAPEX)
        <TablaPresupuestoInversiones
          mesSeleccionado={mesSeleccionado}
          onMesChange={setMesSeleccionado}
          año={añoActual}
        />
      )}
    </div>
  )
}
