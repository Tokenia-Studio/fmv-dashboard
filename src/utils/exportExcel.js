// ============================================
// EXPORT EXCEL - Libro de movimientos con formato español
// (#.##0,00 en importes, fila TOTAL, anchos de columna)
// ============================================

import * as XLSX from 'xlsx'

// Hoja de movimientos con formato de número español en Debe/Haber/Neto
export function hojaMovimientos(movs, proveedores = {}) {
  const filas = movs.map(m => ({
    Fecha: m.fecha instanceof Date
      ? m.fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : (m.fecha || ''),
    Cuenta: m.cuenta,
    Descripcion: m.descripcion,
    Debe: m.debe,
    Haber: m.haber,
    Neto: m.haber - m.debe,
    Documento: m.documento,
    Proveedor: proveedores[m.codProcedencia] || m.codProcedencia || ''
  }))
  filas.push({
    Fecha: '', Cuenta: '', Descripcion: 'TOTAL',
    Debe: movs.reduce((s, m) => s + m.debe, 0),
    Haber: movs.reduce((s, m) => s + m.haber, 0),
    Neto: movs.reduce((s, m) => s + (m.haber - m.debe), 0),
    Documento: '', Proveedor: ''
  })
  const ws = XLSX.utils.json_to_sheet(filas)
  const range = XLSX.utils.decode_range(ws['!ref'])
  for (let r = 1; r <= range.e.r; r++) {
    for (const col of ['D', 'E', 'F']) {
      const cell = ws[`${col}${r + 1}`]
      if (cell && typeof cell.v === 'number') cell.z = '#,##0.00'
    }
  }
  ws['!cols'] = [{ wch: 11 }, { wch: 12 }, { wch: 50 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 14 }, { wch: 24 }]
  return ws
}

// Nombre de hoja válido para Excel (máx 31 caracteres, sin \ / ? * [ ] :)
function nombreHoja(nombre) {
  return String(nombre).replace(/[\\/?*[\]:]/g, ' ').trim().substring(0, 31) || 'Datos'
}

// Libro con una hoja por bloque: hojas = [{ nombre, movimientos }]
export function exportarLibroMovimientos(hojas, nombreArchivo, proveedores = {}) {
  const wb = XLSX.utils.book_new()
  hojas.forEach(h => {
    if (h.movimientos && h.movimientos.length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaMovimientos(h.movimientos, proveedores), nombreHoja(h.nombre))
    }
  })
  if (wb.SheetNames.length === 0) return false
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  return true
}
