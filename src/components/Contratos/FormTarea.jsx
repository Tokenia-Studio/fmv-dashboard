// ============================================
// CONTRATOS - Nueva tarea manual (US-010)
// ============================================

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_TAREA, VISTAS } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, PieFormulario, useCampos, useGuardar } from './ui'

export default function FormTarea({ onClose }) {
  const { modelo, vista, esDireccion, recargar, puedeEditarContrato } = useContratos()
  const { f, campo } = useCampos({ tipo: 'Falta documento', texto: '', responsable: '', fecha_limite: '', vista, contrato_id: '', equipo_id: '' })
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const enviar = async (e) => {
    e.preventDefault()
    if (!f.texto.trim()) return setError('Describe qué hay que resolver.')
    const hecho = await guardar(() =>
      contratosDb.guardar('tareas', {
        tipo: f.tipo,
        texto: f.texto.trim(),
        responsable: f.responsable.trim() || null,
        fecha_limite: f.fecha_limite || null,
        origen: 'manual',
        vista: esDireccion ? f.vista : 'compras_fabrica',
        contrato_id: f.contrato_id ? Number(f.contrato_id) : null,
        equipo_id: f.equipo_id ? Number(f.equipo_id) : null,
      }),
    )
    if (hecho) onClose()
  }

  return (
    <Modal titulo="Nueva tarea" onClose={onClose} ancho="max-w-lg">
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Tipo"><Selector opciones={TIPOS_TAREA} {...campo('tipo')} /></Etiqueta>
          {esDireccion ? (
            <Etiqueta texto="Vista"><Selector opciones={Object.entries(VISTAS).map(([valor, etiqueta]) => ({ valor, etiqueta }))} {...campo('vista')} /></Etiqueta>
          ) : <div />}
          <Etiqueta texto="Qué hay que resolver *" className="sm:col-span-2"><textarea className="input text-sm" rows={3} autoFocus {...campo('texto')} /></Etiqueta>
          <Etiqueta texto="Responsable"><Entrada {...campo('responsable')} /></Etiqueta>
          <Etiqueta texto="Fecha límite"><Entrada type="date" {...campo('fecha_limite')} /></Etiqueta>
          <Etiqueta texto="Contrato">
            <Selector opciones={modelo.contratos.filter(puedeEditarContrato).map((c) => ({ valor: String(c.id), etiqueta: `${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}` }))} vacio="—" {...campo('contrato_id')} />
          </Etiqueta>
          <Etiqueta texto="Equipo">
            <Selector opciones={modelo.equipos.filter((x) => x.estado !== 'baja').map((x) => ({ valor: String(x.id), etiqueta: x.nombre }))} vacio="—" {...campo('equipo_id')} />
          </Etiqueta>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar="Crear tarea" />
      </form>
    </Modal>
  )
}
