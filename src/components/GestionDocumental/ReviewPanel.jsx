// ============================================
// REVIEW PANEL - Revisión agrupada por proveedor
// con drag & drop de albaranes, preview de imagen
// y asociación inteligente factura↔albarán
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { documental } from '../../lib/supabase'
import { PDFDocument } from 'pdf-lib'

// ---- Helpers ----

function initializeFromBackend(docs) {
  /**
   * Usa factura_asociada_id del backend como primera fuente de verdad.
   * Fallback: match por proveedor si el backend no asoció.
   */
  const facturas = docs.filter(d => d.tipo === 'factura')
  const albaranes = docs.filter(d => d.tipo === 'albaran')
  const desconocidos = docs.filter(d => d.tipo === 'desconocido')

  const assignments = {}
  facturas.forEach(f => { assignments[f.id] = [] })

  const orphans = []

  albaranes.forEach(a => {
    // 1. Usar asociación del backend (factura_asociada_id)
    if (a.factura_asociada_id && assignments[a.factura_asociada_id] !== undefined) {
      assignments[a.factura_asociada_id].push(a.id)
      return
    }

    // 2. Fallback: match por proveedor
    const match = facturas.find(f =>
      f.proveedor_nombre && a.proveedor_nombre &&
      f.proveedor_nombre.toLowerCase().trim() === a.proveedor_nombre.toLowerCase().trim()
    )
    if (match) {
      assignments[match.id].push(a.id)
    } else {
      orphans.push(a.id)
    }
  })

  // Desconocidos van a huérfanos
  desconocidos.forEach(d => orphans.push(d.id))

  return { assignments, orphans }
}

function docLabel(doc) {
  const num = doc.numero_factura || doc.numero_albaran || 'S/N'
  const tipo = doc.tipo === 'factura' ? 'FAC' : doc.tipo === 'albaran' ? 'ALB' : 'DOC'
  return `${tipo} ${num}`
}

function confidenceBadge(confianza) {
  const pct = Math.round((confianza || 0) * 100)
  const color = pct >= 80 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
  return <span className={`text-xs px-1.5 py-0.5 rounded ${color}`}>{pct}%</span>
}

// ---- Preview Modal ----

function PreviewModal({ doc, batchId, onClose }) {
  if (!doc) return null

  const pages = doc.paginas || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-800">{docLabel(doc)}</h3>
            <p className="text-sm text-gray-500">
              {doc.proveedor_nombre || 'Sin proveedor'} · {pages.length} página{pages.length !== 1 ? 's' : ''}
              {doc.fecha_documento && ` · ${doc.fecha_documento}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {confidenceBadge(doc.confianza)}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        {/* Datos extraídos */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-4 text-sm">
          {doc.numero_factura && (
            <div><span className="text-gray-500">Factura:</span> <span className="font-medium">{doc.numero_factura}</span></div>
          )}
          {doc.numero_albaran && (
            <div><span className="text-gray-500">Albarán:</span> <span className="font-medium">{doc.numero_albaran}</span></div>
          )}
          {doc.proveedor_codigo && (
            <div><span className="text-gray-500">Código:</span> <span className="font-medium">{doc.proveedor_codigo}</span></div>
          )}
          {doc.proveedor_nif && (
            <div><span className="text-gray-500">NIF:</span> <span className="font-medium">{doc.proveedor_nif}</span></div>
          )}
        </div>

        {/* Imágenes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100">
          {pages.map((pageNum, i) => (
            <div key={pageNum} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-500 border-b">
                Página {pageNum}
              </div>
              <img
                src={documental.getPreviewUrl(batchId, pageNum)}
                alt={`Página ${pageNum}`}
                className="w-full"
                loading="lazy"
              />
            </div>
          ))}
          {pages.length === 0 && (
            <p className="text-center text-gray-400 py-8">Sin páginas de preview disponibles</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- Componentes internos ----

function ConfirmBadge({ confirmed, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
        confirmed
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
      }`}
    >
      {confirmed ? 'Confirmado' : 'Pendiente'}
    </button>
  )
}

function AlbaranItem({ doc, batchId, onDragStart, onRemove, onPreview }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', doc.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(doc.id)
      }}
      className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200
                 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all group"
    >
      <span className="text-sm">📋</span>
      <button
        onClick={(e) => { e.stopPropagation(); onPreview(doc) }}
        className="text-sm text-gray-700 flex-1 truncate text-left hover:text-blue-600 hover:underline"
        title="Ver preview"
      >
        {doc.numero_albaran || 'S/N'}
        {doc.proveedor_nombre && <span className="text-gray-400 ml-1.5 text-xs">({doc.proveedor_nombre})</span>}
      </button>
      {confidenceBadge(doc.confianza)}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(doc.id) }}
        title="Marcar como huérfano"
        className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity"
      >
        ✕
      </button>
    </div>
  )
}

