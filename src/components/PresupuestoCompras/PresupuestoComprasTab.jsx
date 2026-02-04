// ============================================
// PRESUPUESTO COMPRAS TAB - Contenedor principal
// ============================================

import React, { useState, useRef } from 'react'
import { useData } from '../../context/DataContext'
import TablaPresupuestoCompras from './TablaPresupuestoCompras'
import ConfigMapeo from './ConfigMapeo'

export default function PresupuestoComprasTab() {
  const { movimientos, presupuestos, añoActual, planCuentas, cargarPlanCuentas } = useData()
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [cargandoPlan, setCargandoPlan] = useState(false)
  const [mensajePlan, setMensajePlan] = useState(null)
  const fileInputRef = useRef(null)

  const tieneDatos = movimientos.length > 0
  const numCuentasPlan = Object.keys(planCuentas).length

  const handleCargarPlanCuentas = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCargandoPlan(true)
    setMensajePlan(null)

    const result = await cargarPlanCuentas(file)

    if (result.success) {
      setMensajePlan({ tipo: 'success', texto: `Plan de cuentas cargado: ${result.count} cuentas` })
    } else {
      setMensajePlan({ tipo: 'error', texto: result.error })
    }

    setCargandoPlan(false)
    e.target.value = ''
  }

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

      <div className="flex justify-between items-center">
        {/* Plan de cuentas */}
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCargarPlanCuentas}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={cargandoPlan}
            className="px-3 py-1.5 text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>&#128203;</span>
            {cargandoPlan ? 'Cargando...' : 'Cargar Plan de Cuentas'}
          </button>
          {numCuentasPlan > 0 && (
            <span className="text-xs text-gray-500">
              {numCuentasPlan} cuentas cargadas
            </span>
          )}
          {mensajePlan && (
            <span className={`text-xs ${mensajePlan.tipo === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {mensajePlan.texto}
            </span>
          )}
        </div>

        {/* Configurar mapeo */}
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
