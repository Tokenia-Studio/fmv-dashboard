// Benchmarks sectoriales para estructuras metálicas / soldadura MIG-TIG
// CNAE 25.11, 25.62, 33.11 - España, PYMEs 2-10M EUR
// Fuentes: DBK Informe Sectorial, Banco de España Central de Balances,
// convenios colectivos del metal.

// Cada ratio define umbrales: [tensionadoMax, saludableMin, saludableMax, excelenteMin]
// (o invertido si "más bajo = mejor"). direction:
//   'higher' → cuanto más alto mejor (ej. Ingresos/Hora)
//   'lower'  → cuanto más bajo mejor (ej. Personal/Ventas)

export const BENCHMARKS_SECTOR = {
  // ========== COSTES Y MÁRGENES (% sobre ventas) ==========
  personalSobreVentas: {
    label: 'Personal / Ventas',
    unit: '%',
    direction: 'lower',
    tensionadoMin: 45,   // > 45% tensionado
    saludableMin: 30,    // 30-40% saludable
    saludableMax: 40,
    excelenteMax: 30,    // < 30% excelente
    descripcion: 'Peso del gasto de personal sobre la facturación.'
  },
  pctGastosVentas: {
    label: 'Gastos Op. / Ventas',
    unit: '%',
    direction: 'lower',
    tensionadoMin: 95,
    saludableMin: 82,
    saludableMax: 92,
    excelenteMax: 82,
    descripcion: 'Suma de grupos 60 + 62 + 640 sobre ventas.'
  },
  pctProveedoresVentas: {
    label: 'Proveedores 60 / Ventas',
    unit: '%',
    direction: 'lower',
    tensionadoMin: 55,
    saludableMin: 40,
    saludableMax: 50,
    excelenteMax: 40,
    descripcion: 'Coste de materia prima y subcontratas sobre ventas.'
  },
  pctAcreedoresVentas: {
    label: 'Serv. Ext. 62 / Ventas',
    unit: '%',
    direction: 'lower',
    tensionadoMin: 15,
    saludableMin: 6,
    saludableMax: 10,
    excelenteMax: 6,
    descripcion: 'Servicios exteriores: transporte, energía, reparaciones, gases industriales.'
  },
  margenBrutoPct: {
    label: 'Margen Bruto',
    unit: '%',
    direction: 'higher',
    tensionadoMax: 20,   // < 20% tensionado
    saludableMin: 22,
    saludableMax: 32,
    excelenteMin: 32,    // > 32% excelente
    descripcion: 'Margen sobre ventas tras materia prima. 15-20% en subcontratación pura, 25-32% en llave en mano.'
  },
  ebitdaPct: {
    label: 'EBITDA / Ventas',
    unit: '%',
    direction: 'higher',
    tensionadoMax: 5,
    saludableMin: 8,
    saludableMax: 13,
    excelenteMin: 13,
    descripcion: 'Rentabilidad operativa. Media sector metal-mecánica España: 10-12%.'
  },

  // ========== PRODUCTIVIDAD POR HORA ==========
  ingresosHora: {
    label: 'Ingresos / Hora',
    unit: '€/h',
    direction: 'higher',
    tensionadoMax: 40,
    saludableMin: 50,
    saludableMax: 65,
    excelenteMin: 65,
    descripcion: 'Facturación por hora trabajada. Tarifa horaria media de taller metal.'
  },
  gastosHoraManoObra: {
    label: 'Coste/h Mano Obra',
    unit: '€/h',
    direction: 'lower',
    tensionadoMin: 22,
    saludableMin: 16,
    saludableMax: 20,
    excelenteMax: 16,
    descripcion: 'Coste hora solo sueldos brutos (640). Soldador TIG cualificado 18-22 €/h bruto.'
  },
  gastosHoraTotal: {
    label: 'Coste/h Total',
    unit: '€/h',
    direction: 'lower',
    tensionadoMin: 55,
    saludableMin: 42,
    saludableMax: 52,
    excelenteMax: 42,
    descripcion: 'Coste total por hora (640 + 60 + 62). Base para calcular el margen por hora.'
  },
  margenHora: {
    label: 'Margen / Hora',
    unit: '€/h',
    direction: 'higher',
    tensionadoMax: 3,
    saludableMin: 6,
    saludableMax: 12,
    excelenteMin: 12,
    descripcion: 'Ingresos − Gastos por hora trabajada. Lo que queda para amortizaciones, financieros y beneficio.'
  },

  // ========== PRODUCTIVIDAD POR EMPLEADO (anual) ==========
  ventasPorEmpleado: {
    label: 'Ventas / Empleado',
    unit: '€',
    direction: 'higher',
    tensionadoMax: 90000,
    saludableMin: 110000,
    saludableMax: 160000,
    excelenteMin: 160000,
    descripcion: 'Facturación anual por empleado. Media sector 120-140 k€.'
  },
  ebitdaPorEmpleado: {
    label: 'EBITDA / Empleado',
    unit: '€',
    direction: 'higher',
    tensionadoMax: 8000,
    saludableMin: 12000,
    saludableMax: 20000,
    excelenteMin: 20000,
    descripcion: 'Rentabilidad operativa generada por cada trabajador.'
  },
  coberturaLaboral: {
    label: 'Cobertura Laboral',
    unit: 'x',
    direction: 'higher',
    tensionadoMax: 2.2,
    saludableMin: 2.5,
    saludableMax: 3.5,
    excelenteMin: 3.5,
    descripcion: 'Ventas / Gasto Personal. Euros de venta por cada euro invertido en plantilla.'
  }
}

