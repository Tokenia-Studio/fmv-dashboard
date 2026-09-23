// ============================================
// CONTRATOS - Registrar la decisión sobre un vencimiento (US-005, flujo 2)
// ============================================
// Renovado hasta, renegociado o cancelado. La decisión queda escrita en las
// observaciones del contrato con su fecha, y el vencimiento se recalcula solo.

import React, { useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { PERIODICIDADES, importeAnualDe, textoFecha, componerNombreFichero, proveedorCortoPropuesto, hoyISO } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, EntradaFecha, PieFormulario, useGuardar, fechaFila } from './ui'

export default function FormDecision({ contrato: c, onClose }) {
  const { recargar } = useContratos()
  const [decision, setDecision] = useState('renovado')
  const [fin, setFin] = useState({ fecha: '', precision: 'dia' })
  const [importe, setImporte] = useState(c.importe ?? '')
  const [periodicidad, setPeriodicidad] = useState(c.periodicidad || 'anual')
  const [nota, setNota] = useState('')
  const [fichero, setFichero] = useState(null)
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const enviar = async (e) => {
    e.preventDefault()
    if (decision !== 'cancelado' && !fin.fecha) return setError('Indica hasta cuándo queda el contrato.')
    if (decision !== 'cancelado' && fin.fecha < hoyISO()) return setError('La nueva fecha fin ya ha pasado.')
    if (importe !== '' && isNaN(Number(String(importe).replace(',', '.')))) return setError('El importe no es un número.')

    const hoy = fechaFila(hoyISO(), 'dia')
    const venceAntes = c.calc.vence ? textoFecha(c.calc.vence) : 'sin vencimiento conocido'
    const texto = {
      renovado: `Renovado hasta ${fechaFila(fin.fecha, fin.precision)}`,
      renegociado: `Renegociado hasta ${fechaFila(fin.fecha, fin.precision)}`,
      cancelado: 'Cancelado: no se renueva',
    }[decision]
    const linea = `${hoy} · ${texto} (vencía ${venceAntes})${nota.trim() ? `. ${nota.trim()}` : ''}`

    const cambios = { id: c.id, observaciones: [c.observaciones, linea].filter(Boolean).join('\n') }
    if (decision === 'cancelado') {
      cambios.estado_documental = 'Terminado'
      cambios.vivo = false
    } else {
      cambios.fin = fin.fecha
      cambios.fin_precision = fin.precision
      cambios.estado_documental = fichero ? 'Vigente' : c.estado_documental === 'Vencido' ? 'Por confirmar' : c.estado_documental
      if (decision === 'renegociado') {
        const imp = importe === '' ? null : Number(String(importe).replace(',', '.'))
        cambios.importe = imp
        cambios.periodicidad = periodicidad
        cambios.importe_anual = importeAnualDe(imp, periodicidad) ?? c.importe_anual
      }
    }

    const hecho = await guardar(async () => {
      await contratosDb.guardar('contratos', cambios)
      if (fichero) {
        const proveedor = c.proveedor_corto || proveedorCortoPropuesto(c.proveedor_nombre)
        const nombre = componerNombreFichero({ fecha: hoyISO(), precision: 'dia', proveedorCorto: proveedor, tipo: 'renovacion', objeto: `${decision === 'cancelado' ? 'Baja' : 'Renovacion'} ${c.objeto}`, referencia: c.referencia })
        await contratosDb.subirDocumento(fichero, `${proveedor}/${nombre}`, { tipo: 'renovacion', rol: 'origen', fecha: hoyISO(), fecha_precision: 'dia', referencia: c.referencia, descripcion: texto }, [c.id])
      }
      return true
    })
    if (hecho) onClose()
  }

  return (
    <Modal titulo={`Decisión sobre ${c.codigo || c.proveedor_nombre}`} onClose={onClose} ancho="max-w-lg">
      <form onSubmit={enviar}>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">Vence: <strong>{c.calc.vence ? textoFecha(c.calc.vence) : 'sin vencimiento conocido'}</strong>{c.importe_anual != null && <> · {Number(c.importe_anual).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € al año</>}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {[['renovado', 'Renovado'], ['renegociado', 'Renegociado'], ['cancelado', 'Cancelado']].map(([v, t]) => (
              <label key={v} className="flex items-center gap-1"><input type="radio" name="decision" checked={decision === v} onChange={() => setDecision(v)} /> {t}</label>
            ))}
          </div>
          {decision !== 'cancelado' && (
            <Etiqueta texto="Nuevo fin del contrato *"><EntradaFecha fecha={fin.fecha} precision={fin.precision} onChange={(d, p) => setFin({ fecha: d || '', precision: p })} /></Etiqueta>
          )}
          {decision === 'renegociado' && (
            <div className="grid grid-cols-2 gap-3">
              <Etiqueta texto="Nuevo importe (sin IVA)"><Entrada inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} /></Etiqueta>
              <Etiqueta texto="Periodicidad"><Selector opciones={PERIODICIDADES.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))} value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)} /></Etiqueta>
            </div>
          )}
          <Etiqueta texto="Nota"><Entrada value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Quién lo decidió, condiciones…" /></Etiqueta>
          <Etiqueta texto="Nuevo documento (opcional)" ayuda="Renovación, carta de baja u oferta aceptada. Queda como documento de origen del contrato.">
            <input type="file" accept="application/pdf,.pdf" className="text-sm" onChange={(e) => setFichero(e.target.files[0] || null)} />
          </Etiqueta>
          {decision === 'cancelado' && <p className="text-xs text-gray-500">El contrato pasa a «Terminado»: se conserva, pero deja de avisar y de sumar en los totales.</p>}
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar="Registrar decisión" />
      </form>
    </Modal>
  )
}
