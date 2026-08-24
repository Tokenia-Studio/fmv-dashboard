// ============================================
// CUENTAS ANUALES TAB - Balance + PyG oficial PGC
// Con corte intermedio por mes e impresión en formato oficial
// ============================================

import React, { useState, useEffect, useMemo } from 'react'
import { BookOpen, Printer } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { MONTHS } from '../../utils/constants'
import { calcularCuentasAnuales } from '../../utils/calculations'
import TablaBalanceCCAA from './TablaBalanceCCAA'
import TablaPyGCCAA from './TablaPyGCCAA'
import ImpresionCCAA from './ImpresionCCAA'

export default function CuentasAnualesTab() {
  const { movimientos, añoActual } = useData()
  const [vistaActiva, setVistaActiva] = useState('balance')
  const [mesHasta, setMesHasta] = useState(12)
  const [desglosePrint, setDesglosePrint] = useState('epigrafes')

  // Por defecto: en el año en curso, hasta el último mes cerrado; en años pasados, cierre
  useEffect(() => {
    const hoy = new Date()
    setMesHasta(añoActual === hoy.getFullYear() ? Math.max(1, hoy.getMonth()) : 12)
  }, [añoActual])

  // Recalcular CCAA con el corte elegido (el cálculo del contexto es a año completo)
  const cuentasAnuales = useMemo(
    () => (movimientos.length > 0 ? calcularCuentasAnuales(movimientos, añoActual, mesHasta) : null),
    [movimientos, añoActual, mesHasta]
  )

  if (movimientos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <BookOpen size={56} className="mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-medium">No hay datos cargados</p>
        <p className="text-sm">Carga un diario contable para ver las Cuentas Anuales</p>
      </div>
    )
  }

  return (
    <>
      {/* Contenido de pantalla (oculto al imprimir; imprime ImpresionCCAA) */}
      <div className="animate-fadeIn space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Toggle Balance / PyG */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setVistaActiva('balance')}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${
                vistaActiva === 'balance'
                  ? 'bg-white text-fmv-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Balance de Situacion
            </button>
            <button
              onClick={() => setVistaActiva('pyg')}
              className={`px-5 py-2.5 rounded-md text-sm font-semibold transition-all ${
                vistaActiva === 'pyg'
                  ? 'bg-white text-fmv-700 shadow-md'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Cuenta de PyG
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Corte por mes */}
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Cuentas hasta:</span>
              <select
                value={mesHasta}
                onChange={e => setMesHasta(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fmv-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}{i === 11 ? ' (cierre)' : ''}</option>
                ))}
              </select>
            </label>

            {/* Impresión */}
            <div className="flex items-center gap-2">
              <select
                value={desglosePrint}
                onChange={e => setDesglosePrint(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fmv-500"
                title="Nivel de detalle del documento impreso"
              >
                <option value="epigrafes">Solo epígrafes</option>
                <option value="detalle">Con desglose</option>
              </select>
              <button
                onClick={() => window.print()}
                className="btn-primary flex items-center gap-1.5 !py-1.5 text-sm"
              >
                <Printer size={15} />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>

        {mesHasta < 12 && (
          <div className="text-xs px-3 py-2 rounded-lg bg-fmv-100 text-fmv-700 border border-fmv-200 w-fit">
            Corte a {MONTHS[mesHasta - 1].toLowerCase()}: Balance del año contra cierre {añoActual - 1};
            PyG enero–{MONTHS[mesHasta - 1].toLowerCase()} de ambos ejercicios
          </div>
        )}

        {/* Tabla activa */}
        {vistaActiva === 'balance'
          ? <TablaBalanceCCAA cuentasAnuales={cuentasAnuales} mesHasta={mesHasta} />
          : <TablaPyGCCAA cuentasAnuales={cuentasAnuales} mesHasta={mesHasta} />
        }
      </div>

      {/* Documento de impresión (solo visible en print) */}
      <ImpresionCCAA
        cuentasAnuales={cuentasAnuales}
        año={añoActual}
        mesHasta={mesHasta}
        conDesglose={desglosePrint === 'detalle'}
      />
    </>
  )
}
