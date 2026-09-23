// ============================================
// CONTRATOS - Registrar una o varias obligaciones como realizadas (US-003)
// ============================================
// · Una: desde el bloque de la obligación.
// · Varias a la vez: las 16 calibraciones de un mismo pedido, con su certificado cada una.
// · Grupo: resultado unidad a unidad (26 de 43 eslingas no aptas).
// Sin documento de cierre la realizada se guarda igual y nace la tarea «falta documento de cierre».
// No se admite fecha futura (también lo impide la base de datos).

import React, { useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { componerNombreFichero, proveedorCortoPropuesto, fechaRealizadaValida, hoyISO, hoyLocal } from '../../utils/contratosVista'
import { resumenUnidades } from '../../utils/contratosMotor'
import { Modal, Etiqueta, Entrada, PieFormulario, Aviso, useGuardar } from './ui'

const TIPO_CIERRE = { Calibración: 'certificado', Certificación: 'certificado', Revisión: 'parte_visita', Inspección: 'informe_revision' }

export default function FormRealizada({ obligaciones, onClose }) {
  const { modelo, recargar } = useContratos()
  const varias = obligaciones.length > 1
  const [fecha, setFecha] = useState(hoyISO())
  const [nota, setNota] = useState('')
  const [comun, setComun] = useState(null) // un único documento para todas
  const [filas, setFilas] = useState(() =>
    Object.fromEntries(
      obligaciones.map((o) => {
        const unidades = o.grupo_id ? (modelo.grupo(o.grupo_id)?.unidades || []).filter((u) => u.estado !== 'baja') : []
        return [o.id, { incluir: !varias, resultado: 'apto', fichero: null, unidades: Object.fromEntries(unidades.map((u) => [u.id, 'apto'])) }]
      }),
    ),
  )
  const { guardando, error, setError, guardar } = useGuardar(recargar)
  const cambiar = (id, cambios) => setFilas((p) => ({ ...p, [id]: { ...p[id], ...cambios } }))
  const incluidas = obligaciones.filter((o) => filas[o.id].incluir)

  const nombreDocumento = (o, fichero, tipo) => {
    const contrato = o.contrato_id ? modelo.contrato(o.contrato_id) : null
    const eq = o.equipo_id ? modelo.equipo(o.equipo_id) : null
    const proveedor = contrato?.proveedor_corto || proveedorCortoPropuesto(o.proveedor_nombre || contrato?.proveedor_nombre || 'FMV')
    const nombre = componerNombreFichero({
      fecha,
      precision: 'dia',
      proveedorCorto: proveedor,
      tipo,
      objeto: `${o.tipo} ${o.sujeto.nombre}`,
      referencia: eq?.num_serie || eq?.num_interno,
    })
    return { ruta: `${proveedor || 'Sin-proveedor'}/${nombre}`, nombre_original: fichero.name }
  }

  const subir = async (o, fichero) => {
    const tipo = TIPO_CIERRE[o.tipo] || 'otro'
    const { ruta, nombre_original } = nombreDocumento(o, fichero, tipo)
    const doc = await contratosDb.subirDocumento(fichero, ruta, {
      nombre_original,
      tipo,
      rol: 'cierre',
      fecha,
      fecha_precision: 'dia',
      obligacion_id: o.id,
      descripcion: `${o.tipo} · ${o.sujeto.nombre}`,
    })
    return doc.id
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!incluidas.length) return setError('Marca al menos una obligación.')
    if (!fechaRealizadaValida(fecha, hoyLocal())) return setError('La fecha no puede ser futura.')
    const hecho = await guardar(async () => {
      const idComun = comun ? await subir(incluidas[0], comun) : null
      const lista = []
      for (const o of incluidas) {
        const fila = filas[o.id]
        const documento_id = fila.fichero ? await subir(o, fila.fichero) : idComun
        const unidades = Object.entries(fila.unidades).map(([equipo_id, resultado]) => ({ equipo_id: Number(equipo_id), resultado }))
        const resultado = o.grupo_id && unidades.length ? resumenUnidades(unidades).resultado : fila.resultado
        lista.push({ obligacion_id: o.id, fecha, resultado, nota: nota.trim() || null, documento_id, unidades: o.grupo_id ? unidades : [] })
      }
      return contratosDb.registrarRealizadas(lista)
    })
    if (hecho) onClose()
  }

  const sinDocumento = incluidas.filter((o) => !filas[o.id].fichero && !comun).length

  return (
    <Modal titulo={varias ? 'Registrar varias realizadas' : `Registrar realizada · ${obligaciones[0].etiqueta}`} onClose={onClose} ancho="max-w-3xl">
      <form onSubmit={enviar}>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Etiqueta texto="Fecha en que se hizo"><Entrada type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} required /></Etiqueta>
            <Etiqueta texto="Nota" className="sm:col-span-2"><Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Pedido, técnico, incidencias…" /></Etiqueta>
            {varias && (
              <Etiqueta texto="Un solo documento para todas (opcional)" className="sm:col-span-3" ayuda="Por ejemplo, un parte que recoge todas las revisiones. Si cada una tiene su certificado, súbelo en su fila.">
                <input type="file" accept="application/pdf,.pdf" onChange={(e) => setComun(e.target.files[0] || null)} className="text-sm" />
              </Etiqueta>
            )}
          </div>

          {varias && (
            <div className="flex gap-3 text-sm">
              <button type="button" className="text-fmv-700 underline" onClick={() => setFilas((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, incluir: true }])))}>Marcar todas</button>
              <button type="button" className="text-fmv-700 underline" onClick={() => setFilas((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { ...v, incluir: false }])))}>Ninguna</button>
              <span className="text-gray-500">{incluidas.length} de {obligaciones.length} marcadas</span>
            </div>
          )}

          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {obligaciones.map((o) => {
              const fila = filas[o.id]
              const unidades = o.grupo_id ? (modelo.grupo(o.grupo_id)?.unidades || []).filter((u) => u.estado !== 'baja') : []
              const noAptas = Object.values(fila.unidades).filter((r) => r === 'no apto').length
              return (
                <div key={o.id} className={`rounded border p-2 ${fila.incluir ? 'border-fmv-200 bg-fmv-50' : 'border-gray-200'}`}>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {varias && <input type="checkbox" checked={fila.incluir} onChange={(e) => cambiar(o.id, { incluir: e.target.checked })} />}
                    <span className="font-medium flex-1 min-w-[12rem]">{o.sujeto.nombre}<span className="block text-xs text-gray-500">{o.tipo} · {o.etiqueta}</span></span>
                    {!o.grupo_id && (
                      <select className="input text-sm !w-36" value={fila.resultado} onChange={(e) => cambiar(o.id, { resultado: e.target.value, incluir: true })}>
                        <option value="apto">Apto</option>
                        <option value="no apto">No apto</option>
                        <option value="sin resultado">Sin resultado</option>
                      </select>
                    )}
                    <label className="text-xs text-gray-600">
                      {TIPO_CIERRE[o.tipo] === 'certificado' ? 'Certificado' : 'Parte o informe'} (PDF)
                      <input type="file" accept="application/pdf,.pdf" className="block text-xs" onChange={(e) => cambiar(o.id, { fichero: e.target.files[0] || null, incluir: true })} />
                    </label>
                  </div>
                  {o.grupo_id && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Resultado por unidad: {unidades.length - noAptas} aptas · {noAptas} no aptas. Pulsa una unidad para cambiarla.</p>
                      {unidades.length ? (
                        <div className="flex flex-wrap gap-1">
                          {unidades.map((u) => {
                            const r = fila.unidades[u.id]
                            return (
                              <button
                                type="button"
                                key={u.id}
                                onClick={() => cambiar(o.id, { unidades: { ...fila.unidades, [u.id]: r === 'apto' ? 'no apto' : 'apto' }, incluir: true })}
                                className={`rounded border px-2 py-0.5 text-xs ${r === 'apto' ? 'border-green-300 bg-green-50 text-green-800' : 'border-red-300 bg-red-50 text-red-700'}`}
                                title={u.identificacion || u.num_serie || ''}
                              >
                                {u.nombre}
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700">El grupo no tiene unidades en servicio: se registra sin resultado por unidad.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {sinDocumento > 0 && (
            <Aviso>
              {sinDocumento === 1 ? 'Una realizada irá' : `${sinDocumento} realizadas irán`} sin documento de cierre: se guardan igual y aparece la tarea «falta documento de cierre» hasta que se suba.
            </Aviso>
          )}
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar={varias ? `Registrar ${incluidas.length}` : 'Registrar'} />
      </form>
    </Modal>
  )
}
