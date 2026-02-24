// ============================================
// DOCUMENT PREVIEW - Vista previa + edición
// ============================================

import React, { useState } from 'react'
import { documental } from '../../lib/supabase'

export default function DocumentPreview({ document: doc, batchId, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    tipo: doc.tipo,
    proveedor_nombre: doc.proveedor_nombre || '',
    proveedor_codigo: doc.proveedor_codigo || '',
    numero_factura: doc.numero_factura || '',
    numero_albaran: doc.numero_albaran || '',
    fecha_documento: doc.fecha_documento || ''
  })
  const [saving, setSaving] = useState(false)

  // Resetear form cuando cambia el documento
  React.useEffect(() => {
    setForm({
      tipo: doc.tipo,
      proveedor_nombre: doc.proveedor_nombre || '',
      proveedor_codigo: doc.proveedor_codigo || '',
      numero_factura: doc.numero_factura || '',
      numero_albaran: doc.numero_albaran || '',
      fecha_documento: doc.fecha_documento || ''
    })
    setEditing(false)
  }, [doc.id])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(doc.id, form)
    setEditing(false)
    setSaving(false)
  }

  const confianza = Math.round((doc.confianza || 0) * 100)

  // Preview de la primera página
  const firstPage = doc.paginas?.[0] || 1
  const previewUrl = doc.preview_url || documental.getPreviewUrl(batchId, firstPage)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Detalle del documento</h3>
        <span className={`text-xs font-mono px-2 py-1 rounded ${
          confianza >= 80 ? 'bg-green-100 text-green-700' :
          confianza >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}>
          Confianza: {confianza}%
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Preview de imagen */}
        <div className="bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={previewUrl}
            alt={`Preview página ${firstPage}`}
            className="w-full max-h-[300px] object-contain"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
          <div className="hidden items-center justify-center h-[200px] text-gray-400 text-sm">
            Preview no disponible
          </div>
        </div>

        {/* Datos extraídos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Datos extraídos</span>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          <Field
            label="Tipo"
            editing={editing}
            value={form.tipo}
            onChange={v => setForm(f => ({ ...f, tipo: v }))}
            type="select"
            options={[
              { value: 'factura', label: 'Factura' },
              { value: 'albaran', label: 'Albarán' },
              { value: 'desconocido', label: 'Desconocido' }
            ]}
          />
          <Field
            label="Proveedor"
            editing={editing}
            value={form.proveedor_nombre}
            onChange={v => setForm(f => ({ ...f, proveedor_nombre: v }))}
          />
          <Field
            label="Cód. Proveedor"
            editing={editing}
            value={form.proveedor_codigo}
            onChange={v => setForm(f => ({ ...f, proveedor_codigo: v }))}
          />
          <Field
            label="Nº Factura"
            editing={editing}
            value={form.numero_factura}
            onChange={v => setForm(f => ({ ...f, numero_factura: v }))}
          />
          <Field
            label="Nº Albarán"
            editing={editing}
            value={form.numero_albaran}
            onChange={v => setForm(f => ({ ...f, numero_albaran: v }))}
          />
          <Field
            label="Fecha"
            editing={editing}
            value={form.fecha_documento}
            onChange={v => setForm(f => ({ ...f, fecha_documento: v }))}
            type="date"
          />

          {/* Info adicional */}
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>Páginas: {doc.paginas?.join(', ') || '-'}</p>
            {doc.ruta_destino && <p>Destino: {doc.ruta_destino}</p>}
            {doc.fichero_nombre && <p>Fichero: {doc.fichero_nombre}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, editing, value, onChange, type = 'text', options }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      {editing ? (
        type === 'select' ? (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        )
      ) : (
        <span className="flex-1 text-sm text-gray-800">
          {value || <span className="text-gray-300 italic">vacío</span>}
        </span>
      )}
    </div>
  )
}
