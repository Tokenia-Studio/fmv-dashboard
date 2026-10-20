// ============================================
// CONTRATOS - Tareas para cerrar el inventario (US-010)
// ============================================
// Manuales e inventario: tabla ctr_tareas. Automáticas: derivadas del estado de
// los datos (no se guardan); lo que una persona les añade va a ctr_tareas_notas.
//
// Piloto del 20/10/2026 (Sachi y Carlos): una automática que no aplica se DESCARTA con
// motivo, de una en una o en bloque, y deja de contar. Pueden compras y dirección (la
// regla de acceso es la de siempre). «Fuera de plazo» y «Resultado no apto» no se
// descartan: se quitan solas al resolverlas. Si cambia lo que provocó la tarea, vuelve.

import React, { useState } from 'react'
import { Plus, X, Undo2 } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { ESTADOS_TAREA, hoyISO, tareaPendiente } from '../../utils/contratosVista'
import { Kpi, Tarjeta, Tabla, Fila, Td, Sec, Vacio, Badge, Boton } from './ui'
import FormTarea from './FormTarea'

const COLOR_TIPO = { 'Falta documento': 'ambar', Discrepancia: 'rojo', Confirmar: 'azul', Decidir: 'rojo' }

// La nota entera de una tarea automática con los cambios encima: el guardado pisa todas las
// columnas, así que lo que no cambia se manda como estaba
const notaCompleta = (t, cambios) => ({
  clave: t.clave,
  responsable: t.nota?.responsable ?? null,
  nota: t.nota?.nota ?? null,
  pospuesta_hasta: t.nota?.pospuesta_hasta ?? null,
  motivo_descarte: t.nota?.motivo_descarte ?? null,
  descartada_texto: t.nota?.descartada_texto ?? null,
  ...cambios,
})
const descarte = (t, motivo) => ({ motivo_descarte: motivo, descartada_texto: t.texto })
const SIN_DESCARTE = { motivo_descarte: null, descartada_texto: null }
// Fecha y hora de la base de datos (UTC) → día en la hora de aquí
const diaLocal = (ts) => new Date(ts).toLocaleDateString('es-ES')

