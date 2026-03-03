// ============================================
// PLANIFICACION CALCULATIONS
// Filtros, sort, KPIs, datos demo (Fase 2)
// ============================================

// --- FUNCIONAL (Fase 1) ---

export function filterOrdenes(ordenes, filters) {
  let result = ordenes

  // Filter by month
  if (filters.mes && filters.mes !== 'todos') {
    result = result.filter(o => o.mesVencimiento === filters.mes)
  }

  // Filter by client
  if (filters.cliente && filters.cliente !== 'todos') {
    result = result.filter(o => o.clienteNombre === filters.cliente)
  }

  // Text search (nº orden, descripción, cliente)
  if (filters.busqueda) {
    const q = filters.busqueda.toLowerCase().trim()
    result = result.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.descripcion.toLowerCase().includes(q) ||
      o.clienteNombre.toLowerCase().includes(q) ||
      o.codProcedencia.toLowerCase().includes(q)
    )
  }

  // Filter by semáforo (demo)
  if (filters.semaforo && filters.semaforo !== 'todos') {
    result = result.filter(o => getDemoSemaforo(o.id) === filters.semaforo)
  }

  return result
}

export function sortOrdenes(ordenes, columna, asc) {
  const dir = asc ? 1 : -1
  return [...ordenes].sort((a, b) => {
    let va, vb
    switch (columna) {
      case 'id':
        return dir * a.id.localeCompare(b.id)
      case 'descripcion':
        return dir * a.descripcion.localeCompare(b.descripcion)
      case 'cliente':
        return dir * a.clienteNombre.localeCompare(b.clienteNombre)
      case 'cantidad':
        return dir * (a.cantidad - b.cantidad)
      case 'fechaVencimiento':
        va = a.fechaVencimiento ? a.fechaVencimiento.getTime() : 0
        vb = b.fechaVencimiento ? b.fechaVencimiento.getTime() : 0
        return dir * (va - vb)
      case 'fases':
        return dir * (a.totalFases - b.totalFases)
      case 'estado':
        return dir * getDemoSemaforo(a.id).localeCompare(getDemoSemaforo(b.id))
      default:
        return 0
    }
  })
}

export function extraerMesesUnicos(ordenes) {
  const meses = new Set()
  ordenes.forEach(o => {
    if (o.mesVencimiento) meses.add(o.mesVencimiento)
  })
  const ORDEN = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return [...meses].sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b))
}

export function extraerClientesUnicos(ordenes) {
  const clientes = new Set()
  ordenes.forEach(o => {
    if (o.clienteNombre) clientes.add(o.clienteNombre)
  })
  return [...clientes].sort()
}

// --- DEMO (Fase 2 mockup) ---

// Hash determinista de un string a número 0-99
function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 100
}

/**
 * Semáforo demo: 30% green, 40% yellow, 30% red
 */
export function getDemoSemaforo(ordenId) {
  const h = hashStr(ordenId)
  if (h < 30) return 'green'
  if (h < 70) return 'yellow'
  return 'red'
}

/**
 * Progreso demo por fase: hash determinista 0-100
 */
export function getDemoProgress(ordenId, opNum) {
  const h = hashStr(ordenId + '-' + opNum)
  return h
}

/**
 * KPIs: total + distribución semáforos demo
 */
export function calcularKPIs(ordenes) {
  const total = ordenes.length
  if (total === 0) return { total: 0, enPlazo: 0, alerta: 0, retrasadas: 0, pctPlazo: 0, pctAlerta: 0, pctRetrasadas: 0 }

  let enPlazo = 0, alerta = 0, retrasadas = 0
  ordenes.forEach(o => {
    const s = getDemoSemaforo(o.id)
    if (s === 'green') enPlazo++
    else if (s === 'yellow') alerta++
    else retrasadas++
  })

  return {
    total,
    enPlazo,
    alerta,
    retrasadas,
    pctPlazo: Math.round((enPlazo / total) * 100),
    pctAlerta: Math.round((alerta / total) * 100),
    pctRetrasadas: Math.round((retrasadas / total) * 100)
  }
}
