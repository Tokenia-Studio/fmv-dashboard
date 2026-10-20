// ============================================
// CONTRATOS - Poner el documento de cierre a una realizada registrada sin él (F4)
// ============================================
// Antes, un PDF subido después no cerraba la realizada ni quitaba la tarea «falta
// documento de cierre» (QA del 24/09/2026; volvió a pasar en el piloto del 08/10). Aquí se
// elige uno de los documentos ya subidos de la obligación o del equipo, o se sube en el
// momento. La base de datos solo deja poner el cierre una vez y con un documento que se ve.

import React, { useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_DOCUMENTO, TIPO_CIERRE, documentosParaCierre, etiquetaTipoDocumento } from '../../utils/contratosVista'
import { Modal, PieFormulario, Vacio, Aviso, fechaFila, useGuardar } from './ui'
import FormDocumento from './FormDocumento'

export default function FormCierre({ o, r, onClose }) {
  const { modelo, recargar } = useContratos()
  const [subir, setSubir] = useState(false)
  const [elegido, setElegido] = useState(null)
  const { guardando, error, setError, guardar } = useGuardar(recargar)
  const docs = documentosParaCierre(modelo, o)

  if (subir) return <FormDocumento destino={{ obligacion: o }} realizada={r} onClose={onClose} />

  const enviar = async (ev) => {
    ev.preventDefault()
    const d = docs.find((x) => x.id === elegido)
    if (!d) return setError('Elige un documento o sube el PDF.')
    const esDeCierre = TIPOS_DOCUMENTO.some((t) => t.valor === d.tipo && t.rol === 'cierre')
    const hecho = await guardar(async () => {
      await contratosDb.actualizarDocumento(d.id, {
        obligacion_id: o.id,
        rol: 'cierre',
        ...(esDeCierre ? {} : { tipo: TIPO_CIERRE[o.tipo] || 'parte_visita' }),
        // Sin fecha propia, la del trabajo: se puede corregir luego en la ficha del documento
        ...(d.fecha ? {} : { fecha: String(r.fecha).slice(0, 10), fecha_precision: 'dia' }),
      })
      await contratosDb.ponerCierre(r.id, d.id)
    })
    if (hecho) onClose()
  }

  return (
    <Modal titulo={`Documento de cierre · ${o.etiqueta} del ${fechaFila(r.fecha, 'dia')}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="p-4 space-y-3 text-sm">
          {docs.length ? (
            <>
              <p className="text-gray-600">Elige el que prueba esta realizada (los de la obligación y los del equipo que no cierran ya otra):</p>
              <ul className="space-y-1">
                {docs.map((d) => (
                  <li key={d.id}>
                    <label className={`flex items-start gap-2 rounded border px-3 py-2 cursor-pointer ${elegido === d.id ? 'border-fmv-300 bg-fmv-50' : 'border-gray-200'}`}>
                      <input type="radio" name="doc" className="mt-1" checked={elegido === d.id} onChange={() => setElegido(d.id)} />
                      <span>
                        <span className="font-medium">{d.descripcion || d.nombre_original}</span>
                        <span className="block text-xs text-gray-500">
                          {d.fecha ? fechaFila(d.fecha, d.fecha_precision) : 'sin fecha (se le pondrá la de la realizada)'} · {etiquetaTipoDocumento(d.tipo)} · {d.nombre_original}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Vacio>No hay documentos subidos de esta obligación ni del equipo que puedan servir.</Vacio>
          )}
          <Aviso color="azul">
            ¿No está?{' '}
            <button type="button" className="font-semibold underline" onClick={() => setSubir(true)}>Sube el PDF ahora</button>{' '}
            y queda como cierre de esta realizada.
          </Aviso>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar="Poner como cierre" />
      </form>
    </Modal>
  )
}
