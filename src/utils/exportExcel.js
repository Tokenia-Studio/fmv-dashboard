// ============================================
// EXPORT EXCEL - Libro de movimientos con formato español
// (#.##0,00 en importes, fila TOTAL, anchos de columna)
// ============================================

import * as XLSX from 'xlsx'

// Prefijos de cuentas cuyo "Cód. procedencia" es un número de CLIENTE en BC.
// El resto (40x, 41x, 60x, 62x…) son números de proveedor. BC numera ambas
// series por separado, así que el mismo código significa terceros distintos.
const PREFIJOS_CLIENTE = ['43', '44']

// Nombre del tercero de un movimiento según el tipo de cuenta
export function nombreTercero(m, proveedores = {}, clientes = {}) {
  const cod = m.codProcedencia
  if (!cod) return ''
  const esCliente = PREFIJOS_CLIENTE.some(p => String(m.cuenta || '').startsWith(p))
  const maestro = esCliente ? clientes : proveedores
  return maestro[cod] || cod
}

// Hoja de movimientos con formato de número español en Debe/Haber/Neto
export function hojaMovimientos(movs, proveedores = {}, clientes = {}) {
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
    Tercero: nombreTercero(m, proveedores, clientes)
  }))
  filas.push({
    Fecha: '', Cuenta: '', Descripcion: 'TOTAL',
    Debe: movs.reduce((s, m) => s + m.debe, 0),
    Haber: movs.reduce((s, m) => s + m.haber, 0),
    Neto: movs.reduce((s, m) => s + (m.haber - m.debe), 0),
    Documento: '', Tercero: ''
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
export function exportarLibroMovimientos(hojas, nombreArchivo, proveedores = {}, clientes = {}) {
  const wb = XLSX.utils.book_new()
  hojas.forEach(h => {
    if (h.movimientos && h.movimientos.length > 0) {
      XLSX.utils.book_append_sheet(wb, hojaMovimientos(h.movimientos, proveedores, clientes), nombreHoja(h.nombre))
    }
  })
  if (wb.SheetNames.length === 0) return false
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  return true
}
