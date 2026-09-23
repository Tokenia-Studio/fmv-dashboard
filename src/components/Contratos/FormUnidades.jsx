// ============================================
// CONTRATOS - Añadir unidades a un grupo (US-004)
// ============================================

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { REGIMENES } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, PieFormulario, useCampos, useGuardar } from './ui'

export default function FormUnidades({ grupo, onClose }) {
  const { recargar } = useContratos()
  const base = grupo.unidades[0]
  const { f, campo } = useCampos({
    cantidad: '1',
    nombre: base ? base.nombre.replace(/\s*\d+$/, '') : grupo.tipo,
    desde: String(grupo.unidades.length),
    regimen: base?.regimen || 'propio',
    activo_fijo_bc: '',
  })
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const enviar = async (e) => {
    e.preventDefault()
    const n = Number(f.cantidad)
    if (!Number.isInteger(n) || n < 1 || n > 500) return setError('Entre 1 y 500 unidades.')
    const hecho = await guardar(() =>
      contratosDb.crearUnidades(
        grupo,
        n,
        { nombre: f.nombre.trim() || grupo.tipo, tipo: grupo.tipo, nave: grupo.nave || null, regimen: f.regimen, activo_fijo_bc: f.activo_fijo_bc.trim() || null },
        Number(f.desde) || 0,
      ),
    )
    if (hecho) onClose()
  }

  return (
    <Modal titulo={`Añadir unidades a ${grupo.nombre}`} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Cuántas"><Entrada type="number" min="1" max="500" {...campo('cantidad')} autoFocus /></Etiqueta>
          <Etiqueta texto="Nombre" ayuda={`Se numeran a partir de ${Number(f.desde || 0) + 1}.`}><Entrada {...campo('nombre')} /></Etiqueta>
          <Etiqueta texto="Régimen"><Selector opciones={REGIMENES} {...campo('regimen')} /></Etiqueta>
          <Etiqueta texto="Código de activo fijo BC" ayuda="Si todas comparten uno (p. ej. el lote)."><Entrada {...campo('activo_fijo_bc')} /></Etiqueta>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar="Añadir" />
      </form>
    </Modal>
  )
}
