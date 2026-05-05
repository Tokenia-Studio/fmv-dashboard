// ============================================
// NOTAS COMPRAS - Bloc de notas libre desplegable
// Persistencia en Supabase (tabla notas_compras, single-row)
// ============================================

import React, { useState, useEffect, useRef } from 'react'
import { db } from '../../lib/supabase'

export default function NotasCompras() {
  const [abierto, setAbierto] = useState(false)
  const [contenido, setContenido] = useState('')
  const [estado, setEstado] = useState('idle') // idle | loading | saving | saved | error
  const [updatedAt, setUpdatedAt] = useState(null)
  const debounceRef = useRef(null)
  const cargadoRef = useRef(false)

  // Cargar al montar
  useEffect(() => {
    let activo = true
    setEstado('loading')
    db.notasCompras.get().then(({ data, error }) => {
      if (!activo) return
      if (error) {
        setEstado('error')
        return
      }
      setContenido(data?.contenido ?? '')
      setUpdatedAt(data?.updated_at ?? null)
      cargadoRef.current = true
      setEstado('idle')
    })
    return () => { activo = false }
  }, [])

  // Autosave con debounce (800ms tras dejar de teclear)
  useEffect(() => {
    if (!cargadoRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setEstado('saving')
    debounceRef.current = setTimeout(async () => {
      const { error } = await db.notasCompras.save(contenido)
      if (error) {
        setEstado('error')
      } else {
        setUpdatedAt(new Date().toISOString())
        setEstado('saved')
        setTimeout(() => setEstado('idle'), 1500)
      }
    }, 800)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [contenido])

  const numLineas = contenido.trim() ? contenido.trim().split('\n').filter(l => l.trim()).length : 0

  const formatoFecha = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const indicador = () => {
    if (estado === 'loading') return <span className="text-xs text-gray-400">Cargando...</span>
    if (estado === 'saving') return <span className="text-xs text-amber-600">Guardando...</span>
    if (estado === 'saved') return <span className="text-xs text-green-600">Guardado</span>
    if (estado === 'error') return <span className="text-xs text-red-600">Error al guardar</span>
    if (updatedAt) return <span className="text-xs text-gray-400">Actualizado {formatoFecha(updatedAt)}</span>
    return null
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-500">&#128221;</span>
          <span className="font-semibold text-gray-700">Notas pendientes</span>
          {numLineas > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {numLineas} {numLineas === 1 ? 'línea' : 'líneas'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {abierto && indicador()}
          <span className={`text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`}>
            &#9662;
          </span>
        </div>
      </button>

      {abierto && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Apunta aquí lo que tengas presente: compras de inmovilizado por confirmar, avisos verbales, importes pendientes de cuadrar..."
            className="w-full mt-3 p-3 border border-gray-200 rounded-lg text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent"
            rows={8}
            disabled={estado === 'loading'}
          />
        </div>
      )}
    </div>
  )
}
