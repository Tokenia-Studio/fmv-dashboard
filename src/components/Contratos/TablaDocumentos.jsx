// ============================================
// CONTRATOS - Tabla de documentos (US-009)
// ============================================

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { etiquetaTipoDocumento } from '../../utils/contratosVista'
import { Tabla, Fila, Td, Sec, Vacio, Badge, Pendiente, BotonPdf, fechaFila } from './ui'

const ROL = { origen: ['azul', 'Origen'], cierre: ['verde', 'Cierre'], otro: ['gris', 'Otro'] }

export default function TablaDocumentos({ docs, vacio = 'Sin documentos.', conEnlaces = true, conBorrar = false, max }) {
  const { modelo, abrir, recargar } = useContratos()
  const [borrando, setBorrando] = useState(null)
  const [error, setError] = useState(null)
  if (!docs.length) return <Vacio>{vacio}</Vacio>

  const borrar = async (doc) => {
    setError(null)
    try {
      await contratosDb.borrarDocumento(doc)
      setBorrando(null)
      await recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const orden = [...docs].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')))
  return (
    <>
      {error && <p className="px-3 py-2 text-sm text-red-600">{error}</p>}
      <Tabla columnas={['Fecha', 'Rol', 'Tipo', 'Documento', ...(conEnlaces ? ['Enlazado a'] : []), ...(conBorrar ? [''] : [])]} max={max}>
        {orden.map((d) => {
          const eq = d.equipo_id ? modelo.equipo(d.equipo_id) : null
          const ob = d.obligacion_id ? modelo.obligacion(d.obligacion_id) : null
          const cs = d.contratosIds.map((id) => modelo.contrato(id)).filter(Boolean)
          return (
            <Fila key={d.id}>
              <Td className="whitespace-nowrap">{d.fecha ? fechaFila(d.fecha, d.fecha_precision) : <Pendiente>Sin fecha</Pendiente>}</Td>
              <Td><Badge color={ROL[d.rol]?.[0]}>{ROL[d.rol]?.[1] || d.rol}</Badge></Td>
              <Td>{etiquetaTipoDocumento(d.tipo)}</Td>
              <Td>
                <BotonPdf doc={d} texto={d.descripcion || d.nombre_original} />
                <Sec>{d.ruta}{d.referencia ? ` · ref. ${d.referencia}` : ''}{d.legible === false ? ' · no legible' : ''}</Sec>
              </Td>
              {conEnlaces && (
                <Td>
                  {cs.map((c) => (
                    <button key={c.id} className="mr-2 text-fmv-700 hover:underline" onClick={() => abrir('contrato', c.id)}>{c.codigo || c.proveedor_nombre}</button>
                  ))}
                  {eq && <button className="mr-2 text-fmv-700 hover:underline" onClick={() => abrir('equipo', eq.id)}>{eq.nombre}</button>}
                  {ob && <button className="text-fmv-700 hover:underline" onClick={() => abrir(ob.sujeto.tipo, ob.sujeto.id)}>{ob.etiqueta} · {ob.sujeto.nombre}</button>}
                  {!cs.length && !eq && !ob && <Pendiente>Sin enlazar</Pendiente>}
                </Td>
              )}
              {conBorrar && (
                <Td className="whitespace-nowrap">
                  {borrando === d.id ? (
                    <span className="text-xs text-red-700">
                      ¿Borrar ficha y PDF? <button className="font-semibold underline" onClick={() => borrar(d)}>Borrar</button>{' '}
                      <button className="underline text-gray-600" onClick={() => setBorrando(null)}>No</button>
                    </span>
                  ) : (
                    <button className="text-gray-400 hover:text-red-600" title="Borrar (solo si se subió por error)" onClick={() => setBorrando(d.id)}><Trash2 size={14} /></button>
                  )}
                </Td>
              )}
            </Fila>
          )
        })}
      </Tabla>
    </>
  )
}
