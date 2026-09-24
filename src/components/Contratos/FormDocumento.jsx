// ============================================
// CONTRATOS - Subir un PDF y enlazarlo (US-009)
// ============================================
// El nombre del fichero lo compone la app con la convención del 22/09/2026
// (AAAA-MM-DD_Proveedor_Tipo_Objeto[_Ref].pdf): la persona no lo teclea.
// PENDIENTE DE CARLOS: confirmar o tachar que la app componga el nombre (US-009).
// Si se tacha, basta con guardar con el nombre original: el resto no cambia.

import React, { useMemo, useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_DOCUMENTO, componerNombreFichero, proveedorCortoPropuesto, slugBloque, sumaEnTotales } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, EntradaFecha, PieFormulario, useCampos, useGuardar } from './ui'

export default function FormDocumento({ destino = {}, onClose }) {
  const { modelo, recargar, puedeEditarContrato } = useContratos()
  const { contrato, equipo, obligacion } = destino
  const libre = !contrato && !equipo && !obligacion

  const contratoBase = contrato || (obligacion?.contrato_id ? modelo.contrato(obligacion.contrato_id) : null)
  const proveedorBase = contratoBase?.proveedor_nombre || obligacion?.proveedor_nombre || ''
  const tipoInicial = obligacion ? (obligacion.tipo === 'Calibración' ? 'certificado' : 'parte_visita') : contrato ? 'contrato' : 'otro'

  const { f, campo, poner } = useCampos({
    tipo: tipoInicial,
    rol: TIPOS_DOCUMENTO.find((t) => t.valor === tipoInicial).rol,
    fecha: '',
    fecha_precision: 'dia',
    referencia: contrato?.referencia || '',
    objeto: contrato?.objeto || (obligacion ? `${obligacion.tipo} ${obligacion.sujeto.nombre}` : equipo?.nombre || ''),
    proveedorCorto: contratoBase?.proveedor_corto || proveedorCortoPropuesto(proveedorBase),
    legible: true,
    contrato_id: '',
    equipo_id: '',
  })
  const [fichero, setFichero] = useState(null)
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const contratosEnlazables = modelo.contratos.filter((c) => puedeEditarContrato(c) && sumaEnTotales(c))
  const nombre = useMemo(
    () => componerNombreFichero({ fecha: f.fecha, precision: f.fecha_precision, proveedorCorto: f.proveedorCorto, tipo: f.tipo, objeto: f.objeto, referencia: f.referencia }),
    [f.fecha, f.fecha_precision, f.proveedorCorto, f.tipo, f.objeto, f.referencia],
  )

  const cambiarTipo = (e) => {
    poner('tipo', e.target.value)
    poner('rol', TIPOS_DOCUMENTO.find((t) => t.valor === e.target.value)?.rol || 'otro')
  }
  const cambiarContratoLibre = (e) => {
    poner('contrato_id', e.target.value)
    const c = modelo.contrato(Number(e.target.value))
    if (c) {
      if (!f.proveedorCorto) poner('proveedorCorto', c.proveedor_corto || proveedorCortoPropuesto(c.proveedor_nombre))
      if (!f.objeto) poner('objeto', c.objeto)
    }
  }

  const enviar = async (ev) => {
    ev.preventDefault()
    if (!fichero) return setError('Elige el PDF.')
    if (!slugBloque(f.proveedorCorto)) return setError('Falta el nombre corto del proveedor (va en el nombre del fichero).')
    if (libre && !f.contrato_id && !f.equipo_id) return setError('Enlázalo a un contrato o a un equipo: un documento suelto solo lo vería quien lo sube.')
    const contratosIds = contrato ? [contrato.id] : f.contrato_id ? [Number(f.contrato_id)] : []
    const ficha = {
      nombre_original: fichero.name,
      tipo: f.tipo,
      rol: f.rol,
      fecha: f.fecha || null,
      fecha_precision: f.fecha ? f.fecha_precision : null,
      referencia: f.referencia.trim() || null,
      descripcion: f.objeto.trim() || null,
      legible: !!f.legible,
      equipo_id: equipo?.id || (f.equipo_id ? Number(f.equipo_id) : null),
      obligacion_id: obligacion?.id || null,
    }
    const ruta = `${slugBloque(f.proveedorCorto)}/${nombre}`
    const hecho = await guardar(() => contratosDb.subirDocumento(fichero, ruta, ficha, contratosIds))
    if (hecho) onClose()
  }

  const titulo = contrato ? `${contrato.codigo || ''} ${contrato.proveedor_nombre}` : obligacion ? `${obligacion.etiqueta} · ${obligacion.sujeto.nombre}` : equipo ? equipo.nombre : ''

  return (
    <Modal titulo={`Subir documento${titulo ? ` · ${titulo.trim()}` : ''}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="PDF *" className="sm:col-span-2" ayuda="Solo PDF, hasta 20 MB. Se guarda en un almacenamiento privado.">
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFichero(e.target.files[0] || null)} className="text-sm" autoFocus />
          </Etiqueta>
          <Etiqueta texto="Tipo"><Selector opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))} value={f.tipo} onChange={cambiarTipo} /></Etiqueta>
          <Etiqueta texto="Rol" ayuda="Origen: fija condiciones. Cierre: prueba que se hizo.">
            <Selector opciones={[{ valor: 'origen', etiqueta: 'Documento de origen' }, { valor: 'cierre', etiqueta: 'Documento de cierre' }, { valor: 'otro', etiqueta: 'Otro' }]} {...campo('rol')} />
          </Etiqueta>
          <Etiqueta texto="Fecha del documento" ayuda="La de firma o emisión, no la del escaneo. Sin fecha: queda pendiente y genera tarea.">
            <EntradaFecha fecha={f.fecha} precision={f.fecha_precision} onChange={(d, p) => { poner('fecha', d || ''); poner('fecha_precision', p) }} />
          </Etiqueta>
          <Etiqueta texto="Referencia" ayuda="Nº de contrato, póliza o nº de serie."><Entrada {...campo('referencia')} /></Etiqueta>
          <Etiqueta texto="Proveedor (nombre corto)" ayuda="Sin forma jurídica ni espacios: «Talleres García, S.L.» → TalleresGarcia."><Entrada {...campo('proveedorCorto')} /></Etiqueta>
          <Etiqueta texto="Qué cubre (3-5 palabras)"><Entrada {...campo('objeto')} /></Etiqueta>
          {libre && (
            <>
              <Etiqueta texto="Contrato">
                <Selector opciones={contratosEnlazables.map((c) => ({ valor: String(c.id), etiqueta: `${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}` }))} vacio="— Ninguno —" value={f.contrato_id} onChange={cambiarContratoLibre} />
              </Etiqueta>
              <Etiqueta texto="Equipo">
                <Selector opciones={modelo.equipos.filter((e) => e.estado !== 'baja').map((e) => ({ valor: String(e.id), etiqueta: e.nombre }))} vacio="— Ninguno —" {...campo('equipo_id')} />
              </Etiqueta>
            </>
          )}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.legible} onChange={campo('legible').onChange} /> Legible (desmárcalo si el escaneo no se lee)
          </label>
          <div className="sm:col-span-2 rounded bg-gray-50 border border-gray-200 px-3 py-2 text-xs">
            <span className="text-gray-500">Se guardará como </span>
            <span className="font-mono break-all">{slugBloque(f.proveedorCorto) || '…'}/{nombre}</span>
          </div>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar="Subir" />
      </form>
    </Modal>
  )
}