function FacturaGroup({ grupo, batchId, onDrop, onToggleConfirm, onRemoveAlbaran, onPreview, dragOver, setDragOver }) {
  const { factura, albaranes, confirmed } = grupo
  const [expanded, setExpanded] = useState(true)
  const dropRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(factura.id)
  }

  const handleDragLeave = () => {
    setDragOver(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const albaranId = e.dataTransfer.getData('text/plain')
    if (albaranId) onDrop(albaranId, factura.id)
    setDragOver(null)
  }

  const isDragTarget = dragOver === factura.id

  // Thumbnail de la primera página de la factura
  const firstPage = factura.paginas?.[0]
  const thumbUrl = firstPage ? documental.getPreviewUrl(batchId, firstPage) : null

  return (
    <div
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-lg border transition-all ${
        isDragTarget
          ? 'border-blue-400 bg-blue-50 shadow-md'
          : confirmed
            ? 'border-green-200 bg-green-50/30'
            : 'border-gray-200 bg-white'
      }`}
    >
      {/* Factura header con thumbnail */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Thumbnail */}
        {thumbUrl && (
          <button
            onClick={() => onPreview(factura)}
            className="flex-shrink-0 w-16 h-20 rounded border border-gray-200 overflow-hidden hover:border-blue-400 hover:shadow transition-all bg-white"
            title="Ver factura"
          >
            <img src={thumbUrl} alt="Preview" className="w-full h-full object-cover object-top" loading="lazy" />
          </button>
        )}

        {/* Info */}
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex-1 cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
            <span className="text-lg">🧾</span>
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(factura) }}
              className="font-medium text-gray-800 truncate hover:text-blue-600 hover:underline"
            >
              Factura {factura.numero_factura || 'S/N'}
            </button>
            {confidenceBadge(factura.confianza)}
          </div>
          <div className="text-xs text-gray-500 mt-1 ml-7">
            {factura.proveedor_nombre || 'Sin proveedor'}
            {factura.fecha_documento && ` · ${factura.fecha_documento}`}
            {' · '}{factura.paginas?.length || 0} pág.
            {' · '}{albaranes.length} albarán{albaranes.length !== 1 ? 'es' : ''}
          </div>
        </div>

        <ConfirmBadge confirmed={confirmed} onClick={(e) => { e.stopPropagation?.(); onToggleConfirm(factura.id) }} />
      </div>

      {/* Albaranes */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {albaranes.length === 0 ? (
            <p className="text-xs text-gray-400 italic pl-7">
              Sin albaranes vinculados. Arrastra albaranes aquí.
            </p>
          ) : (
            albaranes.map(a => (
              <div key={a.id} className="ml-6">
                <AlbaranItem
                  doc={a}
                  batchId={batchId}
                  onDragStart={() => {}}
                  onRemove={onRemoveAlbaran}
                  onPreview={onPreview}
                />
              </div>
            ))
          )}
          {/* Drop zone visual when dragging */}
          {isDragTarget && (
            <div className="ml-6 px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg text-center">
              <span className="text-xs text-blue-500">Soltar albarán aquí</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProveedorAccordion({ nombre, codigo, facturas, batchId, onDrop, onToggleConfirm, onRemoveAlbaran, onPreview, dragOver, setDragOver }) {
  const [expanded, setExpanded] = useState(true)
  const allConfirmed = facturas.every(f => f.confirmed)
  const totalAlb = facturas.reduce((sum, f) => sum + f.albaranes.length, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
      >
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-gray-800">{nombre}</span>
          {codigo && <span className="text-xs text-gray-400 ml-2">({codigo})</span>}
        </div>
        <span className="text-xs text-gray-500">
          {facturas.length} fac. · {totalAlb} alb.
        </span>
        {allConfirmed && <span className="text-green-500 text-sm font-bold">✓</span>}
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {facturas.map(g => (
            <FacturaGroup
              key={g.factura.id}
              grupo={g}
              batchId={batchId}
              onDrop={onDrop}
              onToggleConfirm={onToggleConfirm}
              onRemoveAlbaran={onRemoveAlbaran}
              onPreview={onPreview}
              dragOver={dragOver}
              setDragOver={setDragOver}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HuerfanosSection({ docs, batchId, onDragStart, onPreview }) {
  if (docs.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-amber-100 bg-amber-50/50">
        <h3 className="font-semibold text-amber-800">
          Documentos sin factura asociada ({docs.length})
        </h3>
        <p className="text-xs text-amber-600 mt-1">Arrastra estos documentos a la factura correspondiente</p>
      </div>
      <div className="p-4 space-y-2">
        {docs.map(d => (
          <AlbaranItem
            key={d.id}
            doc={d}
            batchId={batchId}
            onDragStart={onDragStart}
            onRemove={() => {}}
            onPreview={onPreview}
          />
        ))}
      </div>
    </div>
  )
}

// ---- Componente principal ----

export default function ReviewPanel({ batchId, onBack }) {
  const [batch, setBatch] = useState(null)
  const [documents, setDocuments] = useState([])
  const [assignments, setAssignments] = useState({}) // { facturaId: [albaranId, ...] }
  const [huerfanos, setHuerfanos] = useState([])
  const [confirmed, setConfirmed] = useState({}) // { facturaId: bool }
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null) // doc para modal de preview

  useEffect(() => {
    loadBatch()
  }, [batchId])

  const loadBatch = async () => {
    setLoading(true)
    const { data, error } = await documental.getBatch(batchId)
    if (data) {
      setBatch(data)
      const docs = data.doc_documents || []
      setDocuments(docs)
      const { assignments: a, orphans } = initializeFromBackend(docs)
      setAssignments(a)
      setHuerfanos(orphans)
      setConfirmed({})
    }
    setLoading(false)
  }

  // Mover albarán a una factura
  const handleDrop = useCallback((albaranId, targetFacturaId) => {
    setAssignments(prev => {
      const next = { ...prev }
      // Quitar de su factura actual
      Object.keys(next).forEach(fId => {
        next[fId] = next[fId].filter(id => id !== albaranId)
      })
      // Añadir a la nueva factura
      next[targetFacturaId] = [...(next[targetFacturaId] || []), albaranId]
      return next
    })
    // Quitar de huérfanos si estaba
    setHuerfanos(prev => prev.filter(id => id !== albaranId))
    setDragOver(null)
  }, [])

  // Marcar como huérfano
  const handleRemoveAlbaran = useCallback((albaranId) => {
    setAssignments(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(fId => {
        next[fId] = next[fId].filter(id => id !== albaranId)
      })
      return next
    })
    setHuerfanos(prev => prev.includes(albaranId) ? prev : [...prev, albaranId])
  }, [])

  // Toggle confirmación de un grupo
  const handleToggleConfirm = useCallback((facturaId) => {
    setConfirmed(prev => ({ ...prev, [facturaId]: !prev[facturaId] }))
  }, [])

  // Confirmar todos
  const handleConfirmAll = () => {
    const all = {}
    Object.keys(assignments).forEach(fId => { all[fId] = true })
    setConfirmed(all)
  }

  // Verificar si todo está confirmado
  const allConfirmed = Object.keys(assignments).length > 0 &&
    Object.keys(assignments).every(fId => confirmed[fId])

  // Descargar PDFs agrupados
  const handleDownload = async () => {
    if (!allConfirmed) {
      alert('Debes confirmar todos los grupos antes de descargar.')
      return
    }

    setDownloading(true)
    try {
      const facturas = documents.filter(d => d.tipo === 'factura')

      for (const factura of facturas) {
        const albaranIds = assignments[factura.id] || []
        const albaranDocs = albaranIds.map(id => documents.find(d => d.id === id)).filter(Boolean)

        // Recopilar todas las páginas en orden: factura + albaranes
        const allPages = [
          ...(factura.paginas || []),
          ...albaranDocs.flatMap(a => a.paginas || [])
        ]

        if (allPages.length === 0) continue

        // Crear PDF desde las preview PNGs
        const pdfDoc = await PDFDocument.create()

        for (const pageNum of allPages) {
          try {
            const url = documental.getPreviewUrl(batchId, pageNum)
            const resp = await fetch(url)
            if (!resp.ok) continue
            const imgBytes = await resp.arrayBuffer()

            const img = await pdfDoc.embedPng(imgBytes).catch(() => null)
            if (!img) continue

            const page = pdfDoc.addPage([img.width, img.height])
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
          } catch (err) {
            console.warn(`Error cargando página ${pageNum}:`, err)
          }
        }

        if (pdfDoc.getPageCount() === 0) continue

        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)

        // Nombre: [Proveedor]_[NºFactura]_[Fecha].pdf
        const prov = (factura.proveedor_codigo || factura.proveedor_nombre || 'PROV').replace(/[^a-zA-Z0-9]/g, '_')
        const num = (factura.numero_factura || 'SN').replace(/[^a-zA-Z0-9]/g, '_')
        const fecha = (factura.fecha_documento || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
        const filename = `${prov}_${num}_${fecha}.pdf`

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error generando PDFs:', err)
      alert('Error al generar los PDFs: ' + err.message)
    }
    setDownloading(false)
  }

  // Confirmar y archivar
  const handleArchive = async () => {
    if (!allConfirmed) {
      alert('Debes confirmar todos los grupos antes de archivar.')
      return
    }
    if (!confirm('¿Confirmar archivado? Los documentos se marcarán como archivados.')) return

    setArchiving(true)
    try {
      // Guardar reasignaciones en Supabase
      for (const [facturaId, albaranIds] of Object.entries(assignments)) {
        const factura = documents.find(d => d.id === facturaId)
        if (!factura) continue

        for (const albId of albaranIds) {
          const alb = documents.find(d => d.id === albId)
          if (!alb) continue
          if (alb.proveedor_nombre !== factura.proveedor_nombre) {
            await documental.updateDocument(albId, {
              proveedor_nombre: factura.proveedor_nombre,
              proveedor_codigo: factura.proveedor_codigo
            })
          }
        }
      }

      const { error } = await documental.archiveBatch(batchId)
      if (error) throw error
      onBack()
    } catch (err) {
      alert('Error al archivar: ' + err.message)
    }
    setArchiving(false)
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-500">Cargando documentos para revisión...</p>
      </div>
    )
  }

  if (!batch) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Lote no encontrado</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Volver</button>
      </div>
    )
  }

  // Construir datos para render
  const facturas = documents.filter(d => d.tipo === 'factura')
  const docById = {}
  documents.forEach(d => { docById[d.id] = d })

  // Agrupar por proveedor para el render
  const proveedorMap = {}
  facturas.forEach(f => {
    const key = f.proveedor_nombre || 'Sin proveedor'
    if (!proveedorMap[key]) {
      proveedorMap[key] = { proveedor: key, codigo: f.proveedor_codigo || '', facturas: [] }
    }
    proveedorMap[key].facturas.push({
      factura: f,
      albaranes: (assignments[f.id] || []).map(id => docById[id]).filter(Boolean),
      confirmed: !!confirmed[f.id]
    })
  })

  const huerfanoDocs = huerfanos.map(id => docById[id]).filter(Boolean)
  const totalGroups = facturas.length
  const confirmedCount = Object.values(confirmed).filter(Boolean).length
  const totalAlbaranes = documents.filter(d => d.tipo === 'albaran').length
  const asociados = totalAlbaranes - huerfanoDocs.filter(d => d.tipo === 'albaran').length

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700 mb-1 flex items-center gap-1"
          >
            ← Volver a lotes
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            Revisión: {batch.fichero_origen}
          </h2>
          <p className="text-sm text-gray-500">
            {facturas.length} factura{facturas.length !== 1 ? 's' : ''} ·
            {' '}{totalAlbaranes} albarán{totalAlbaranes !== 1 ? 'es' : ''} ({asociados} asociados) ·
            {' '}{documents.length} docs totales ·
            <span className={confirmedCount === totalGroups ? ' text-green-600 font-medium' : ' text-amber-600'}>
              {' '}{confirmedCount}/{totalGroups} confirmados
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!allConfirmed && (
            <button
              onClick={handleConfirmAll}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              Confirmar todos
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!allConfirmed || downloading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
          >
            {downloading ? 'Generando PDFs...' : 'Descargar PDFs'}
          </button>
          <button
            onClick={handleArchive}
            disabled={!allConfirmed || archiving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
          >
            {archiving ? 'Archivando...' : 'Confirmar y archivar'}
          </button>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-sm text-blue-700">
          Haz <strong>click</strong> en una factura o albarán para ver la imagen.
          <strong> Arrastra</strong> los albaranes entre facturas para corregir la asignación.
          Pulsa <strong>✕</strong> en un albarán para marcarlo como huérfano.
        </p>
      </div>

      {/* Grupos por proveedor */}
      {Object.values(proveedorMap).map(({ proveedor, codigo, facturas: facts }) => (
        <ProveedorAccordion
          key={proveedor}
          nombre={proveedor}
          codigo={codigo}
          facturas={facts}
          batchId={batchId}
          onDrop={handleDrop}
          onToggleConfirm={handleToggleConfirm}
          onRemoveAlbaran={handleRemoveAlbaran}
          onPreview={setPreviewDoc}
          dragOver={dragOver}
          setDragOver={setDragOver}
        />
      ))}

      {/* Huérfanos */}
      <HuerfanosSection
        docs={huerfanoDocs}
        batchId={batchId}
        onDragStart={setDraggingId}
        onPreview={setPreviewDoc}
      />

      {/* Sin documentos */}
      {facturas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">No hay facturas en este lote</p>
        </div>
      )}

      {/* Modal de preview */}
      {previewDoc && (
        <PreviewModal
          doc={previewDoc}
          batchId={batchId}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  )
}
