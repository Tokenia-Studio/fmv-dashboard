// ============================================
// CONTRATOS - Calendario generado (US-008)
// ============================================
// Nadie introduce datos aquí: sale de contratos, obligaciones e hitos.

import React, { useMemo } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { calendario, nombreMes } from '../../utils/contratosVista'
import { Badge, eur } from './ui'

const dd = (n) => String(n).padStart(2, '0')

export default function Calendario() {
  const { modelo, vista, abrir } = useContratos()
  const cal = useMemo(() => calendario(modelo, vista), [modelo, vista])

  const Evento = ({ e }) => (
    <button onClick={() => abrir(e.enlace.tipo, e.enlace.id)} className="w-full text-left flex gap-2 px-3 py-1.5 text-sm hover:bg-slate-50 border-t border-gray-100">
      <span className="w-12 shrink-0 text-xs text-gray-500 pt-0.5">{e.fecha?.p === 'dia' ? `${dd(e.fecha.d.getDate())}/${dd(e.fecha.d.getMonth() + 1)}` : e.fecha ? 'mes' : ''}</span>
      <span className="min-w-0">
        {e.aviso && <><Badge color="ambar">Aviso</Badge> </>}
        {e.tipo === 'Hito' && <><Badge color="azul">Hito</Badge> </>}
        {e.titulo}
        <span className="block text-xs text-gray-500">{[e.sec, e.importe != null ? eur(e.importe) : null].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  )

  const Lista = ({ eventos }) => {
    const sueltos = eventos.filter((e) => !e.agrupar)
    const grupos = {}
    eventos.filter((e) => e.agrupar).forEach((e) => (grupos[e.agrupar] = grupos[e.agrupar] || []).push(e))
    return (
      <>
        {Object.entries(grupos).map(([g, l]) => (
          <details key={g} className="border-t border-gray-100">
            <summary className="cursor-pointer px-3 py-1.5 text-sm font-medium text-fmv-800">{g}: {l.length} equipos</summary>
            {l.map((e) => <Evento key={e.clave} e={e} />)}
          </details>
        ))}
        {sueltos.map((e) => <Evento key={e.clave} e={e} />)}
      </>
    )
  }

  const Caja = ({ titulo, eventos, estilo = '' }) => (
    <div className={`card overflow-hidden ${estilo}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 text-sm font-semibold text-slate-700 first-letter:uppercase">
        <span>{titulo}</span>
        <span className="text-xs text-gray-500">{eventos.length}</span>
      </div>
      {eventos.length ? <Lista eventos={eventos} /> : <div className="px-3 py-2 text-sm text-gray-400 border-t border-gray-100">Nada previsto</div>}
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Se genera a partir de la periodicidad, la última realizada y el preaviso. La fecha límite de aviso de un contrato aparece como evento propio, distinto del vencimiento.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cal.atrasados.length > 0 && <Caja titulo={vista === 'compras_fabrica' ? 'Fuera de plazo' : 'Vencido sin cerrar'} eventos={cal.atrasados} estilo="ring-2 ring-red-200" />}
        {cal.meses.map((m, i) => (
          <Caja key={m.inicio.toISOString()} titulo={nombreMes(m.inicio)} eventos={m.eventos} estilo={i === 0 ? 'ring-2 ring-fmv-200' : ''} />
        ))}
        {cal.sinFecha.length > 0 && <Caja titulo="Sin fecha fijada" eventos={cal.sinFecha} />}
      </div>
    </div>
  )
}
