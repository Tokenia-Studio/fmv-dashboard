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
  const { movimientos, añoActual, años } = useData()
  const [vistaActiva, setVistaActiva] = useState('balance')
  const [mesHasta, setMesHasta] = useState(12)
  const [desglosePrint, setDesglosePrint] = useState('epigrafes')
  // Ejercicio(s) a imprimir: 'actual' | 'anterior' | 'ambos'
  const [ejerciciosPrint, setEjerciciosPrint] = useState('actual')
  // Columna comparativa del PyG con corte: 'periodo' (mismo periodo del año
  // anterior) o 'completo' (ejercicio anterior entero, enero–diciembre)
  const [comparativoPyG, setComparativoPyG] = useState('periodo')

  const añoAnterior = añoActual - 1
  const hayAñoAnterior = años.includes(añoAnterior)
  const imprimirActual = ejerciciosPrint !== 'anterior'
  // Etiquetas del selector: dejan claro el periodo de cada ejercicio
  const etiquetaActual = mesHasta < 12 ? `${añoActual} hasta ${MONTHS[mesHasta - 1].toLowerCase()}` : `${añoActual} completo`
  const etiquetaAnterior = `${añoAnterior} completo`
  const imprimirAnterior = hayAñoAnterior && ejerciciosPrint !== 'actual'

  // Por defecto: en el año en curso, hasta el último mes cerrado; en años pasados, cierre
  useEffect(() => {
    const hoy = new Date()
    setMesHasta(añoActual === hoy.getFullYear() ? Math.max(1, hoy.getMonth()) : 12)
    setEjerciciosPrint('actual')
    setComparativoPyG('periodo')
  }, [añoActual])

  // Recalcular CCAA con el corte elegido (el cálculo del contexto es a año completo)
  const cuentasAnualesCorte = useMemo(
    () => (movimientos.length > 0 ? calcularCuentasAnuales(movimientos, añoActual, mesHasta) : null),
    [movimientos, añoActual, mesHasta]
  )

  // Si se pide comparar con el ejercicio anterior completo, se sustituye el PyG
  // del año anterior por el de 12 meses (el Balance anterior ya es a cierre)
  const comparativoCompleto = mesHasta < 12 && comparativoPyG === 'completo'
  const cuentasAnuales = useMemo(() => {
    if (!cuentasAnualesCorte || !comparativoCompleto) return cuentasAnualesCorte
    const completo = calcularCuentasAnuales(movimientos, añoActual, 12)
    return {
      ...cuentasAnualesCorte,
      pyg: { ...cuentasAnualesCorte.pyg, [añoAnterior]: completo.pyg?.[añoAnterior] || {} },
    }
  }, [cuentasAnualesCorte, comparativoCompleto, movimientos, añoActual, añoAnterior])

  // Ejercicio anterior a cierre (12 meses), solo si se ha pedido imprimirlo
  const cuentasAnualesAnterior = useMemo(
    () => (imprimirAnterior && movimientos.length > 0 ? calcularCuentasAnuales(movimientos, añoAnterior, 12) : null),
    [movimientos, añoAnterior, imprimirAnterior]
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

            {/* Comparativo del PyG (solo con corte intermedio) */}
            {mesHasta < 12 && hayAñoAnterior && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">PyG comparado con:</span>
                <select
                  value={comparativoPyG}
                  onChange={e => setComparativoPyG(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fmv-500"
                >
                  <option value="periodo">enero–{MONTHS[mesHasta - 1].toLowerCase()} {añoAnterior}</option>
                  <option value="completo">{añoAnterior} completo</option>
                </select>
              </label>
            )}

            {/* Impresión */}
            <div className="flex items-center gap-2">
              <select
                value={ejerciciosPrint}
                onChange={e => setEjerciciosPrint(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fmv-500"
                title="Ejercicio(s) que se incluyen en el documento impreso"
              >
                <option value="actual">Imprimir {etiquetaActual}</option>
                {hayAñoAnterior && <option value="anterior">Imprimir {etiquetaAnterior}</option>}
                {hayAñoAnterior && <option value="ambos">Imprimir {etiquetaActual} + {etiquetaAnterior}</option>}
              </select>
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
            PyG enero–{MONTHS[mesHasta - 1].toLowerCase()} {añoActual} contra {comparativoCompleto ? `${añoAnterior} completo` : 'el mismo periodo del año anterior'}
          </div>
        )}

        {/* Tabla activa */}
        {vistaActiva === 'balance'
          ? <TablaBalanceCCAA cuentasAnuales={cuentasAnuales} mesHasta={mesHasta} />
          : <TablaPyGCCAA cuentasAnuales={cuentasAnuales} mesHasta={mesHasta} comparativoCompleto={comparativoCompleto} />
        }
      </div>

      {/* Documento(s) de impresión (solo visibles en print). El ejercicio
          anterior se imprime siempre a cierre, con su propio comparativo */}
      {imprimirActual && (
        <ImpresionCCAA
          cuentasAnuales={cuentasAnuales}
          año={añoActual}
          mesHasta={mesHasta}
          conDesglose={desglosePrint === 'detalle'}
          comparativoCompleto={comparativoCompleto}
        />
      )}
      {imprimirAnterior && cuentasAnualesAnterior && (
        <ImpresionCCAA
          cuentasAnuales={cuentasAnualesAnterior}
          año={añoAnterior}
          mesHasta={12}
          conDesglose={desglosePrint === 'detalle'}
          saltoPagina={imprimirActual}
        />
      )}
    </>
  )
}
