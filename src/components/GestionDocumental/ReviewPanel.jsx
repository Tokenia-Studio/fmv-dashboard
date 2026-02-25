// ============================================
// REVIEW PANEL - Vista compacta con edicion inline
// Drag & drop con auto-scroll
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { documental } from '../../lib/supabase'
import { PDFDocument } from 'pdf-lib'

// ---- Helpers ----

function initializeFromBackend(docs) {
  const facturas = docs.filter(d => d.tipo === 'factura')
  const albaranes = docs.filter(d => d.tipo === 'albaran')
  const desconocidos = docs.filter(d => d.tipo === 'desconocido')

  const assignments = {}
  facturas.forEach(f => { assignments[f.id] = [] })

  const orphans = []

  albaranes.forEach(a => {
    if (a.factura_asociada_id && assignments[a.factura_asociada_id] !== undefined) {
      assignments[a.factura_asociada_id].push(a.id)
      return
    }
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

  desconocidos.forEach(d => orphans.push(d.id))
  return { assignments, orphans }
}

// ---- Auto-scroll durante drag ----

function useAutoScroll() {
  const scrollRef = useRef(null)
  const rafRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    const ZONE = 80 // px desde el borde
    const SPEED = 15
    const y = e.clientY
    const h = window.innerHeight

    if (y < ZONE) {
      window.scrollBy(0, -SPEED)
    } else if (y > h - ZONE) {
      window.scrollBy(0, SPEED)
    }
  }, [])

  return { handleDragOver }
}

// ---- Edicion inline de un documento ----

