// ============================================
// CONTRATOS - Alta y edición de un grupo de equipos (US-004)
// ============================================
// Los 29 extintores o las 43 eslingas son 29 y 43 equipos reunidos en un grupo.

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { NAVES } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, PieFormulario, useCampos, useGuardar } from './ui'

export default function FormGrupo({ grupo, onClose, onGuardado }) {
  const { recargar } = useContratos()
  const { f, campo } = useCampos(
    grupo
      ? { nombre: grupo.nombre, tipo: grupo.tipo, nave: grupo.nave || '', observaciones: grupo.observaciones || '' }
      : { nombre: '', tipo: '', nave: '', observaciones: '', unidades: '', nombreUnidad: '' },
  )
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const enviar = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim() || !f.tipo.trim()) return setError('Nombre y tipo son obligatorios.')
    const n = Number(f.unidades || 0)
    if (!grupo && (!Number.isInteger(n) || n < 0 || n > 500)) return setError('Número de unidades entre 0 y 500.')
    const hecho = await guardar(async () => {
      const g = await contratosDb.guardar('grupos', {
        ...(grupo ? { id: grupo.id } : {}),
        nombre: f.nombre.trim(),
        tipo: f.tipo.trim(),
        nave: f.nave.trim() || null,
        observaciones: f.observaciones.trim() || null,
      })
      if (!grupo && n > 0) {
        await contratosDb.crearUnidades(g, n, { nombre: f.nombreUnidad.trim() || f.tipo.trim(), tipo: f.tipo.trim(), nave: f.nave.trim() || null })
      }
      return g
    })
    if (hecho) (onGuardado || onClose)(hecho)
  }

  return (
    <Modal titulo={grupo ? `Editar ${grupo.nombre}` : 'Nuevo grupo de equipos'} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Nombre del grupo *" className="sm:col-span-2"><Entrada {...campo('nombre')} autoFocus placeholder="Extintores Gavilanes 21" /></Etiqueta>
          <Etiqueta texto="Tipo *"><Entrada {...campo('tipo')} placeholder="Extintores, Eslingas…" /></Etiqueta>
          <Etiqueta texto="Nave">
            <Entrada {...campo('nave')} list="ctr-naves-grupo" />
            <datalist id="ctr-naves-grupo">{NAVES.map((t) => <option key={t} value={t} />)}</datalist>
          </Etiqueta>
          {!grupo && (
            <>
              <Etiqueta texto="Unidades a crear" ayuda="Se crean numeradas; la identificación de cada una se completa después.">
                <Entrada type="number" min="0" max="500" {...campo('unidades')} />
              </Etiqueta>
              <Etiqueta texto="Nombre de cada unidad" ayuda="Se le añade el número: «Extintor 01».">
                <Entrada {...campo('nombreUnidad')} placeholder={f.tipo || 'Extintor'} />
              </Etiqueta>
            </>
          )}
          <Etiqueta texto="Observaciones" className="sm:col-span-2"><textarea className="input text-sm" rows={2} {...campo('observaciones')} /></Etiqueta>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} />
      </form>
    </Modal>
  )
}
