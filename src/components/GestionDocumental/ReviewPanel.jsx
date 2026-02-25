// ============================================
// REVIEW PANEL - Vista compacta con edicion inline
// Cada doc se puede editar in-situ
// Drag & drop con auto-scroll
// ============================================

import React, { useState, useEffect, useCallback } from 'react'
import { documental } from '../../lib/supabase'
import { PDFDocument } from 'pdf-lib'

// ---- Helpers ----

function initializeFromBackend(docs) {
  const facturas = docs.filter(d => d.tipo === 'factura')
  const albaranes = docs.filter(d => d.tipo === 'albaran')
  const otros = docs.filter(d => d.tipo === 'desconocido')

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

  otros.forEach(d => orphans.push(d.id))
  return { assignments, orphans }
}

// ---- Auto-scroll durante drag ----

function useAutoScroll(active) {
  useEffect(() => {
    if (!active) return
    const handler = (e) => {
      const ZONE = 80, SPEED = 15
      if (e.clientY < ZONE) window.scrollBy(0, -SPEED)
      else if (e.clientY > window.innerHeight - ZONE) window.scrollBy(0, SPEED)
    }
    window.addEventListener('dragover', handler)
    return () => window.removeEventListener('dragover', handler)
  }, [active])
}

// ---- Documento editable ----

