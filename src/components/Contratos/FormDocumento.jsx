// ============================================
// CONTRATOS - Subir un PDF y enlazarlo (US-009), o cambiar la ficha de uno ya subido
// ============================================
// El nombre del fichero lo compone la app con la convención del 22/09/2026
// (AAAA-MM-DD_Proveedor_Tipo_Objeto[_Ref].pdf): la persona no lo teclea.
// PENDIENTE DE CARLOS: confirmar o tachar que la app componga el nombre (US-009).
// Si se tacha, basta con guardar con el nombre original: el resto no cambia.
//
// Desde la ficha de un contrato, un documento de origen (contrato, oferta, renovación,
// póliza o factura) se puede además leer con IA para completar esa ficha (piloto del
// 05/10/2026). El PDF se guarda SIEMPRE primero; la lectura viene después y la lleva
// la ficha (`onSubido`), así que cancelarla o que falle no pierde el documento.
//
// Con `documento` se edita la ficha de uno ya subido (piloto del 20/10/2026: «Documento sin
// fecha» no tenía arreglo en la app). Fecha, tipo, rol, referencia y descripción; el PDF y su
// ruta no cambian (la base de datos no lo deja). En los dos modos, si el equipo u obligación
// tiene realizadas sin documento de cierre, el PDF se puede poner como cierre de una (F4).

import React, { useMemo, useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_DOCUMENTO, TIPO_CIERRE, componerNombreFichero, proveedorCortoPropuesto, realizadasSinCierre, slugBloque, sumaEnTotales, tipoLecturaDeDocumento } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, EntradaFecha, PieFormulario, fechaFila, useCampos, useGuardar } from './ui'

/**
 * @param documento  ficha a editar (sin él, se sube uno nuevo)
 * @param realizada  realizada sin cierre que se propone cerrar con este documento
 * @param onSubido   (documento, { fichero, leer }) → tras guardar; `leer` = la persona ha pedido leerlo con IA
 */