export default function Tareas() {
  const { modelo, vista, recargar, abrir, responsablePorDefecto } = useContratos()
  const [nueva, setNueva] = useState(false)
  const [verResueltas, setVerResueltas] = useState(false)
  const [verPospuestas, setVerPospuestas] = useState(false)
  const [verDescartadas, setVerDescartadas] = useState(false)
  const [seleccion, setSeleccion] = useState(() => new Set())
  const [descartando, setDescartando] = useState(null) // clave de la tarea que se está descartando sola
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const manuales = modelo.tareas.filter((t) => t.vista === vista)
  const visibles = manuales.filter((t) => verResueltas || t.estado !== 'Resuelta')
  const abiertas = manuales.filter((t) => t.estado !== 'Resuelta')
  const sinResponsable = abiertas.filter((t) => !t.responsable)
  const auto = modelo.tareasAutomaticas.filter((t) => t.vista === vista)
  const descartadas = auto.filter((t) => t.descartada)
  const pospuestas = auto.filter((t) => t.pospuesta && !t.descartada)
  const autoVisibles = auto.filter((t) => !t.descartada && (verPospuestas || !t.pospuesta))
  const porTipo = {}
  autoVisibles.forEach((t) => (porTipo[t.tipo] = porTipo[t.tipo] || []).push(t))
  // Solo cuentan las que se ven: al ocultar pospuestas o al recargar, la selección se ajusta sola
  const seleccionadas = autoVisibles.filter((t) => seleccion.has(t.clave))

  const conGuardado = async (fn) => {
    setError(null)
    setGuardando(true)
    try {
      await fn()
      await recargar()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setGuardando(false)
    }
  }
  const guardarTarea = (t, cambios) => conGuardado(() => contratosDb.guardar('tareas', { id: t.id, ...cambios }))
  const guardarNota = (t, cambios) => conGuardado(() => contratosDb.guardarNotaTarea(t.clave, notaCompleta(t, cambios)))
  const guardarEnBloque = (lista, cambiosDe) => conGuardado(() => contratosDb.guardarNotasTareas(lista.map((t) => notaCompleta(t, cambiosDe(t)))))

  const marcar = (claves, si) =>
    setSeleccion((prev) => {
      const s = new Set(prev)
      claves.forEach((k) => (si ? s.add(k) : s.delete(k)))
      return s
    })

  const descartarUna = async (t, motivo) => {
    if (await guardarNota(t, descarte(t, motivo))) setDescartando(null)
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
  const sujeto = (t) =>
    t.sujeto.tipo !== 'documento'
      ? <button className="font-medium text-fmv-700 hover:underline text-left" onClick={() => abrir(t.sujeto.tipo, t.sujeto.id)}>{t.sujeto.nombre}</button>
      : t.sujeto.nombre
  const placeholderResponsable = responsablePorDefecto ? `${responsablePorDefecto} (por defecto)` : 'Sin asignar'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Kpi etiqueta="Abiertas (inventario y manuales)" valor={abiertas.length} pie={`de ${manuales.length} registradas`} color={abiertas.length ? 'ambar' : 'verde'} />
        <Kpi etiqueta="Sin responsable" valor={sinResponsable.length} pie="Sin nombre, una tarea no se cierra" color={sinResponsable.length ? 'rojo' : 'verde'} />
        <Kpi
          etiqueta="Generadas por la app"
          valor={auto.filter(tareaPendiente).length}
          pie={['Desaparecen solas al resolverse', pospuestas.length && `${pospuestas.length} pospuestas`, descartadas.length && `${descartadas.length} descartadas`].filter(Boolean).join(' · ')}
        />
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
        nota="Agrupadas por tipo. Marca varias para asignarlas, posponerlas o descartarlas de una vez."
        acciones={
          <>
            <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={verPospuestas} onChange={(e) => setVerPospuestas(e.target.checked)} /> Ver pospuestas</label>
            <label className="text-xs text-white flex items-center gap-1"><input type="checkbox" checked={verDescartadas} onChange={(e) => setVerDescartadas(e.target.checked)} /> Ver descartadas{descartadas.length ? ` (${descartadas.length})` : ''}</label>
          </>
        }
      >
        {seleccionadas.length > 0 && (
          <AccionesEnBloque
            lista={seleccionadas}
            guardando={guardando}
            onQuitar={() => setSeleccion(new Set())}
            onAsignar={async (v) => (await guardarEnBloque(seleccionadas, () => ({ responsable: v }))) && setSeleccion(new Set())}
            onPosponer={async (d) => (await guardarEnBloque(seleccionadas, () => ({ pospuesta_hasta: d }))) && setSeleccion(new Set())}
            onDescartar={async (motivo) => {
              const lista = seleccionadas.filter((t) => t.descartable)
              if (await guardarEnBloque(lista, (t) => descarte(t, motivo))) setSeleccion(new Set())
            }}
          />
        )}
        {Object.keys(porTipo).length ? (
          Object.entries(porTipo).sort((a, b) => b[1].length - a[1].length).map(([tipo, lista]) => {
            const todas = lista.every((t) => seleccion.has(t.clave))
            return (
              <details key={tipo} className="border-t border-gray-100">
                <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    title={todas ? 'Quitar todas de la selección' : `Seleccionar las ${lista.length}`}
                    checked={todas}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => marcar(lista.map((t) => t.clave), e.target.checked)}
                  />
                  {tipo}: {lista.length}
                  {!lista[0].descartable && <span className="text-xs font-normal text-gray-500">· se quitan solas al resolverlas</span>}
                </summary>
                <Tabla columnas={['', 'Sobre', 'Qué falta', 'Responsable', 'Nota', 'Posponer hasta', '']}>
                  {lista.map((t) => (
                    <Fila key={t.clave} className={t.pospuesta ? 'opacity-60' : ''}>
                      <Td><input type="checkbox" checked={seleccion.has(t.clave)} onChange={(e) => marcar([t.clave], e.target.checked)} aria-label="Seleccionar" /></Td>
                      <Td className="w-1/4">{sujeto(t)}</Td>
                      <Td>
                        {t.texto}
                        {t.descarteCaducado && (
                          <Sec>
                            <Badge color="ambar">Ha vuelto</Badge> Se descartó{t.nota.descartada_en ? ` el ${diaLocal(t.nota.descartada_en)}` : ''} («{t.nota.motivo_descarte}»), pero la situación ha cambiado: revísala.
                          </Sec>
                        )}
                      </Td>
                      <Td><CampoEnLinea valor={t.nota?.responsable} placeholder={placeholderResponsable} onGuardar={(v) => guardarNota(t, { responsable: v })} /></Td>
                      <Td><CampoEnLinea valor={t.nota?.nota} placeholder="—" onGuardar={(v) => guardarNota(t, { nota: v })} /></Td>
                      <Td><input type="date" className="input text-sm !w-36" defaultValue={t.nota?.pospuesta_hasta || ''} onBlur={(e) => (e.target.value || null) !== (t.nota?.pospuesta_hasta || null) && guardarNota(t, { pospuesta_hasta: e.target.value || null })} /></Td>
                      <Td className="whitespace-nowrap">
                        {!t.descartable ? (
                          <span className="text-xs text-gray-400" title="Se quita sola al registrar la realizada o resolver la causa">Se quita sola</span>
                        ) : descartando === t.clave ? (
                          <Descartar guardando={guardando} onCancelar={() => setDescartando(null)} onDescartar={(m) => descartarUna(t, m)} />
                        ) : (
                          <button className="text-xs text-gray-500 hover:text-red-600 inline-flex items-center gap-0.5" onClick={() => setDescartando(t.clave)} title="Quitarla de la lista porque no aplica (con motivo)">
                            <X size={12} /> Descartar
                          </button>
                        )}
                      </Td>
                    </Fila>
                  ))}
                </Tabla>
              </details>
            )
          })
        ) : (
          <Vacio>{auto.length ? 'Todas pospuestas o descartadas.' : 'Nada pendiente.'}</Vacio>
        )}

        {verDescartadas && (
          <div className="border-t-2 border-gray-200">
            <p className="px-4 pt-3 text-sm font-medium text-slate-700">Descartadas: {descartadas.length}</p>
            {descartadas.length ? (
              <Tabla columnas={['Sobre', 'Qué era', 'Por qué se descartó', '']}>
                {descartadas.map((t) => (
                  <Fila key={t.clave} className="opacity-80">
                    <Td className="w-1/4">{sujeto(t)}<Sec>{t.tipo}</Sec></Td>
                    <Td>{t.texto}</Td>
                    <Td>{t.nota.motivo_descarte}{t.nota.descartada_en && <Sec>el {diaLocal(t.nota.descartada_en)}</Sec>}</Td>
                    <Td className="whitespace-nowrap">
                      <button className="text-xs text-fmv-700 hover:underline inline-flex items-center gap-0.5" disabled={guardando} onClick={() => guardarNota(t, SIN_DESCARTE)} title="Vuelve a la lista de pendientes">
                        <Undo2 size={12} /> Recuperar
                      </button>
                    </Td>
                  </Fila>
                ))}
              </Tabla>
            ) : (
              <Vacio>No hay ninguna descartada.</Vacio>
            )}
          </div>
        )}
      </Tarjeta>

      {nueva && <FormTarea onClose={() => setNueva(false)} />}
    </div>
  )
}