function DocRow({ doc, isEditing, onStartEdit, onSaveEdit, onCancelEdit, isDraggable, onDragStart, onRemove, children }) {
  const [data, setData] = useState({
    tipo: doc.tipo || 'desconocido',
    proveedor_nombre: doc.proveedor_nombre || '',
    proveedor_codigo: doc.proveedor_codigo || '',
    numero_factura: doc.numero_factura || '',
    numero_albaran: doc.numero_albaran || '',
    fecha_documento: doc.fecha_documento || '',
  })
  const [saving, setSaving] = useState(false)

  // Reset form cuando cambia el doc o entra en edicion
  useEffect(() => {
    setData({
      tipo: doc.tipo || 'desconocido',
      proveedor_nombre: doc.proveedor_nombre || '',
      proveedor_codigo: doc.proveedor_codigo || '',
      numero_factura: doc.numero_factura || '',
      numero_albaran: doc.numero_albaran || '',
      fecha_documento: doc.fecha_documento || '',
    })
  }, [doc.id, isEditing])

  const handleSave = async () => {
    setSaving(true)
    try {
      await documental.updateDocument(doc.id, { ...data, estado: 'corregido' })
      onSaveEdit(doc.id, data)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const icon = doc.tipo === 'factura' ? '🧾' : doc.tipo === 'albaran' ? '📋' : '❓'
  const tipoLabel = doc.tipo === 'factura' ? 'FAC' : doc.tipo === 'albaran' ? 'ALB' : 'DOC'
  const num = doc.numero_factura || doc.numero_albaran || 'S/N'
  const pags = doc.paginas?.length || 0

  if (isEditing) {
    return (
      <div className="bg-amber-50 border-2 border-amber-300 rounded px-3 py-2.5 space-y-2">
        <div className="text-xs font-medium text-amber-700 mb-1">Editando: {icon} {tipoLabel} {num} ({pags}p)</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 block">Tipo</label>
            <select value={data.tipo} onChange={e => setData({ ...data, tipo: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs bg-white">
              <option value="factura">Factura</option>
              <option value="albaran">Albaran</option>
              <option value="desconocido">Desconocido</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">Proveedor</label>
            <input type="text" value={data.proveedor_nombre}
              onChange={e => setData({ ...data, proveedor_nombre: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs" placeholder="Nombre" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">Cod. Proveedor</label>
            <input type="text" value={data.proveedor_codigo}
              onChange={e => setData({ ...data, proveedor_codigo: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs" placeholder="Codigo" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">N. Factura</label>
            <input type="text" value={data.numero_factura}
              onChange={e => setData({ ...data, numero_factura: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs" placeholder="N. Factura" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">N. Albaran</label>
            <input type="text" value={data.numero_albaran}
              onChange={e => setData({ ...data, numero_albaran: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs" placeholder="N. Albaran" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block">Fecha</label>
            <input type="date" value={data.fecha_documento}
              onChange={e => setData({ ...data, fecha_documento: e.target.value })}
              className="w-full px-2 py-1 border rounded text-xs" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancelEdit}
            className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  // Vista normal (no edición)
  const dragProps = isDraggable ? {
    draggable: true,
    onDragStart: (e) => {
      e.dataTransfer.setData('text/plain', doc.id)
      e.dataTransfer.effectAllowed = 'move'
      if (onDragStart) onDragStart(doc.id)
    },
  } : {}

  return (
    <div {...dragProps}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors group text-xs
        ${isDraggable ? 'cursor-grab active:cursor-grabbing bg-blue-50 border-blue-100 hover:bg-blue-100' : 'bg-white border-gray-100 hover:bg-gray-50'}
      `}
    >
      <span>{icon}</span>
      <span className="font-medium text-gray-800">{tipoLabel} {num}</span>
      <span className="text-gray-400 truncate max-w-[140px]">{doc.proveedor_nombre || 'Sin proveedor'}</span>
      {doc.proveedor_codigo && <span className="text-gray-300">({doc.proveedor_codigo})</span>}
      {doc.fecha_documento && <span className="text-gray-300">{doc.fecha_documento}</span>}
      <span className="text-gray-300">{pags}p</span>
      <div className="flex-1" />
      <button onClick={(e) => { e.stopPropagation(); onStartEdit() }}
        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded px-1.5 py-0.5 text-sm"
        title="Editar">✎</button>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(doc.id) }}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1.5 py-0.5 text-sm"
          title="Desasociar">✕</button>
      )}
      {children}
    </div>
  )
}

// ---- Bloque Factura + albaranes ----

function FacturaBlock({ grupo, editingId, onStartEdit, onSaveEdit, onCancelEdit, onDrop, onToggleConfirm, onRemoveAlbaran, dragOver, setDragOver }) {
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(null)}
      onDrop={handleDrop}
      className={`rounded border transition-all ${
        isDragTarget ? 'border-blue-400 bg-blue-50/50 shadow-sm' :
        confirmed ? 'border-green-200 bg-green-50/20' : 'border-gray-200'
      }`}
    >
      {/* Factura */}
      <div className="p-1.5">
        <DocRow
          doc={factura}
          isEditing={editingId === factura.id}
          onStartEdit={() => onStartEdit(factura.id)}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        >
          <button
            onClick={() => onToggleConfirm(factura.id)}
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ml-1 ${
              confirmed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400 hover:bg-amber-100'
            }`}
          >{confirmed ? '✓' : '○'}</button>
        </DocRow>
      </div>

      {/* Albaranes asociados */}
      {albaranes.length > 0 && (
        <div className="px-1.5 pb-1.5 pl-7 space-y-0.5">
          {albaranes.map(a => (
            <DocRow
              key={a.id}
              doc={a}
              isEditing={editingId === a.id}
              onStartEdit={() => onStartEdit(a.id)}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              isDraggable
              onRemove={onRemoveAlbaran}
            />
          ))}
        </div>
      )}

      {isDragTarget && (
        <div className="mx-1.5 mb-1.5 ml-7 px-2 py-1 border-2 border-dashed border-blue-300 rounded text-center">
          <span className="text-xs text-blue-500">Soltar aqui</span>
        </div>
      )}
    </div>
  )
}

// ---- Secciones ----

function ProveedorSection({ nombre, codigo, facturas, editingId, onStartEdit, onSaveEdit, onCancelEdit, onDrop, onToggleConfirm, onRemoveAlbaran, dragOver, setDragOver }) {
  const allConfirmed = facturas.every(f => f.confirmed)
  const totalAlb = facturas.reduce((s, f) => s + f.albaranes.length, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
        <span className="font-semibold text-gray-800 text-sm">{nombre}</span>
        {codigo && <span className="text-xs text-gray-400">({codigo})</span>}
        <div className="flex-1" />
        <span className="text-xs text-gray-400">{facturas.length}f · {totalAlb}a</span>
        {allConfirmed && <span className="text-green-500 font-bold">✓</span>}
      </div>
      <div className="p-1.5 space-y-1">
        {facturas.map(g => (
          <FacturaBlock
            key={g.factura.id}
            grupo={g}
            editingId={editingId}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            onDrop={onDrop}
            onToggleConfirm={onToggleConfirm}
            onRemoveAlbaran={onRemoveAlbaran}
            dragOver={dragOver}
            setDragOver={setDragOver}
          />
        ))}
      </div>
    </div>
  )
}

function HuerfanosSection({ docs, editingId, onStartEdit, onSaveEdit, onCancelEdit, onDragStart }) {
  if (docs.length === 0) return null

  return (
    <div className="bg-white rounded-lg shadow-sm border border-amber-200">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-100 bg-amber-50/50">
        <span className="font-semibold text-amber-800 text-sm">Sin asociar ({docs.length})</span>
        <span className="text-xs text-amber-600">Arrastra a una factura</span>
      </div>
      <div className="p-1.5 space-y-0.5">
        {docs.map(d => (
          <DocRow
            key={d.id}
            doc={d}
            isEditing={editingId === d.id}
            onStartEdit={() => onStartEdit(d.id)}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            isDraggable
            onDragStart={onDragStart}
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
  const [assignments, setAssignments] = useState({})
  const [huerfanos, setHuerfanos] = useState([])
  const [confirmed, setConfirmed] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useAutoScroll(!!draggingId)

  useEffect(() => { loadBatch() }, [batchId])

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

  const handleSaveEdit = useCallback((docId, newData) => {
    setDocuments(prev => {
      const updated = prev.map(d => d.id === docId ? { ...d, ...newData } : d)

      // Si cambió el tipo, recalcular assignments
      const oldDoc = prev.find(d => d.id === docId)
      if (oldDoc && oldDoc.tipo !== newData.tipo) {
        // Recalcular agrupación desde cero con los docs actualizados
        const { assignments: a, orphans } = initializeFromBackend(updated)

        // Si el doc era huérfano y ahora es factura, crear slot
        if (newData.tipo === 'factura' && !a[docId]) {
          a[docId] = []
        }

        setAssignments(a)
        setHuerfanos(orphans)
      }

      return updated
    })
    setEditingId(null)
  }, [])

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

  const allConfirmed = Object.keys(assignments).length > 0 &&
    Object.keys(assignments).every(fId => confirmed[fId])

  const handleDownload = async () => {
    if (!allConfirmed) { alert('Confirma todos los grupos primero.'); return }
    setDownloading(true)
    try {
      const facturasList = documents.filter(d => d.tipo === 'factura')
      let errCount = 0
      for (const factura of facturasList) {
        const albaranIds = assignments[factura.id] || []
        const albaranDocs = albaranIds.map(id => documents.find(d => d.id === id)).filter(Boolean)
        const allPages = [...(factura.paginas || []), ...albaranDocs.flatMap(a => a.paginas || [])]
        if (allPages.length === 0) { errCount++; continue }

        const pdfDoc = await PDFDocument.create()
        for (const pageNum of allPages) {
          try {
            // Intentar URL firmada (bucket privado) y fallback a public
            let url = await documental.getSignedPreviewUrl(batchId, pageNum)
            if (!url) url = documental.getPreviewUrl(batchId, pageNum)

            const resp = await fetch(url)
            if (!resp.ok) { console.warn(`Página ${pageNum}: HTTP ${resp.status}`); continue }
            const imgBytes = await resp.arrayBuffer()
            if (imgBytes.byteLength < 100) { console.warn(`Página ${pageNum}: imagen vacía`); continue }

            const img = await pdfDoc.embedPng(imgBytes).catch(() => null)
            if (!img) continue
            const page = pdfDoc.addPage([img.width, img.height])
            page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
          } catch (err) { console.warn(`Error página ${pageNum}:`, err) }
        }
        if (pdfDoc.getPageCount() === 0) { errCount++; continue }

        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const prov = (factura.proveedor_codigo || factura.proveedor_nombre || 'PROV').replace(/[^a-zA-Z0-9]/g, '_')
        const num = (factura.numero_factura || 'SN').replace(/[^a-zA-Z0-9]/g, '_')
        const fecha = (factura.fecha_documento || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `${prov}_${num}_${fecha}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(blobUrl)
      }
      if (errCount > 0) alert(`${errCount} grupo(s) sin páginas disponibles`)
    } catch (err) { alert('Error generando PDFs: ' + err.message) }
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

  if (loading) return <div className="text-center py-20"><p className="text-gray-500">Cargando...</p></div>
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
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-700 mb-1">← Volver</button>
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

      {/* Grupos por proveedor */}
      {Object.values(proveedorMap).map(({ proveedor, codigo, facturas: facts }) => (
        <ProveedorSection
          key={proveedor}
          nombre={proveedor}
          codigo={codigo}
          facturas={facts}
          editingId={editingId}
          onStartEdit={setEditingId}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDrop={handleDrop}
          onToggleConfirm={handleToggleConfirm}
          onRemoveAlbaran={handleRemoveAlbaran}
          dragOver={dragOver}
          setDragOver={setDragOver}
        />
      ))}

      {/* Huerfanos */}
      <HuerfanosSection
        docs={huerfanoDocs}
        editingId={editingId}
        onStartEdit={setEditingId}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDragStart={setDraggingId}
      />

      {facturas.length === 0 && huerfanoDocs.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-100">
          <p className="text-gray-500 text-sm">No hay documentos en este lote</p>
        </div>
      )}
    </div>
  )
}
