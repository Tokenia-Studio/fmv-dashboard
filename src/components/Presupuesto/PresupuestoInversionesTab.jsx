// ============================================
// PRESUPUESTO INVERSIONES TAB - Pestaña independiente (rol compras)
// Reutiliza TablaPresupuestoInversiones, la misma vista que la
// sub-pestaña "Inversiones (CAPEX)" de Presupuesto vs Real (direccion)
// ============================================

import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import TablaPresupuestoInversiones from './TablaPresupuestoInversiones'

export default function PresupuestoInversionesTab() {
  const { añoActual } = useData()
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1)

  return (
    <div className="space-y-2 animate-fadeIn">
      <TablaPresupuestoInversiones
        mesSeleccionado={mesSeleccionado}
        onMesChange={setMesSeleccionado}
        año={añoActual}
      />
    </div>
  )
}
