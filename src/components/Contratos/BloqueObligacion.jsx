// ============================================
// CONTRATOS - Una obligación con su historial y sus acciones (US-003, US-004)
// ============================================

import React, { useState } from 'react'
import { ClipboardCheck, Pencil, Upload, Undo2 } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { textoFecha } from '../../utils/contratosVista'
import { Badge, Pendiente, Boton, BotonPdf, eur, fechaFila, EST_OBLIGACION } from './ui'
import FormRealizada from './FormRealizada'
import FormObligacion from './FormObligacion'
import FormDocumento from './FormDocumento'

export default function BloqueObligacion({ o, conSujeto = false, editable = true }) {
  const { modelo, recargar, abrir } = useContratos()
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)
  const [anulando, setAnulando] = useState(null)
  const [color, texto] = EST_OBLIGACION[o.calc.estado]

  const anular = async (r) => {
    setError(null)
    setAnulando(null)
    try {
      await contratosDb.anularRealizada(r.id)
      await recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const grupo = o.grupo_id ? modelo.grupo(o.grupo_id) : null
  const nombreUnidad = (id) => grupo?.unidades.find((u) => u.id === id)?.nombre || `equipo ${id}`

  return (
    <div className={`rounded-lg border p-3 ${o.viva ? 'border-gray-200' : 'border-dashed border-gray-300 bg-gray-50 opacity-80'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-800">{o.tipo} · {o.etiqueta}</div>
          {conSujeto && (
            <button className="text-sm text-fmv-700 hover:underline" onClick={() => abrir(o.sujeto.tipo, o.sujeto.id)}>{o.sujeto.nombre}</button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!o.viva && <Badge>{o.activa === false ? 'Desactivada' : 'Equipo de baja'}</Badge>}
          {o.noAptoEquipo && <Badge color="rojo">No apto</Badge>}
          {o.noAptoUnidades.length > 0 && <Badge color="rojo">{o.noAptoUnidades.length} no apta{o.noAptoUnidades.length > 1 ? 's' : ''}</Badge>}
          {o.viva && <Badge color={color}>{texto}</Badge>}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
        <div><div className="text-[11px] uppercase text-gray-500">Proveedor</div>{o.proveedor_nombre || <Pendiente />}</div>
        <div><div className="text-[11px] uppercase text-gray-500">Periodicidad</div>{o.periodicidad_meses ? `Cada ${o.periodicidad_meses} meses` : o.mes_habitual ? `Cada año en el mes ${o.mes_habitual}` : <Pendiente>Por definir</Pendiente>}</div>
        <div><div className="text-[11px] uppercase text-gray-500">Última realizada</div>{o.calc.ultima ? textoFecha(o.calc.ultima) : <Pendiente>No consta</Pendiente>}{!o.ultimaRealizada && o.primera_fecha && <span className="block text-xs text-gray-500">Dato de partida, sin registro en la app</span>}</div>
        <div><div className="text-[11px] uppercase text-gray-500">Próxima (calculada)</div>{o.calc.proxima ? <><strong>{textoFecha(o.calc.proxima)}</strong><span className="block text-xs text-gray-500">{o.calc.como}</span></> : <Pendiente>Sin fecha: genera tarea</Pendiente>}</div>
        <div><div className="text-[11px] uppercase text-gray-500">Precio · pedido</div>{o.precio != null ? eur(o.precio) : <Pendiente />}{o.pedido_pcp && <span className="block text-xs text-gray-500">PCP {o.pedido_pcp}</span>}</div>
      </div>

      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <div className={`rounded border-l-4 px-3 py-2 ${o.origen.ok ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
          <div className="text-[11px] uppercase text-gray-500">Documento de origen · fija condiciones</div>
          {o.origen.texto}
        </div>
        <div className={`rounded border-l-4 px-3 py-2 ${o.calc.cierreOk ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
          <div className="text-[11px] uppercase text-gray-500">Documento de cierre · prueba que se hizo</div>
          {o.ultimaRealizada?.documento ? <BotonPdf doc={o.ultimaRealizada.documento} /> : o.calc.cierreTexto}
        </div>
      </div>

      {o.docs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {o.docs.map((d) => <BotonPdf key={d.id} doc={d} />)}
        </div>
      )}

      {o.realizadas.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-gray-600">Historial registrado en la app ({o.realizadas.length})</summary>
          <ul className="mt-1 space-y-1">
            {o.realizadas.map((r) => (
              <li key={r.id} className={`flex flex-wrap items-center gap-2 ${r.anulada ? 'line-through text-gray-400' : ''}`}>
                <span className="font-medium">{fechaFila(r.fecha, 'dia')}</span>
                {r.resultado && <Badge color={r.resultado === 'no apto' ? 'rojo' : r.resultado === 'apto' ? 'verde' : 'gris'}>{r.resultado}</Badge>}
                {r.documento ? <BotonPdf doc={r.documento} /> : <span className="text-amber-700">sin documento de cierre</span>}
                {r.unidades.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {r.unidades.filter((u) => u.resultado === 'no apto').length} de {r.unidades.length} no aptas
                    {r.unidades.some((u) => u.resultado === 'no apto') && `: ${r.unidades.filter((u) => u.resultado === 'no apto').map((u) => nombreUnidad(u.equipo_id)).join(', ')}`}
                  </span>
                )}
                {r.nota && <span className="text-xs text-gray-500">· {r.nota}</span>}
                {r.anulada && <span className="text-xs">(anulada)</span>}
                {editable && !r.anulada && anulando !== r.id && (
                  <button className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-0.5" onClick={() => setAnulando(r.id)} title="Anular un registro erróneo">
                    <Undo2 size={12} /> anular
                  </button>
                )}
                {anulando === r.id && (
                  <span className="text-xs text-red-700">
                    Queda en el historial como anulada y la próxima fecha se recalcula.{' '}
                    <button className="font-semibold underline" onClick={() => anular(r)}>Anular</button>{' '}
                    <button className="underline text-gray-600" onClick={() => setAnulando(null)}>No</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {editable && (
        <div className="mt-3 flex flex-wrap gap-2">
          {o.viva && <Boton onClick={() => setForm('realizada')}><ClipboardCheck size={14} /> Registrar realizada</Boton>}
          <Boton variante="secundario" onClick={() => setForm('editar')}><Pencil size={14} /> Editar</Boton>
          <Boton variante="secundario" onClick={() => setForm('documento')}><Upload size={14} /> Subir documento</Boton>
        </div>
      )}

      {form === 'realizada' && <FormRealizada obligaciones={[o]} onClose={() => setForm(null)} />}
      {form === 'editar' && <FormObligacion obligacion={o} onClose={() => setForm(null)} />}
      {form === 'documento' && <FormDocumento destino={{ obligacion: o }} onClose={() => setForm(null)} />}
    </div>
  )
}
