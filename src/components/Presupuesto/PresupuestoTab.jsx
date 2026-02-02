// ============================================
// PRESUPUESTO TAB - Pestaña Presupuesto vs Real
// ============================================

import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import TablaPresupuesto from './TablaPresupuesto'
import CargaPresupuesto from './CargaPresupuesto'
import { formatCurrency } from '../../utils/formatters'

export default function PresupuestoTab() {
  const { presupuestos, añoActual, pyg3Digitos } = useData()
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)

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
    <div className="space-y-6 animate-fadeIn">
      {/* Carga de presupuesto */}
      <CargaPresupuesto />

      {/* Tabla de presupuesto vs real */}
      {tienePresupuesto ? (
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
      )}
    </div>
  )
}
