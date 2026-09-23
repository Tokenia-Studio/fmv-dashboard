// ============================================
// CONTRATOS - Tareas para cerrar el inventario (US-010)
// ============================================
// Manuales e inventario: tabla ctr_tareas. Automáticas: derivadas del estado de
// los datos (no se guardan); lo que una persona les añade va a ctr_tareas_notas.

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { ESTADOS_TAREA, hoyISO } from '../../utils/contratosVista'
import { Kpi, Tarjeta, Tabla, Fila, Td, Sec, Vacio, Badge, Boton } from './ui'
import FormTarea from './FormTarea'

const COLOR_TIPO = { 'Falta documento': 'ambar', Discrepancia: 'rojo', Confirmar: 'azul', Decidir: 'rojo' }

export default function Tareas() {
  const { modelo, vista, recargar, abrir } = useContratos()
  const [nueva, setNueva] = useState(false)
  const [verResueltas, setVerResueltas] = useState(false)
  const [verPospuestas, setVerPospuestas] = useState(false)
  const [error, setError] = useState(null)

  const manuales = modelo.tareas.filter((t) => t.vista === vista)
  const visibles = manuales.filter((t) => verResueltas || t.estado !== 'Resuelta')
  const abiertas = manuales.filter((t) => t.estado !== 'Resuelta')
  const sinResponsable = abiertas.filter((t) => !t.responsable)
  const auto = modelo.tareasAutomaticas.filter((t) => t.vista === vista)
  const autoVisibles = auto.filter((t) => verPospuestas || !t.pospuesta)
  const porTipo = {}
  autoVisibles.forEach((t) => (porTipo[t.tipo] = porTipo[t.tipo] || []).push(t))

  const guardarTarea = async (t, cambios) => {
    setError(null)
    try {
      await contratosDb.guardar('tareas', { id: t.id, ...cambios })
      await recargar()
    } catch (err) {
      setError(err.message)
    }
  }
  const guardarNota = async (t, cambios) => {
    setError(null)
    try {
      await contratosDb.guardarNotaTarea(t.clave, {
        responsable: t.nota?.responsable ?? null,
        nota: t.nota?.nota ?? null,
        pospuesta_hasta: t.nota?.pospuesta_hasta ?? null,
        ...cambios,
      })
      await recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const sobre = (t) => {
    const c = t.contrato_id ? modelo.contrato(t.contrato_id) : null
    const e = t.equipo_id ? modelo.equipo(t.equipo_id) : null
    return (
      <>
        {c && <button className="mr-2 text-fmv-700 hover:underline" onClick={() => abrir('contrato', c.id)}>{c.codigo || c.proveedor_nombre}</button>}
        {e && <button className="text-fmv-700 hover:underline" onClick={() => abrir('equipo', e.id)}>{e.nombre}</button>}
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi etiqueta="Abiertas (inventario y manuales)" valor={abiertas.length} pie={`de ${manuales.length} registradas`} color={abiertas.length ? 'ambar' : 'verde'} />
        <Kpi etiqueta="Sin responsable" valor={sinResponsable.length} pie="Sin nombre, una tarea no se cierra" color={sinResponsable.length ? 'rojo' : 'verde'} />
        <Kpi etiqueta="Generadas por la app" valor={auto.filter((t) => !t.pospuesta).length} pie={`Desaparecen solas al resolverse${auto.some((t) => t.pospuesta) ? ` · ${auto.filter((t) => t.pospuesta).length} pospuestas` : ''}`} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Tarjeta
        titulo="Tareas del inventario y manuales"
        acciones={
          <>
            <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={verResueltas} onChange={(e) => setVerResueltas(e.target.checked)} /> Ver resueltas</label>
            <Boton variante="claro" onClick={() => setNueva(true)}><Plus size={14} /> Nueva tarea</Boton>
          </>
        }
      >
        {visibles.length ? (
          <Tabla columnas={['Tipo', 'Qué hay que resolver', 'Sobre', 'Responsable', 'Fecha límite', 'Estado']}>
            {visibles.map((t) => (
              <Fila key={t.id} className={t.estado === 'Resuelta' ? 'opacity-60' : ''}>
                <Td><Badge color={COLOR_TIPO[t.tipo] || 'gris'}>{t.tipo}</Badge></Td>
                <Td>{t.texto}{t.respuesta && <Sec>Respuesta de FMV: {t.respuesta}</Sec>}<Sec>{t.origen}</Sec></Td>
                <Td className="whitespace-nowrap">{sobre(t)}</Td>
                <Td><CampoEnLinea valor={t.responsable} placeholder="Sin asignar" onGuardar={(v) => guardarTarea(t, { responsable: v })} /></Td>
                <Td>
                  <input type="date" className="input text-sm !w-36" defaultValue={t.fecha_limite || ''} onBlur={(e) => (e.target.value || null) !== (t.fecha_limite || null) && guardarTarea(t, { fecha_limite: e.target.value || null })} />
                  {t.fecha_limite && t.estado !== 'Resuelta' && t.fecha_limite < hoyISO() && <Sec><span className="text-red-600">Vencida</span></Sec>}
                </Td>
                <Td>
                  <select className="input text-sm !w-28" value={t.estado} onChange={(e) => guardarTarea(t, { estado: e.target.value })}>
                    {ESTADOS_TAREA.map((x) => <option key={x}>{x}</option>)}
                  </select>
                </Td>
              </Fila>
            ))}
          </Tabla>
        ) : (
          <Vacio>{manuales.length ? 'Todas resueltas.' : 'Sin tareas. Las 34 del inventario llegan con la carga inicial.'}</Vacio>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Generadas por la app"
        nota="Agrupadas por tipo"
        acciones={<label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={verPospuestas} onChange={(e) => setVerPospuestas(e.target.checked)} /> Ver pospuestas</label>}
      >
        {Object.keys(porTipo).length ? (
          Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length).map(([tipo, lista]) => (
            <details key={tipo} className="border-t border-gray-100">
              <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700">{tipo}: {lista.length}</summary>
              <Tabla columnas={['Sobre', 'Qué falta', 'Responsable', 'Nota', 'Posponer hasta']}>
                {lista.map((t) => (
                  <Fila key={t.clave} className={t.pospuesta ? 'opacity-60' : ''}>
                    <Td className="w-1/4">
                      {t.sujeto.tipo !== 'documento' ? <button className="font-medium text-fmv-700 hover:underline text-left" onClick={() => abrir(t.sujeto.tipo, t.sujeto.id)}>{t.sujeto.nombre}</button> : t.sujeto.nombre}
                    </Td>
                    <Td>{t.texto}</Td>
                    <Td><CampoEnLinea valor={t.nota?.responsable} placeholder="Sin asignar" onGuardar={(v) => guardarNota(t, { responsable: v })} /></Td>
                    <Td><CampoEnLinea valor={t.nota?.nota} placeholder="—" onGuardar={(v) => guardarNota(t, { nota: v })} /></Td>
                    <Td><input type="date" className="input text-sm !w-36" defaultValue={t.nota?.pospuesta_hasta || ''} onBlur={(e) => (e.target.value || null) !== (t.nota?.pospuesta_hasta || null) && guardarNota(t, { pospuesta_hasta: e.target.value || null })} /></Td>
                  </Fila>
                ))}
              </Tabla>
            </details>
          ))
        ) : (
          <Vacio>{auto.length ? 'Todas pospuestas.' : 'Nada pendiente.'}</Vacio>
        )}
      </Tarjeta>

      {nueva && <FormTarea onClose={() => setNueva(false)} />}
    </div>
  )
}

/** Texto que se guarda al salir del campo si ha cambiado. */
function CampoEnLinea({ valor, placeholder, onGuardar }) {
  return (
    <input
      className="input text-sm !w-36"
      defaultValue={valor || ''}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim() || null
        if (v !== (valor || null)) onGuardar(v)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
    />
  )
}
