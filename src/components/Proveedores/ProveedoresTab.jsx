// ============================================
// PROVEEDORES TAB - Pestaña Pagos Proveedores
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import KPICard from '../UI/KPICard'
import TopProveedores from './TopProveedores'
import EvolucionPagos from './EvolucionPagos'
import { formatCurrency } from '../../utils/formatters'

export default function ProveedoresTab() {
  const { pagosProveedores, añoActual } = useData()
  const { top15, totalPagos, datosMensuales } = pagosProveedores

  // Pagos del mes actual
  const mesActual = datosMensuales[new Date().getMonth()]?.pagos || 0

  // Número de proveedores con pagos
  const numProveedores = top15.length

  if (top15.length === 0 && totalPagos === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin datos de Gasto por Proveedor</h2>
        <p className="text-gray-500">No se encontraron movimientos de gasto en cuentas 60x/62x</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          titulo="Gasto YTD"
          valor={totalPagos}
          icono="💳"
          colorValor="text-blue-600"
        />
        <KPICard
          titulo="Gasto Mes Actual"
          valor={mesActual}
          icono="📅"
          colorValor="text-gray-700"
        />
        <KPICard
          titulo="Nº Proveedores"
          valor={numProveedores}
          formato="number"
          icono="👥"
          colorValor="text-purple-600"
        />
        <KPICard
          titulo="Gasto Medio/Prov."
          valor={numProveedores > 0 ? totalPagos / numProveedores : 0}
          icono="📊"
          colorValor="text-gray-700"
        />
      </div>

      {/* Evolución de pagos */}
      <EvolucionPagos datos={datosMensuales} año={añoActual} />

      {/* Top 15 proveedores */}
      <TopProveedores datos={top15} totalPagos={totalPagos} año={añoActual} />
    </div>
  )
}
