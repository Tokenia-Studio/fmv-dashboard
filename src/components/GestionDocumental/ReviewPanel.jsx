// ============================================
// REVIEW PANEL - Revisión agrupada por proveedor
// con drag & drop de albaranes entre facturas
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { documental } from '../../lib/supabase'
import { PDFDocument } from 'pdf-lib'

// ---- Helpers ----

function buildGroups(documents) {
  const facturas = documents.filter(d => d.tipo === 'factura')
  const albaranes = documents.filter(d => d.tipo === 'albaran')
  const desconocidos = documents.filter(d => d.tipo === 'desconocido')

  // Mapa: facturaId -> { factura, albaranes[] }
  const facMap = {}
  facturas.forEach(f => {
    facMap[f.id] = { factura: f, albaranes: [], confirmed: false }
  })

  // Asignar albaranes a facturas por proveedor coincidente
  const huerfanos = []
  albaranes.forEach(a => {
    // Buscar factura del mismo proveedor
    const match = facturas.find(f =>
      f.proveedor_nombre && a.proveedor_nombre &&
      f.proveedor_nombre.toLowerCase() === a.proveedor_nombre.toLowerCase()
    )
    if (match) {
      facMap[match.id].albaranes.push(a)
    } else {
      huerfanos.push(a)
    }
  })

  // Agrupar por proveedor
  const provGroups = {}
  Object.values(facMap).forEach(({ factura, albaranes: albs, confirmed }) => {
    const key = factura.proveedor_nombre || 'Sin proveedor'
    if (!provGroups[key]) {
      provGroups[key] = {
        proveedor: factura.proveedor_nombre || 'Sin proveedor',
        codigo: factura.proveedor_codigo || '',
        facturas: []
      }
    }
    provGroups[key].facturas.push({ factura, albaranes: albs, confirmed })
  })

  return { provGroups, huerfanos, desconocidos }
}

function docLabel(doc) {
  const cod = doc.proveedor_codigo || '???'
  const num = doc.numero_factura || doc.numero_albaran || 'S/N'
  const tipo = doc.tipo === 'factura' ? 'FAC' : doc.tipo === 'albaran' ? 'ALB' : 'DOC'
  return `${cod} - ${num} - ${tipo}`
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

function AlbaranItem({ doc, onDragStart, onRemove }) {
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
      <span className="text-sm text-gray-700 flex-1 truncate">{docLabel(doc)}</span>
      <span className="text-xs text-gray-400">{doc.numero_albaran || ''}</span>
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

function FacturaGroup({ grupo, onDrop, onToggleConfirm, onRemoveAlbaran, dragOver, setDragOver }) {
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
      {/* Factura header */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 rounded-t-lg"
      >
        <span className="text-gray-400 text-xs">{expanded ? '▼' : '▶'}</span>
        <span className="text-lg">🧾</span>
        <span className="font-medium text-gray-800 flex-1 truncate">{docLabel(factura)}</span>
        <span className="text-xs text-gray-400">
          {albaranes.length} alb.
        </span>
        <ConfirmBadge confirmed={confirmed} onClick={(e) => { e.stopPropagation(); onToggleConfirm(factura.id) }} />
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
                  onDragStart={() => {}}
                  onRemove={onRemoveAlbaran}
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

function ProveedorAccordion({ nombre, codigo, facturas, onDrop, onToggleConfirm, onRemoveAlbaran, dragOver, setDragOver }) {
  const [expanded, setExpanded] = useState(true)
  const allConfirmed = facturas.every(f => f.confirmed)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
      >
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
        <div className="flex-1">
          <span className="font-semibold text-gray-800">{nombre}</span>
          {codigo && <span className="text-xs text-gray-400 ml-2">({codigo})</span>}
        </div>
        <span className="text-xs text-gray-500">{facturas.length} factura{facturas.length > 1 ? 's' : ''}</span>
        {allConfirmed && <span className="text-green-500 text-sm">✓</span>}
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {facturas.map(g => (
            <FacturaGroup
              key={g.factura.id}
              grupo={g}
              onDrop={onDrop}
              onToggleConfirm={onToggleConfirm}
              onRemoveAlbaran={onRemoveAlbaran}
              dragOver={dragOver}
              setDragOver={setDragOver}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HuerfanosSection({ docs, onDragStart }) {
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
            onDragStart={onDragStart}
            onRemove={() => {}}
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
  const [desconocidos, setDesconocidos] = useState([])
  const [confirmed, setConfirmed] = useState({}) // { facturaId: bool }
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [draggingId, setDraggingId] = useState(null)

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
      initializeGroups(docs)
    }
    setLoading(false)
  }

  const initializeGroups = (docs) => {
    const facturas = docs.filter(d => d.tipo === 'factura')
    const albaranes = docs.filter(d => d.tipo === 'albaran')
    const desc = docs.filter(d => d.tipo === 'desconocido')

    const newAssignments = {}
    const orphans = []

    facturas.forEach(f => { newAssignments[f.id] = [] })

    albaranes.forEach(a => {
      const match = facturas.find(f =>
        f.proveedor_nombre && a.proveedor_nombre &&
        f.proveedor_nombre.toLowerCase().trim() === a.proveedor_nombre.toLowerCase().trim()
      )
      if (match) {
        newAssignments[match.id].push(a.id)
      } else {
        orphans.push(a.id)
      }
    })

    // Desconocidos van a huérfanos también
    desc.forEach(d => orphans.push(d.id))

    setAssignments(newAssignments)
    setHuerfanos(orphans)
    setDesconocidos([])
    setConfirmed({})
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
      // Guardar reasignaciones en Supabase (actualizar proveedor en albaranes movidos)
      for (const [facturaId, albaranIds] of Object.entries(assignments)) {
        const factura = documents.find(d => d.id === facturaId)
        if (!factura) continue

        for (const albId of albaranIds) {
          const alb = documents.find(d => d.id === albId)
          if (!alb) continue
          // Si el proveedor del albarán no coincide con la factura, actualizar
          if (alb.proveedor_nombre !== factura.proveedor_nombre) {
            await documental.updateDocument(albId, {
              proveedor_nombre: factura.proveedor_nombre,
              proveedor_codigo: factura.proveedor_codigo
            })
          }
        }
      }

      // Archivar el lote
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
            {facturas.length} factura{facturas.length !== 1 ? 's' : ''} · {documents.length} documentos totales ·
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
          <strong>Arrastra</strong> los albaranes entre facturas para corregir la asignación.
          Pulsa <strong>✕</strong> en un albarán para marcarlo como huérfano.
          Confirma cada grupo antes de descargar.
        </p>
      </div>

      {/* Grupos por proveedor */}
      {Object.values(proveedorMap).map(({ proveedor, codigo, facturas: facts }) => (
        <ProveedorAccordion
          key={proveedor}
          nombre={proveedor}
          codigo={codigo}
          facturas={facts}
          onDrop={handleDrop}
          onToggleConfirm={handleToggleConfirm}
          onRemoveAlbaran={handleRemoveAlbaran}
          dragOver={dragOver}
          setDragOver={setDragOver}
        />
      ))}

      {/* Huérfanos */}
      <HuerfanosSection
        docs={huerfanoDocs}
        onDragStart={setDraggingId}
      />

      {/* Sin documentos */}
      {facturas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-500">No hay facturas en este lote</p>
        </div>
      )}
    </div>
  )
}
