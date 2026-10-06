// ============================================
// CONTRATOS - Alta y edición de un equipo (US-002, US-004)
// ============================================
// La baja es lógica: estado «baja». Nunca se borra un equipo (se perdería su historial).

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_EQUIPO, NAVES, ESTADOS_EQUIPO, REGIMENES, sumaEnTotales } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, PieFormulario, Aviso, useCampos, useGuardar } from './ui'

const CAMPOS = ['nombre', 'tipo', 'grupo_id', 'num_interno', 'modelo', 'num_serie', 'identificacion', 'nave', 'asignado_a', 'estado', 'regimen', 'activo_fijo_bc', 'sin_plan', 'observaciones']

export default function FormEquipo({ equipo, grupoId, onClose, onGuardado }) {
  const { modelo, recargar, puedeEditarContrato } = useContratos()
  const inicial = equipo
    ? Object.fromEntries(CAMPOS.map((k) => [k, equipo[k] ?? (k === 'sin_plan' ? false : '')]))
    : { estado: 'activo', regimen: 'propio', sin_plan: false, grupo_id: grupoId || '' }
  const { f, campo, poner } = useCampos({ ...inicial, contratos: equipo ? equipo.contratosIds : [] })
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  // Contratos a los que se puede enlazar: los que la persona puede editar (la RLS lo exige para el enlace)
  const enlazables = modelo.contratos.filter((c) => puedeEditarContrato(c) && (sumaEnTotales(c) || f.contratos.includes(c.id)))
  const noEditables = (equipo?.contratosIds || []).filter((id) => !enlazables.some((c) => c.id === id))

  const alternar = (id) => {
    const lista = f.contratos.includes(id) ? f.contratos.filter((x) => x !== id) : [...f.contratos, id]
    poner('contratos', lista)
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!f.nombre?.trim() || !f.tipo?.trim()) return setError('Nombre y tipo son obligatorios.')
    const fila = Object.fromEntries(CAMPOS.map((k) => [k, typeof f[k] === 'string' ? f[k].trim() : f[k]]))
    fila.grupo_id = f.grupo_id ? Number(f.grupo_id) : null
    const hecho = await guardar(async () => {
      const guardado = await contratosDb.guardar('equipos', { ...(equipo ? { id: equipo.id } : {}), ...fila })
      // Enlaces equipo—contrato: solo se tocan los contratos que se pueden editar
      const antes = equipo ? equipo.contratosIds : []
      for (const c of enlazables) {
        const estaba = antes.includes(c.id)
        const esta = f.contratos.includes(c.id)
        if (estaba === esta) continue
        const actuales = modelo.contrato(c.id).equiposIds
        await contratosDb.fijarEquiposDeContrato(c.id, esta ? [...actuales, guardado.id] : actuales.filter((x) => x !== guardado.id), actuales)
      }
      return guardado
    })
    if (hecho) (onGuardado || onClose)(hecho)
  }

  return (
    <Modal titulo={equipo ? `Editar ${equipo.nombre}` : 'Nuevo equipo'} onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Nombre *"><Entrada {...campo('nombre')} autoFocus placeholder="Grupo de soldadura 072" /></Etiqueta>
          <Etiqueta texto="Tipo *">
            <Entrada {...campo('tipo')} list="ctr-tipos-equipo" />
            <datalist id="ctr-tipos-equipo">{TIPOS_EQUIPO.map((t) => <option key={t} value={t} />)}</datalist>
          </Etiqueta>
          <Etiqueta texto="Régimen" ayuda="Lo que está en renting o alquiler no es un activo de FMV, pero su mantenimiento se controla igual.">
            <Selector opciones={REGIMENES} {...campo('regimen')} />
          </Etiqueta>
          <Etiqueta texto="Código de activo fijo BC" ayuda={f.regimen === 'propio' ? 'Obligatorio en equipos propios: si falta, queda pendiente y genera tarea.' : 'No aplica a renting ni alquiler.'}>
            <Entrada {...campo('activo_fijo_bc')} />
          </Etiqueta>
          <Etiqueta texto="Nº interno"><Entrada {...campo('num_interno')} /></Etiqueta>
          <Etiqueta texto="Modelo"><Entrada {...campo('modelo')} /></Etiqueta>
          <Etiqueta texto="Nº de serie" ayuda="Con él se casan los certificados de calibración."><Entrada {...campo('num_serie')} /></Etiqueta>
          <Etiqueta texto="Identificación"><Entrada {...campo('identificacion')} placeholder="Placa, etiqueta, ubicación…" /></Etiqueta>
          <Etiqueta texto="Nave">
            <Entrada {...campo('nave')} list="ctr-naves" />
            <datalist id="ctr-naves">{NAVES.map((t) => <option key={t} value={t} />)}</datalist>
          </Etiqueta>
          <Etiqueta texto="Asignado a"><Entrada {...campo('asignado_a')} /></Etiqueta>
          <Etiqueta texto="Estado" ayuda="Baja: deja de generar obligaciones y de aparecer como pendiente.">
            <Selector opciones={ESTADOS_EQUIPO} {...campo('estado')} />
          </Etiqueta>
          <Etiqueta texto="Grupo">
            <Selector opciones={modelo.grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))} vacio="— Ninguno —" {...campo('grupo_id')} />
          </Etiqueta>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.sin_plan} onChange={campo('sin_plan').onChange} />
            Sin plan de mantenimiento (sale en el panel como «decidir si se contrata»)
          </label>
          <Etiqueta texto="Observaciones" className="sm:col-span-2">
            <textarea className="input text-sm" rows={2} {...campo('observaciones')} />
          </Etiqueta>
          <div className="sm:col-span-2">
            <span className="block text-xs font-medium text-gray-600 mb-1">Contratos que lo cubren</span>
            {enlazables.length ? (
              <div className="max-h-40 overflow-y-auto rounded border border-gray-200 divide-y divide-gray-100">
                {enlazables.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <input type="checkbox" checked={f.contratos.includes(c.id)} onChange={() => alternar(c.id)} />
                    <span>{c.codigo ? `${c.codigo} · ` : ''}{c.proveedor_nombre} <span className="text-gray-500">· {c.objeto}</span></span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay contratos que puedas enlazar.</p>
            )}
            {noEditables.length > 0 && <Aviso color="gris">También lo cubre un contrato de Servicios y arrendamientos, que solo cambia dirección.</Aviso>}
          </div>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} />
      </form>
    </Modal>
  )
}