// Evalúa un valor contra un benchmark y devuelve estado + color
export function evaluarBenchmark(valor, bench) {
  if (valor == null || isNaN(valor) || !bench) {
    return { estado: 'sin-datos', color: 'gray', label: 'Sin datos' }
  }
  if (bench.direction === 'lower') {
    if (valor <= bench.excelenteMax) return { estado: 'excelente', color: 'emerald', label: 'Excelente' }
    if (valor <= bench.saludableMax) return { estado: 'saludable', color: 'green', label: 'Saludable' }
    if (valor < bench.tensionadoMin) return { estado: 'alerta', color: 'amber', label: 'Zona alerta' }
    return { estado: 'tensionado', color: 'red', label: 'Tensionado' }
  } else {
    if (valor >= bench.excelenteMin) return { estado: 'excelente', color: 'emerald', label: 'Excelente' }
    if (valor >= bench.saludableMin) return { estado: 'saludable', color: 'green', label: 'Saludable' }
    if (valor > bench.tensionadoMax) return { estado: 'alerta', color: 'amber', label: 'Zona alerta' }
    return { estado: 'tensionado', color: 'red', label: 'Tensionado' }
  }
}

// Calcula posición 0..100 del valor en la escala tensionado-saludable-excelente
// Se usa para dibujar una barra de progreso.
export function posicionEnEscala(valor, bench) {
  if (valor == null || isNaN(valor) || !bench) return 0
  // Definimos la escala entera desde tensionado extremo hasta excelente extremo
  let min, max
  if (bench.direction === 'lower') {
    // Mejor valor pequeño. Escala invertida: min = mucho peor que tensionado, max = 0 o excelente
    min = bench.tensionadoMin * 1.5
    max = Math.max(bench.excelenteMax * 0.5, 0)
  } else {
    min = Math.max(bench.tensionadoMax * 0.5, 0)
    max = bench.excelenteMin * 1.5
  }
  const span = max - min
  if (span === 0) return 50
  const pos = ((valor - min) / span) * 100
  return Math.max(0, Math.min(100, bench.direction === 'lower' ? 100 - pos : pos))
}

// Genera el texto del rango saludable para mostrar al usuario
export function rangoSaludableTexto(bench) {
  if (!bench) return ''
  const formatVal = (v) => {
    if (bench.unit === '€') return `${(v / 1000).toFixed(0)}k€`
    if (bench.unit === '%') return `${v}%`
    return `${v}${bench.unit}`
  }
  return `${formatVal(bench.saludableMin)} – ${formatVal(bench.saludableMax)}`
}