/** Barra de acciones sobre las tareas marcadas. */
function AccionesEnBloque({ lista, guardando, onQuitar, onAsignar, onPosponer, onDescartar }) {
  const [responsable, setResponsable] = useState('')
  const [fecha, setFecha] = useState('')
  const [motivo, setMotivo] = useState('')
  const noDescartables = lista.filter((t) => !t.descartable).length
  const descartables = lista.length - noDescartables
  return (
    <div className="sticky top-0 z-10 border-b border-fmv-200 bg-fmv-50 px-4 py-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{lista.length} seleccionada{lista.length > 1 ? 's' : ''}</strong>
        <button className="text-xs text-gray-600 underline" onClick={onQuitar}>Quitar la selección</button>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-1">
          <input className="input text-sm !w-36" placeholder="Responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)} />
          <Boton variante="secundario" disabled={guardando || !responsable.trim()} onClick={() => onAsignar(responsable.trim())}>Asignar</Boton>
        </div>
        <div className="flex items-center gap-1">
          <input type="date" className="input text-sm !w-36" min={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} title="Posponer hasta" />
          <Boton variante="secundario" disabled={guardando || !fecha} onClick={() => onPosponer(fecha)}>Posponer</Boton>
        </div>
        <div className="flex items-center gap-1">
          <input className="input text-sm !w-64" placeholder="Por qué no aplica (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
          <Boton variante="secundario" disabled={guardando || motivo.trim().length < 3 || !descartables} onClick={() => onDescartar(motivo.trim())}>
            Descartar {descartables !== lista.length ? descartables : ''}
          </Boton>
        </div>
      </div>
      {noDescartables > 0 && (
        <p className="text-xs text-gray-600">
          {noDescartables === 1 ? 'Una es' : `${noDescartables} son`} «Fuera de plazo» o «Resultado no apto»: no se descartan, se quitan solas al resolverlas. Sí se pueden asignar y posponer.
        </p>
      )}
    </div>
  )
}

/** Motivo de descarte de una tarea, en la propia fila. */
function Descartar({ guardando, onCancelar, onDescartar }) {
  const [motivo, setMotivo] = useState('')
  return (
    <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (motivo.trim().length >= 3) onDescartar(motivo.trim()) }}>
      <input className="input text-sm !w-48" autoFocus placeholder="Por qué no aplica" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
      <button type="submit" className="text-xs font-semibold text-red-700 underline disabled:opacity-40" disabled={guardando || motivo.trim().length < 3}>Descartar</button>
      <button type="button" className="text-xs text-gray-600 underline" onClick={onCancelar}>No</button>
    </form>
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