function EditRow({ doc, onSave, onCancel }) {
  const [data, setData] = useState({
    tipo: doc.tipo || 'factura',
    proveedor_nombre: doc.proveedor_nombre || '',
    proveedor_codigo: doc.proveedor_codigo || '',
    numero_factura: doc.numero_factura || '',
    numero_albaran: doc.numero_albaran || '',
    fecha_documento: doc.fecha_documento || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await documental.updateDocument(doc.id, { ...data, estado: 'corregido' })
      onSave(doc.id, data)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <select value={data.tipo} onChange={e => setData({ ...data, tipo: e.target.value })}
          className="px-2 py-1 border rounded text-xs">
          <option value="factura">Factura</option>
          <option value="albaran">Albaran</option>
          <option value="desconocido">Desconocido</option>
        </select>
        <input type="text" value={data.proveedor_nombre}
          onChange={e => setData({ ...data, proveedor_nombre: e.target.value })}
          className="px-2 py-1 border rounded text-xs" placeholder="Proveedor" />
        <input type="text" value={data.proveedor_codigo}
          onChange={e => setData({ ...data, proveedor_codigo: e.target.value })}
          className="px-2 py-1 border rounded text-xs" placeholder="Codigo" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input type="text" value={data.numero_factura}
          onChange={e => setData({ ...data, numero_factura: e.target.value })}
          className="px-2 py-1 border rounded text-xs" placeholder="N. Factura" />
        <input type="text" value={data.numero_albaran}
          onChange={e => setData({ ...data, numero_albaran: e.target.value })}
          className="px-2 py-1 border rounded text-xs" placeholder="N. Albaran" />
        <input type="date" value={data.fecha_documento}
          onChange={e => setData({ ...data, fecha_documento: e.target.value })}
          className="px-2 py-1 border rounded text-xs" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
        <button onClick={handleSave} disabled={saving}
          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {saving ? '...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ---- Componentes compactos ----

function AlbaranRow({ doc, onDragStart, onRemove, onEdit }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', doc.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(doc.id)
      }}
      className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 rounded border border-blue-100
                 cursor-grab active:cursor-grabbing hover:bg-blue-100 transition-colors group text-xs"
    >
      <span>📋</span>
      <span className="text-gray-700 flex-1 truncate">
        ALB {doc.numero_albaran || 'S/N'}
      </span>
      <span className="text-gray-400 truncate max-w-[120px]">{doc.proveedor_nombre || '-'}</span>
      <button onClick={(e) => { e.stopPropagation(); onEdit(doc) }}
        className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 transition-opacity"
        title="Editar">✎</button>
      <button onClick={(e) => { e.stopPropagation(); onRemove(doc.id) }}
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
        title="Desasociar">✕</button>
    </div>
  )
}

function FacturaBlock({ grupo, onDrop, onToggleConfirm, onRemoveAlbaran, onEditDoc, dragOver, setDragOver }) {
  const { factura, albaranes, confirmed } = grupo

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(factura.id)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    const albaranId = e.dataTransfer.getData('text/plain')
    if (albaranId) onDrop(albaranId, factura.id)
    setDragOver(null)
  }

  const isDragTarget = dragOver === factura.id
  const totalPags = (factura.paginas?.length || 0) + albaranes.reduce((s, a) => s + (a.paginas?.length || 0), 0)

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(null)}
      onDrop={handleDrop}
      className={`rounded border transition-all ${
        isDragTarget ? 'border-blue-400 bg-blue-50/50' :
        confirmed ? 'border-green-200 bg-green-50/20' : 'border-gray-200'
      }`}
    >
      {/* Factura row */}
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span>🧾</span>
        <span className="font-medium text-gray-800">
          FAC {factura.numero_factura || 'S/N'}
        </span>
        <span className="text-gray-400 text-xs truncate max-w-[150px]">
          {factura.proveedor_nombre || 'Sin proveedor'}
        </span>
        {factura.fecha_documento && <span className="text-gray-400 text-xs">{factura.fecha_documento}</span>}
        <span className="text-gray-400 text-xs">{factura.paginas?.length || 0}p</span>
        <span className="text-gray-400 text-xs">{albaranes.length}alb</span>
        <div className="flex-1" />
        <button onClick={() => onEditDoc(factura)}
          className="text-xs text-blue-500 hover:text-blue-700" title="Editar">✎</button>
        <button
          onClick={() => onToggleConfirm(factura.id)}
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-amber-100'
          }`}
        >
          {confirmed ? '✓' : '○'}
        </button>
      </div>

      {/* Albaranes */}
      {albaranes.length > 0 && (
        <div className="px-3 pb-2 pl-8 space-y-1">
          {albaranes.map(a => (
            <AlbaranRow key={a.id} doc={a} onDragStart={() => {}} onRemove={onRemoveAlbaran} onEdit={onEditDoc} />
          ))}
        </div>
      )}

      {/* Drop zone */}
      {isDragTarget && (
        <div className="mx-3 mb-2 ml-8 px-2 py-1.5 border-2 border-dashed border-blue-300 rounded text-center">
          <span className="text-xs text-blue-500">Soltar aqui</span>
        </div>
      )}
    </div>
  )
}

function ProveedorSection({ nombre, codigo, facturas, onDrop, onToggleConfirm, onRemoveAlbaran, onEditDoc, dragOver, setDragOver }) {
  const allConfirmed = facturas.every(f => f.confirmed)
  const totalAlb = facturas.reduce((sum, f) => sum + f.albaranes.length, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      {/* Proveedor header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/50">
        <span className="font-semibold text-gray-800 text-sm">{nombre}</span>
        {codigo && <span className="text-xs text-gray-400">({codigo})</span>}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{facturas.length}f · {totalAlb}a</span>
        {allConfirmed && <span className="text-green-500 text-sm font-bold">✓</span>}
      </div>

      <div className="p-2 space-y-1.5">
        {facturas.map(g => (
          <FacturaBlock
            key={g.factura.id}
            grupo={g}
            onDrop={onDrop}
            onToggleConfirm={onToggleConfirm}
            onRemoveAlbaran={onRemoveAlbaran}
            onEditDoc={onEditDoc}
            dragOver={dragOver}
            setDragOver={setDragOver}
          />
        ))}
      </div>
    </div>
  )
}

function HuerfanosSection({ docs, onDragStart, onRemove, onEditDoc }) {
  if (docs.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-amber-200">
      <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/50">
        <span className="font-semibold text-amber-800 text-sm">Sin asociar ({docs.length})</span>
        <span className="text-xs text-amber-600 ml-2">Arrastra a una factura</span>
      </div>
      <div className="p-2 space-y-1">
        {docs.map(d => (
          <AlbaranRow key={d.id} doc={d} onDragStart={onDragStart} onRemove={() => {}} onEdit={onEditDoc} />
        ))}
      </div>
    </div>
  )
}

// ---- Componente principal ----

export default function ReviewPanel({ batchId, onBack }) {
  const [batch, setBatch] = useState(null)
  const [documents, setDocuments] = useState([])
  const [assignments, setAssignments] = useState({})
  const [huerfanos, setHuerfanos] = useState([])
  const [confirmed, setConfirmed] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [editingDoc, setEditingDoc] = useState(null)
  const { handleDragOver: autoScroll } = useAutoScroll()

  useEffect(() => { loadBatch() }, [batchId])

  // Auto-scroll global durante drag
  useEffect(() => {
    const handler = (e) => {
      if (draggingId) autoScroll(e)
    }
    window.addEventListener('dragover', handler)
    return () => window.removeEventListener('dragover', handler)
  }, [draggingId, autoScroll])

  const loadBatch = async () => {
    setLoading(true)
    const { data } = await documental.getBatch(batchId)
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

  const handleDrop = useCallback((albaranId, targetFacturaId) => {
    setAssignments(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(fId => { next[fId] = next[fId].filter(id => id !== albaranId) })
      next[targetFacturaId] = [...(next[targetFacturaId] || []), albaranId]
      return next
    })
    setHuerfanos(prev => prev.filter(id => id !== albaranId))
    setDragOver(null)
  }, [])

  const handleRemoveAlbaran = useCallback((albaranId) => {
    setAssignments(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(fId => { next[fId] = next[fId].filter(id => id !== albaranId) })
      return next
    })
    setHuerfanos(prev => prev.includes(albaranId) ? prev : [...prev, albaranId])
  }, [])

  const handleToggleConfirm = useCallback((facturaId) => {
    setConfirmed(prev => ({ ...prev, [facturaId]: !prev[facturaId] }))
  }, [])

  const handleConfirmAll = () => {
    const all = {}
    Object.keys(assignments).forEach(fId => { all[fId] = true })
    setConfirmed(all)
  }

  const handleUpdateDoc = (docId, newData) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...newData } : d))
    setEditingDoc(null)
  }

  const allConfirmed = Object.keys(assignments).length > 0 &&
    Object.keys(assignments).every(fId => confirmed[fId])

  const handleDownload = async () => {
    if (!allConfirmed) { alert('Confirma todos los grupos primero.'); return }
    setDownloading(true)
    try {
      const facturas = documents.filter(d => d.tipo === 'factura')
      for (const factura of facturas) {
        const albaranIds = assignments[factura.id] || []
        const albaranDocs = albaranIds.map(id => documents.find(d => d.id === id)).filter(Boolean)
        const allPages = [...(factura.paginas || []), ...albaranDocs.flatMap(a => a.paginas || [])]
        if (allPages.length === 0) continue
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
          } catch (err) { console.warn(`Error pagina ${pageNum}:`, err) }
        }
        if (pdfDoc.getPageCount() === 0) continue
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const prov = (factura.proveedor_codigo || factura.proveedor_nombre || 'PROV').replace(/[^a-zA-Z0-9]/g, '_')
        const num = (factura.numero_factura || 'SN').replace(/[^a-zA-Z0-9]/g, '_')
        const fecha = (factura.fecha_documento || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
        const link = document.createElement('a')
        link.href = url
        link.download = `${prov}_${num}_${fecha}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }
    } catch (err) { alert('Error: ' + err.message) }
    setDownloading(false)
  }

  const handleArchive = async () => {
    if (!allConfirmed) { alert('Confirma todos los grupos primero.'); return }
    if (!confirm('Confirmar archivado?')) return
    setArchiving(true)
    try {
      for (const [facturaId, albaranIds] of Object.entries(assignments)) {
        const factura = documents.find(d => d.id === facturaId)
        if (!factura) continue
        for (const albId of albaranIds) {
          const alb = documents.find(d => d.id === albId)
          if (alb && alb.proveedor_nombre !== factura.proveedor_nombre) {
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
    } catch (err) { alert('Error: ' + err.message) }
    setArchiving(false)
  }

  // ---- Render ----

  if (loading) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Cargando...</p>
    </div>
  )

  if (!batch) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Lote no encontrado</p>
      <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">Volver</button>
    </div>
  )

  const facturas = documents.filter(d => d.tipo === 'factura')
  const docById = {}
  documents.forEach(d => { docById[d.id] = d })

  const proveedorMap = {}
  facturas.forEach(f => {
    const key = f.proveedor_nombre || 'Sin proveedor'
    if (!proveedorMap[key]) proveedorMap[key] = { proveedor: key, codigo: f.proveedor_codigo || '', facturas: [] }
    proveedorMap[key].facturas.push({
      factura: f,
      albaranes: (assignments[f.id] || []).map(id => docById[id]).filter(Boolean),
      confirmed: !!confirmed[f.id]
    })
  })

  const huerfanoDocs = huerfanos.map(id => docById[id]).filter(Boolean)
  const totalGroups = facturas.length
  const confirmedCount = Object.values(confirmed).filter(Boolean).length
  const totalAlb = documents.filter(d => d.tipo === 'albaran').length
  const asociados = totalAlb - huerfanoDocs.filter(d => d.tipo === 'albaran').length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 mb-1">
            ← Volver
          </button>
          <h2 className="text-base font-semibold text-gray-800">{batch.fichero_origen}</h2>
          <p className="text-xs text-gray-500">
            {facturas.length}f · {totalAlb}a ({asociados} asoc.) · {documents.length} docs ·
            <span className={confirmedCount === totalGroups ? ' text-green-600' : ' text-amber-600'}>
              {' '}{confirmedCount}/{totalGroups} conf.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!allConfirmed && (
            <button onClick={handleConfirmAll}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200">
              Confirmar todos
            </button>
          )}
          <button onClick={handleDownload} disabled={!allConfirmed || downloading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-40">
            {downloading ? 'Generando...' : 'Descargar'}
          </button>
          <button onClick={handleArchive} disabled={!allConfirmed || archiving}
            className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-40">
            {archiving ? 'Archivando...' : 'Archivar'}
          </button>
        </div>
      </div>

      {/* Edicion inline */}
      {editingDoc && (
        <EditRow doc={editingDoc} onSave={handleUpdateDoc} onCancel={() => setEditingDoc(null)} />
      )}

      {/* Grupos por proveedor */}
      {Object.values(proveedorMap).map(({ proveedor, codigo, facturas: facts }) => (
        <ProveedorSection
          key={proveedor}
          nombre={proveedor}
          codigo={codigo}
          facturas={facts}
          onDrop={handleDrop}
          onToggleConfirm={handleToggleConfirm}
          onRemoveAlbaran={handleRemoveAlbaran}
          onEditDoc={setEditingDoc}
          dragOver={dragOver}
          setDragOver={setDragOver}
        />
      ))}

      {/* Huerfanos */}
      <HuerfanosSection
        docs={huerfanoDocs}
        onDragStart={setDraggingId}
        onRemove={() => {}}
        onEditDoc={setEditingDoc}
      />

      {facturas.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500 text-sm">No hay facturas en este lote</p>
        </div>
      )}
    </div>
  )
}
