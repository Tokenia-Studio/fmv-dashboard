// ============================================
// CONTRATOS - Documentos de la vista (US-009)
// ============================================
// Cada documento se ve en la vista del contrato, equipo u obligación del que
// cuelga. Qué documentos llegan al navegador lo decide la RLS, no este filtro.

import React, { useState } from 'react'
import { Upload } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { TIPOS_DOCUMENTO } from '../../utils/contratosVista'
import { Tarjeta, Boton } from './ui'
import TablaDocumentos from './TablaDocumentos'
import FormDocumento from './FormDocumento'

export default function Documentos() {
  const { modelo, vista } = useContratos()
  const [f, setF] = useState({ q: '', rol: '', tipo: '' })
  const [subir, setSubir] = useState(false)

  const vistaDe = (d) => {
    if (d.equipo_id) return 'compras_fabrica'
    if (d.obligacion_id) return modelo.obligacion(d.obligacion_id)?.vista
    const cs = d.contratosIds.map((id) => modelo.contrato(id)).filter(Boolean)
    if (cs.length) return cs.some((c) => c.vista === vista) ? vista : cs[0].vista
    return vista // sin enlazar: lo ve quien lo subió; se enseña para que lo enlace
  }
  const base = modelo.documentos.filter((d) => vistaDe(d) === vista)
  const filas = base.filter(
    (d) =>
      (!f.rol || d.rol === f.rol) &&
      (!f.tipo || d.tipo === f.tipo) &&
      (!f.q || [d.nombre_original, d.ruta, d.descripcion, d.referencia].join(' ').toLowerCase().includes(f.q.toLowerCase())),
  )
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Documentos" nota={`${filas.length} de ${base.length}`} acciones={<Boton variante="claro" onClick={() => setSubir(true)}><Upload size={14} /> Subir PDF</Boton>}>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
          <input className="input text-sm !w-64" placeholder="Buscar…" value={f.q} onChange={cambia('q')} />
          <select className="input text-sm !w-auto" value={f.rol} onChange={cambia('rol')}>
            <option value="">Origen y cierre</option>
            <option value="origen">Documento de origen</option>
            <option value="cierre">Documento de cierre</option>
            <option value="otro">Otros</option>
          </select>
          <select className="input text-sm !w-auto" value={f.tipo} onChange={cambia('tipo')}>
            <option value="">Todos los tipos</option>
            {TIPOS_DOCUMENTO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </div>
        <TablaDocumentos docs={filas} conBorrar vacio={base.length ? 'Ningún documento con esos filtros.' : 'Todavía no hay documentos. Los 155 PDF del inventario se suben con la carga inicial.'} />
      </Tarjeta>
      <p className="text-xs text-gray-500">Los PDF se guardan en un almacenamiento privado y se abren con un enlace que caduca a los 60 segundos.</p>
      {subir && <FormDocumento destino={{}} onClose={() => setSubir(false)} />}
    </div>
  )
}