export default function FormDocumento({ destino = {}, documento = null, realizada = null, onClose, onSubido }) {
  const { modelo, recargar, puedeEditarContrato, lectorActivo } = useContratos()
  const editar = !!documento
  const { contrato, equipo, obligacion } = destino
  const libre = !editar && !contrato && !equipo && !obligacion

  const contratoBase = contrato || (obligacion?.contrato_id ? modelo.contrato(obligacion.contrato_id) : null)
  const proveedorBase = contratoBase?.proveedor_nombre || obligacion?.proveedor_nombre || ''
  const tipoInicial = editar ? documento.tipo : obligacion ? TIPO_CIERRE[obligacion.tipo] || 'parte_visita' : contrato ? 'contrato' : 'otro'

  // Realizadas que este documento podría cerrar: las de la obligación, o las del equipo
  const candidatas = useMemo(() => {
    const obligacionId = editar ? documento.obligacion_id : obligacion?.id
    const equipoId = editar ? documento.equipo_id : equipo?.id
    return obligacionId || equipoId ? realizadasSinCierre(modelo, obligacionId ? { obligacionId } : { equipoId }) : []
  }, [modelo, editar, documento, obligacion, equipo])

  const { f, campo, poner } = useCampos({
    tipo: tipoInicial,
    rol: editar ? documento.rol : TIPOS_DOCUMENTO.find((t) => t.valor === tipoInicial)?.rol || 'otro',
    fecha: editar ? String(documento.fecha || '').slice(0, 10) : '',
    fecha_precision: (editar && documento.fecha_precision) || 'dia',
    referencia: editar ? documento.referencia || '' : contrato?.referencia || '',
    objeto: editar ? documento.descripcion || '' : contrato?.objeto || (obligacion ? `${obligacion.tipo} ${obligacion.sujeto.nombre}` : equipo?.nombre || ''),
    proveedorCorto: contratoBase?.proveedor_corto || proveedorCortoPropuesto(proveedorBase),
    legible: editar ? documento.legible !== false : true,
    contrato_id: '',
    equipo_id: '',
    // Si se llega desde una realizada concreta, o solo hay una sin cierre en la obligación, se propone esa
    cierra: realizada ? String(realizada.id) : !editar && obligacion && candidatas.length === 1 ? String(candidatas[0].r.id) : '',
  })
  const [fichero, setFichero] = useState(null)
  const [leer, setLeer] = useState(true)
  const { guardando, error, setError, guardar } = useGuardar(recargar)
  // Solo se ofrece leer donde la lectura tiene dónde ir: la ficha de un contrato que la persona puede editar
  const sePuedeLeer = !editar && !!(onSubido && contrato && lectorActivo && puedeEditarContrato(contrato) && tipoLecturaDeDocumento(f.tipo))

  const contratosEnlazables = modelo.contratos.filter((c) => puedeEditarContrato(c) && sumaEnTotales(c))
  const nombre = useMemo(
    () => componerNombreFichero({ fecha: f.fecha, precision: f.fecha_precision, proveedorCorto: f.proveedorCorto, tipo: f.tipo, objeto: f.objeto, referencia: f.referencia }),
    [f.fecha, f.fecha_precision, f.proveedorCorto, f.tipo, f.objeto, f.referencia],
  )
  const cierra = f.cierra ? candidatas.find((x) => String(x.r.id) === f.cierra) : null

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
  const cambiarCierra = (e) => {
    poner('cierra', e.target.value)
    const x = candidatas.find((c) => String(c.r.id) === e.target.value)
    if (!x) return
    // Un documento de cierre lleva el tipo de su obligación y, si aún no tiene fecha, la de la realizada
    poner('rol', 'cierre')
    if (!TIPOS_DOCUMENTO.some((t) => t.valor === f.tipo && t.rol === 'cierre')) poner('tipo', TIPO_CIERRE[x.o.tipo] || 'parte_visita')
    if (!f.fecha) { poner('fecha', String(x.r.fecha).slice(0, 10)); poner('fecha_precision', 'dia') }
  }

  const enviar = async (ev) => {
    ev.preventDefault()
    if (!editar && !fichero) return setError('Elige el PDF.')
    if (!editar && !slugBloque(f.proveedorCorto)) return setError('Falta el nombre corto del proveedor (va en el nombre del fichero).')
    if (libre && !f.contrato_id && !f.equipo_id) return setError('Enlázalo a un contrato o a un equipo: un documento suelto solo lo vería quien lo sube.')
    if (cierra && f.rol !== 'cierre') return setError('Para cerrar una realizada, el documento tiene que ser «Documento de cierre».')
    const ficha = {
      tipo: f.tipo,
      rol: f.rol,
      fecha: f.fecha || null,
      fecha_precision: f.fecha ? f.fecha_precision : null,
      referencia: f.referencia.trim() || null,
      descripcion: f.objeto.trim() || null,
      legible: !!f.legible,
      // El cierre de una realizada cuelga de su obligación
      ...(cierra ? { obligacion_id: cierra.o.id } : {}),
    }
    const hecho = await guardar(async () => {
      let doc
      if (editar) {
        doc = await contratosDb.actualizarDocumento(documento.id, ficha)
      } else {
        const contratosIds = contrato ? [contrato.id] : f.contrato_id ? [Number(f.contrato_id)] : []
        doc = await contratosDb.subirDocumento(fichero, `${slugBloque(f.proveedorCorto)}/${nombre}`, {
          nombre_original: fichero.name,
          equipo_id: equipo?.id || (f.equipo_id ? Number(f.equipo_id) : null),
          obligacion_id: obligacion?.id || null,
          ...ficha,
        }, contratosIds)
      }
      if (cierra) await contratosDb.ponerCierre(cierra.r.id, doc.id)
      return doc
    })
    if (!hecho) return
    onClose()
    onSubido?.(hecho, { fichero, leer: sePuedeLeer && leer })
  }

  const titulo = editar
    ? documento.nombre_original
    : contrato ? `${contrato.codigo || ''} ${contrato.proveedor_nombre}` : obligacion ? `${obligacion.etiqueta} · ${obligacion.sujeto.nombre}` : equipo ? equipo.nombre : ''

  return (
    <Modal titulo={`${editar ? 'Ficha del documento' : 'Subir documento'}${titulo ? ` · ${titulo.trim()}` : ''}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!editar && (
            <Etiqueta texto="PDF *" className="sm:col-span-2" ayuda="Solo PDF, hasta 20 MB. Se guarda en un almacenamiento privado.">
              <input type="file" accept="application/pdf,.pdf" onChange={(e) => setFichero(e.target.files[0] || null)} className="text-sm" autoFocus />
            </Etiqueta>
          )}
          <Etiqueta texto="Tipo"><Selector opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t.valor, etiqueta: t.etiqueta }))} value={f.tipo} onChange={cambiarTipo} /></Etiqueta>
          <Etiqueta texto="Rol" ayuda="Origen: fija condiciones. Cierre: prueba que se hizo.">
            <Selector opciones={[{ valor: 'origen', etiqueta: 'Documento de origen' }, { valor: 'cierre', etiqueta: 'Documento de cierre' }, { valor: 'otro', etiqueta: 'Otro' }]} {...campo('rol')} />
          </Etiqueta>
          <Etiqueta texto="Fecha del documento" ayuda="La de firma o emisión, no la del escaneo. Sin fecha: queda pendiente y genera tarea.">
            <EntradaFecha fecha={f.fecha} precision={f.fecha_precision} onChange={(d, p) => { poner('fecha', d || ''); poner('fecha_precision', p) }} />
          </Etiqueta>
          <Etiqueta texto="Referencia" ayuda="Nº de contrato, póliza o nº de serie."><Entrada {...campo('referencia')} /></Etiqueta>
          {!editar && <Etiqueta texto="Proveedor (nombre corto)" ayuda="Sin forma jurídica ni espacios: «Talleres García, S.L.» → TalleresGarcia."><Entrada {...campo('proveedorCorto')} /></Etiqueta>}
          <Etiqueta texto={editar ? 'Descripción' : 'Qué cubre (3-5 palabras)'} className={editar ? 'sm:col-span-2' : ''}><Entrada {...campo('objeto')} /></Etiqueta>
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
          {candidatas.length > 0 && (
            <Etiqueta
              texto="¿Es el documento de cierre de una realizada ya registrada?"
              className="sm:col-span-2"
              ayuda="Si se registró sin el PDF, aquí se le pone: la realizada queda cerrada y su tarea «falta documento de cierre» desaparece."
            >
              <Selector
                opciones={candidatas.map(({ r, o }) => ({ valor: String(r.id), etiqueta: `${fechaFila(r.fecha, 'dia')} · ${o.etiqueta}${o.sujeto?.nombre ? ` · ${o.sujeto.nombre}` : ''}${r.resultado ? ` · ${r.resultado}` : ''}` }))}
                vacio="— No, ninguna —"
                value={f.cierra}
                onChange={cambiarCierra}
              />
            </Etiqueta>
          )}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.legible} onChange={campo('legible').onChange} /> Legible (desmárcalo si el escaneo no se lee)
          </label>
          {sePuedeLeer && (
            <label className="sm:col-span-2 flex items-start gap-2 rounded border border-fmv-200 bg-fmv-50 px-3 py-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={leer} onChange={(e) => setLeer(e.target.checked)} />
              <span>
                Leer el PDF con IA y proponer los datos de este contrato
                <span className="block text-xs text-gray-500">
                  El PDF se guarda primero. Después la app lo lee (se envía a la IA de Anthropic, que no lo usa para entrenar modelos) y te enseña qué rellenaría y qué no coincide con la ficha: no cambia nada hasta que lo confirmas.
                </span>
              </span>
            </label>
          )}
          <div className="sm:col-span-2 rounded bg-gray-50 border border-gray-200 px-3 py-2 text-xs">
            {editar ? (
              <><span className="text-gray-500">PDF guardado (no cambia): </span><span className="font-mono break-all">{documento.ruta}</span></>
            ) : (
              <><span className="text-gray-500">Se guardará como </span><span className="font-mono break-all">{slugBloque(f.proveedorCorto) || '…'}/{nombre}</span></>
            )}
          </div>
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} textoGuardar={editar ? 'Guardar' : sePuedeLeer && leer ? 'Subir y leer' : 'Subir'} />
      </form>
    </Modal>
  )
}
