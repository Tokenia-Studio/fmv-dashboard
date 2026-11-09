// Agregado de productividad sobre un conjunto de meses (año completo o acumulado
// hasta un mes). Los ratios se calculan sobre importes y horas sumados, nunca
// como media de los ratios mensuales.

export function tieneDatosProd(d) {
  return !d.futuro && (d.ingresos !== 0 || d.totalGastos !== 0)
}

export function agregarProductividad(meses) {
  const conDatos = meses.filter(tieneDatosProd)
  const sum = (key) => conDatos.reduce((s, d) => s + (d[key] || 0), 0)
  const totalHoras = sum('horasTotales')
  const totalDias = sum('diasLab')
  const totalIngresos = sum('ingresos')
  const totalGastos = sum('totalGastos')
  const totalPersonal = sum('personalCompleto')
  const totalProveedores = sum('proveedores')
  const totalAcreedores = sum('acreedores')
  const totalResto = sum('resto')
  const conTrab = conDatos.filter(d => d.trabajadores)
  const plantillaMediaProd = conTrab.length > 0
    ? conTrab.reduce((s, d) => s + d.trabajadores, 0) / conTrab.length
    : 0
  return {
    totalHoras,
    totalDias,
    totalIngresos,
    totalGastos,
    totalPersonal,
    totalProveedores,
    totalAcreedores,
    totalResto,
    plantillaMediaProd,
    gastosHoraTotal: totalHoras ? totalGastos / totalHoras : 0,
    ingresosHora: totalHoras ? totalIngresos / totalHoras : 0,
    ingresosPorTrabajador: plantillaMediaProd ? totalIngresos / plantillaMediaProd : 0,
    ventasDiaLab: totalDias ? totalIngresos / totalDias : 0,
    pctGastosVentas: totalIngresos ? (totalGastos / totalIngresos) * 100 : 0
  }
}

// Acumulado del año desde enero hasta mesHasta (incluido)
export function acumuladoHasta(meses, mesHasta) {
  if (!mesHasta) return agregarProductividad([])
  return agregarProductividad(meses.filter(d => d.mesNum <= mesHasta))
}
