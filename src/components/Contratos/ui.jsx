// ============================================
// CONTRATOS - piezas visuales comunes del módulo
// ============================================

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { FileText, X } from 'lucide-react'
import { contratosDb } from '../../lib/contratosDb'
import { textoFecha } from '../../utils/contratosVista'
import { parseFecha } from '../../utils/contratosMotor'

export const EST_OBLIGACION = {
  fuera: ['rojo', 'Fuera de plazo'],
  proxima: ['ambar', 'Próximos 60 días'],
  ok: ['verde', 'En plazo'],
  sinfecha: ['gris', 'Sin fecha fijada'],
}
export const EST_CONTRATO = {
  vencido: ['rojo', 'Vencido sin cerrar'],
  avisar: ['rojo', 'Plazo de aviso abierto'],
  proximo: ['ambar', 'Decidir en 90 días'],
  ok: ['verde', 'En plazo'],
  sinvenc: ['gris', 'Sin vencimiento conocido'],
  historico: ['gris', 'Histórico'],
}
export const EST_DOCUMENTAL = { Vigente: 'verde', 'Por confirmar': 'ambar', Vencido: 'rojo', 'Sin contrato': 'rojo' }

const COLORES = {
  rojo: 'bg-red-50 text-red-700 border-red-200',
  ambar: 'bg-amber-50 text-amber-800 border-amber-200',
  verde: 'bg-green-50 text-green-700 border-green-200',
  azul: 'bg-fmv-100 text-fmv-800 border-fmv-200',
  gris: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function Badge({ color = 'gris', children, title }) {
  return (
    <span title={title} className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium ${COLORES[color] || COLORES.gris}`}>
      {children}
    </span>
  )
}

/** Dato que falta: se enseña como pendiente, nunca en blanco ni inventado. */
export function Pendiente({ children = 'Pendiente' }) {
  return <span className="italic text-amber-700">{children}</span>
}

export const valor = (v, textoPendiente) => (v == null || v === '' ? <Pendiente>{textoPendiente}</Pendiente> : v)

export const eur = (n) =>
  n == null || n === '' ? null : Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' }) + ' €'

/** Fecha de Supabase + precisión → texto («abril de 2027» si solo se conoce el mes). */
export function fechaFila(fecha, precision) {
  if (!fecha) return null
  const s = String(fecha).slice(0, 10)
  const t = precision === 'año' ? s.slice(0, 4) : precision === 'mes' ? s.slice(0, 7) : s
  return textoFecha(parseFecha(t))
}

export function Kpi({ etiqueta, valor: v, pie, color, onClick }) {
  const borde = { rojo: 'border-l-red-500', ambar: 'border-l-amber-500', verde: 'border-l-green-600', gris: 'border-l-gray-300' }[color] || 'border-l-fmv-600'
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={`kpi-card border-l-4 ${borde} text-left w-full ${onClick ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{etiqueta}</div>
      <div className="text-2xl font-bold text-slate-800 mt-1">{v}</div>
      {pie && <div className="text-xs text-gray-500 mt-1">{pie}</div>}
    </Comp>
  )
}

export function Tarjeta({ titulo, nota, acciones, children, className = '' }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="card-header flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white text-sm">{titulo}</h3>
        <div className="flex items-center gap-2">
          {nota && <span className="text-xs text-fmv-200">{nota}</span>}
          {acciones}
        </div>
      </div>
      {children}
    </div>
  )
}

export function Campo({ etiqueta, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{etiqueta}</div>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  )
}

export const Vacio = ({ children }) => <div className="px-4 py-6 text-center text-sm text-gray-400">{children}</div>

export function Aviso({ color = 'ambar', children }) {
  return <div className={`rounded-lg border px-4 py-3 text-sm ${COLORES[color]}`}>{children}</div>
}

/** Tabla con cabecera del Dashboard y filas clicables. */
export function Tabla({ columnas, children, max }) {
  return (
    <div className="overflow-x-auto" style={max ? { maxHeight: max, overflowY: 'auto' } : undefined}>
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            {columnas.map((c, i) => (
              <th key={i} className={`px-3 py-2 text-left text-xs ${c.num ? 'text-right' : ''}`}>{c.t ?? c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Fila({ onClick, children, className = '' }) {
  return (
    <tr onClick={onClick} className={`table-row ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </tr>
  )
}

export const Td = ({ children, num, className = '', ...rest }) => (
  <td className={`px-3 py-2 align-top ${num ? 'text-right tabular-nums whitespace-nowrap' : ''} ${className}`} {...rest}>
    {children}
  </td>
)

export const Sec = ({ children }) => (children ? <span className="block text-xs text-gray-500">{children}</span> : null)

export function Boton({ children, variante = 'primario', className = '', ...rest }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const v = {
    primario: 'bg-fmv-800 text-white hover:bg-fmv-700',
    secundario: 'bg-white text-slate-700 border border-gray-300 hover:bg-gray-50',
    claro: 'bg-white/10 text-white hover:bg-white/20',
    peligro: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  }[variante]
  return (
    <button type="button" className={`${base} ${v} ${className}`} {...rest}>
      {children}
    </button>
  )
}

/** Abre el PDF con un enlace firmado de 60 s (bucket privado). */
export function BotonPdf({ doc, texto }) {
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState(null)
  const abrir = async (e) => {
    e.stopPropagation()
    setAbriendo(true)
    setError(null)
    // La ventana se abre antes de la espera para que el navegador no la bloquee
    const ventana = window.open('', '_blank')
    try {
      const url = await contratosDb.urlDocumento(doc.ruta)
      if (ventana) ventana.location.href = url
      else window.location.href = url
    } catch (err) {
      ventana?.close()
      setError(err.message)
    }
    setAbriendo(false)
  }
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={abrir} disabled={abriendo} className="inline-flex items-center gap-1 text-fmv-700 hover:underline text-left" title={doc.ruta}>
        <FileText size={14} className="shrink-0" />
        <span>{texto || doc.nombre_original}</span>
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  )
}

export function Modal({ titulo, onClose, children, ancho = 'max-w-2xl' }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className={`bg-white rounded-lg shadow-xl w-full ${ancho} my-8 overflow-hidden`}>
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white">{titulo}</h3>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── Formularios ─────────────────────────────────────────────────────────────

export function Etiqueta({ texto, children, ayuda, className = '' }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="block text-xs font-medium text-gray-600 mb-1">{texto}</span>
      {children}
      {ayuda && <span className="block text-xs text-gray-500 mt-1">{ayuda}</span>}
    </label>
  )
}

export const Entrada = (props) => <input className="input text-sm" {...props} value={props.value ?? ''} />

export function Selector({ opciones, vacio, value, ...rest }) {
  const lista = opciones.map((o) => (typeof o === 'string' ? { valor: o, etiqueta: o } : o))
  // Si el valor actual no está en la lista (dato del inventario), se conserva como opción
  const extra = value && !lista.some((o) => String(o.valor) === String(value)) ? [{ valor: value, etiqueta: value }] : []
  return (
    <select className="input text-sm" value={value ?? ''} {...rest}>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {[...extra, ...lista].map((o) => (
        <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
      ))}
    </select>
  )
}

/** Fecha con su precisión (día, mes o año), como la guarda la base de datos. */
export function EntradaFecha({ fecha, precision, onChange, max }) {
  const p = precision || 'dia'
  const s = fecha ? String(fecha).slice(0, 10) : ''
  const cambiar = (nuevoTexto, nuevaP) => {
    if (!nuevoTexto) return onChange(null, null)
    const f = nuevaP === 'año' ? `${nuevoTexto.slice(0, 4)}-01-01` : nuevaP === 'mes' ? `${nuevoTexto.slice(0, 7)}-01` : nuevoTexto
    onChange(f, nuevaP)
  }
  return (
    <div className="flex gap-2">
      {p === 'dia' && <input type="date" className="input text-sm" value={s} max={max} onChange={(e) => cambiar(e.target.value, 'dia')} />}
      {p === 'mes' && <input type="month" className="input text-sm" value={s.slice(0, 7)} onChange={(e) => cambiar(e.target.value, 'mes')} />}
      {p === 'año' && <input type="number" min="2000" max="2100" className="input text-sm" value={s.slice(0, 4)} onChange={(e) => cambiar(e.target.value ? `${e.target.value}-01-01` : '', 'año')} />}
      <select className="input text-sm w-28 shrink-0" value={p} onChange={(e) => (s ? cambiar(s, e.target.value) : onChange(null, e.target.value))} title="Precisión de la fecha">
        <option value="dia">Día</option>
        <option value="mes">Solo mes</option>
        <option value="año">Solo año</option>
      </select>
    </div>
  )
}

export function PieFormulario({ onCancelar, guardando, error, textoGuardar = 'Guardar', children }) {
  return (
    <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-end gap-2">
      {error && <p className="text-sm text-red-600 mr-auto">{error}</p>}
      {children}
      <Boton variante="secundario" onClick={onCancelar}>Cancelar</Boton>
      <Boton type="submit" disabled={guardando}>{guardando ? 'Guardando…' : textoGuardar}</Boton>
    </div>
  )
}

/** Estado de un formulario: `campo('x')` da { value, onChange } para un input o select. */
export function useCampos(inicial) {
  const [f, setF] = useState(inicial)
  const poner = (k, v) => setF((prev) => ({ ...prev, [k]: v }))
  const campo = (k) => ({
    value: f[k] ?? '',
    onChange: (e) => poner(k, e.target.type === 'checkbox' ? e.target.checked : e.target.value),
  })
  return { f, setF, poner, campo }
}

/** Ejecuta el guardado con su estado de «guardando» y error, y recarga al terminar. */
export function useGuardar(recargar) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const guardar = async (fn) => {
    setGuardando(true)
    setError(null)
    try {
      const r = await fn()
      await recargar()
      setGuardando(false)
      return r ?? true
    } catch (err) {
      setError(err.message)
      setGuardando(false)
      return null
    }
  }
  return { guardando, error, setError, guardar }
}
