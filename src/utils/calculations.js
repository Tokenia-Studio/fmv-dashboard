// ============================================
// CÁLCULOS - FMV Dashboard v2.0
// ============================================

import { ACCOUNT_GROUPS, SERVICIOS_SUBCUENTAS, ACCOUNT_GROUPS_3 } from './constants'

/**
 * Agrupa movimientos por mes y categoría para PyG
 */
export function calcularPyG(movimientos, año) {
  const meses = {}

  // Inicializar 12 meses
  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    meses[mesKey] = {
      ventas: 0,
      compras: 0,
      varExistMP: 0,  // Variación existencias MP (61) - afecta aprovisionamientos
      varExistPT: 0,  // Variación existencias PT (71) - ingreso por producción
      servicios: 0,
      personal: 0,
      subvenciones: 0,
      otrosIngExplot: 0,
      restoGastos: 0,
      amortizaciones: 0,
      gastosFinancieros: 0,
      ingExcepc: 0,
      ingFinancieros: 0,
      otrosIngresos: 0
    }
  }

  // Procesar movimientos
  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return

    const grupo = mov.grupo
    const config = ACCOUNT_GROUPS[grupo]
    if (!config) return

    const neto = mov.debe - mov.haber
    const valor = config.sign === 1 ? -neto : neto // Ingresos: haber-debe, Gastos: debe-haber

    if (meses[mov.mes]) {
      meses[mov.mes][config.category] = (meses[mov.mes][config.category] || 0) + valor
    }
  })

  // Calcular subtotales
  // Fórmula PyG estándar:
  // Aprovisionamientos = Compras + VarExistMP (61 reduce el coste si existencias suben)
  // Producción = Ventas + VarExistPT (71 añade valor si producción > ventas)
  return Object.entries(meses).map(([mes, data]) => {
    // VarExist combinado para mostrar en tabla (compatible con vista anterior)
    const varExist = data.varExistPT - data.varExistMP

    // Margen Bruto = Ventas + VarExistPT - Compras - VarExistMP
    const margenBruto = data.ventas + data.varExistPT - data.compras - data.varExistMP

    const ebitda = margenBruto - data.servicios - data.personal + data.subvenciones + data.otrosIngExplot + data.otrosIngresos
    const resultado = ebitda - data.restoGastos - data.amortizaciones - data.gastosFinancieros + data.ingExcepc + data.ingFinancieros

    return {
      mes,
      ...data,
      varExist,  // Para compatibilidad con la tabla
      margenBruto,
      ebitda,
      resultado
    }
  }).sort((a, b) => a.mes.localeCompare(b.mes))
}

/**
 * Calcula totales anuales de PyG
 */
export function calcularTotalesPyG(datosMensuales) {
  return datosMensuales.reduce((acc, mes) => {
    Object.keys(mes).forEach(key => {
      if (key !== 'mes' && typeof mes[key] === 'number') {
        acc[key] = (acc[key] || 0) + mes[key]
      }
    })
    return acc
  }, {})
}

/**
 * Agrupa servicios exteriores por subcuenta (3 dígitos)
 */
export function calcularServiciosExt(movimientos, año) {
  const porMes = {}
  const porSubcuenta = {}

  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return
    if (mov.grupo !== '62') return

    const subcuenta = mov.subcuenta
    const valor = mov.debe - mov.haber

    // Por mes (para barras apiladas)
    if (!porMes[mov.mes]) porMes[mov.mes] = {}
    porMes[mov.mes][subcuenta] = (porMes[mov.mes][subcuenta] || 0) + valor

    // Por subcuenta (para líneas)
    if (!porSubcuenta[subcuenta]) porSubcuenta[subcuenta] = { total: 0, meses: {} }
    porSubcuenta[subcuenta].total += valor
    porSubcuenta[subcuenta].meses[mov.mes] = (porSubcuenta[subcuenta].meses[mov.mes] || 0) + valor
  })

  // Formatear para gráficos
  const mesesArray = []
  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    const datosMes = porMes[mesKey] || {}
    mesesArray.push({
      mes: mesKey,
      ...datosMes,
      total: Object.values(datosMes).reduce((sum, v) => sum + v, 0)
    })
  }

  // Top subcuentas por importe total
  const subcuentasOrdenadas = Object.entries(porSubcuenta)
    .map(([codigo, data]) => ({
      codigo,
      nombre: SERVICIOS_SUBCUENTAS[codigo]?.name || `Cuenta ${codigo}`,
      color: SERVICIOS_SUBCUENTAS[codigo]?.color || '#6b7280',
      total: data.total,
      meses: data.meses
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  return { porMes: mesesArray, subcuentas: subcuentasOrdenadas }
}

/**
 * Calcula saldos de balance (para 17x, 52x, 57x, 40x, 41x)
 */
export function calcularSaldosBalance(movimientos, año) {
  const saldos = {}
  const cuentasBalance = ['17', '40', '41', '52', '57']

  // Inicializar meses
  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    saldos[mesKey] = {}
    cuentasBalance.forEach(cuenta => {
      saldos[mesKey][cuenta] = 0
    })
  }

  // Ordenar movimientos por fecha
  const movsOrdenados = [...movimientos].sort((a, b) =>
    new Date(a.fecha) - new Date(b.fecha)
  )

  // Calcular saldo acumulado
  const saldoAcumulado = {}
  cuentasBalance.forEach(cuenta => saldoAcumulado[cuenta] = 0)

  movsOrdenados.forEach(mov => {
    const grupo2 = mov.cuenta.substring(0, 2)
    if (!cuentasBalance.includes(grupo2)) return

    // Activo (57): debe aumenta, haber disminuye
    // Pasivo (17, 40, 41, 52): haber aumenta, debe disminuye
    const esActivo = grupo2 === '57'
    const delta = esActivo ? (mov.debe - mov.haber) : (mov.haber - mov.debe)
    saldoAcumulado[grupo2] += delta

    // Guardar saldo fin de mes
    if (saldos[mov.mes]) {
      saldos[mov.mes][grupo2] = saldoAcumulado[grupo2]
    }
  })

  // Propagar saldos a meses sin movimientos
  let ultimoSaldo = {}
  cuentasBalance.forEach(cuenta => ultimoSaldo[cuenta] = 0)

  Object.keys(saldos).sort().forEach(mes => {
    cuentasBalance.forEach(cuenta => {
      if (saldos[mes][cuenta] === 0 && ultimoSaldo[cuenta] !== 0) {
        saldos[mes][cuenta] = ultimoSaldo[cuenta]
      } else {
        ultimoSaldo[cuenta] = saldos[mes][cuenta]
      }
    })
  })

  return saldos
}

/**
 * Calcula datos de financiación
 */
export function calcularFinanciacion(movimientos, saldos, año) {
  const meses = []

  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    const saldoMes = saldos[mesKey] || {}

    // Gastos financieros del mes (66x)
    const gastosFinMes = movimientos
      .filter(mov => mov.mes === mesKey && mov.grupo === '66')
      .reduce((sum, mov) => sum + (mov.debe - mov.haber), 0)

    meses.push({
      mes: mesKey,
      deudaCorto: saldoMes['52'] || 0,
      deudaLargo: saldoMes['17'] || 0,
      deudaTotal: (saldoMes['52'] || 0) + (saldoMes['17'] || 0),
      gastosFinancieros: gastosFinMes,
      tesoreria: saldoMes['57'] || 0
    })
  }

  // Calcular variaciones (amortizaciones de deuda)
  for (let i = 1; i < meses.length; i++) {
    const anterior = meses[i - 1]
    const actual = meses[i]
    actual.amortizacionDeuda = Math.max(0, anterior.deudaTotal - actual.deudaTotal)
  }

  // Totales
  const gastosFinYTD = meses.reduce((sum, m) => sum + m.gastosFinancieros, 0)
  const amortizacionYTD = meses.reduce((sum, m) => sum + (m.amortizacionDeuda || 0), 0)

  // Ratios (usando último mes con datos)
  const ultimoMes = [...meses].reverse().find(m => m.deudaTotal > 0 || m.tesoreria > 0) || meses[11]
  const ebitdaAnual = movimientos
    .filter(m => m.mes.startsWith(String(año)))
    .reduce((sum, m) => {
      const config = ACCOUNT_GROUPS[m.grupo]
      if (!config) return sum
      const neto = m.debe - m.haber
      const valor = config.sign === 1 ? -neto : neto
      // Solo categorías que forman EBITDA
      if (['ventas', 'compras', 'varExist', 'servicios', 'personal', 'subvenciones', 'otrosIngExplot'].includes(config.category)) {
        return sum + (config.category === 'ventas' || config.category === 'subvenciones' || config.category === 'otrosIngExplot' ? valor : -valor)
      }
      return sum
    }, 0)

  return {
    meses,
    kpis: {
      deudaCorto: ultimoMes.deudaCorto,
      deudaLargo: ultimoMes.deudaLargo,
      deudaTotal: ultimoMes.deudaTotal,
      deudaNeta: ultimoMes.deudaTotal - ultimoMes.tesoreria,
      gastosFinYTD,
      amortizacionYTD,
      tesoreria: ultimoMes.tesoreria
    },
    ratios: {
      deudaEbitda: ebitdaAnual !== 0 ? ultimoMes.deudaTotal / ebitdaAnual : null,
      coberturaIntereses: gastosFinYTD !== 0 ? ebitdaAnual / gastosFinYTD : null,
      costeMedioDeuda: ultimoMes.deudaTotal !== 0 ? (gastosFinYTD / ultimoMes.deudaTotal) * 100 : null
    }
  }
}

/**
 * Calcula gastos por proveedor (compras 60x + servicios 62x, sin IVA)
 */
export function calcularPagosProveedores(movimientos, proveedores, año) {
  const gastosPorProveedor = {}
  const gastosPorMes = {}

  // Filtrar movimientos de gasto (60x compras, 62x servicios) - excluir IVA (472)
  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return
    const grupo2 = mov.cuenta.substring(0, 2)

    // Solo cuentas de gasto: 60 (compras) y 62 (servicios exteriores)
    if (grupo2 !== '60' && grupo2 !== '62') return

    // Excluir IVA (por si acaso hay algún movimiento mal clasificado)
    if (mov.cuenta.startsWith('472')) return

    // Gasto = debe - haber (normalmente será debe positivo)
    const gasto = mov.debe - mov.haber
    if (gasto <= 0) return

    const codProv = mov.codProcedencia || 'SIN_CODIGO'
    const nombreProv = proveedores[codProv] || (codProv === 'SIN_CODIGO' ? 'Sin proveedor asignado' : `Proveedor ${codProv}`)

    // Por proveedor
    if (!gastosPorProveedor[codProv]) {
      gastosPorProveedor[codProv] = {
        codigo: codProv,
        nombre: nombreProv,
        total: 0,
        compras: 0,
        servicios: 0,
        numFacturas: 0,
        movimientos: []
      }
    }
    gastosPorProveedor[codProv].total += gasto
    if (grupo2 === '60') {
      gastosPorProveedor[codProv].compras += gasto
    } else {
      gastosPorProveedor[codProv].servicios += gasto
    }
    gastosPorProveedor[codProv].numFacturas += 1
    gastosPorProveedor[codProv].movimientos.push(mov)

    // Por mes
    if (!gastosPorMes[mov.mes]) gastosPorMes[mov.mes] = 0
    gastosPorMes[mov.mes] += gasto
  })

  // Top 15 proveedores por gasto
  const top15 = Object.values(gastosPorProveedor)
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)

  // Total gastos
  const totalPagos = Object.values(gastosPorProveedor).reduce((sum, p) => sum + p.total, 0)

  // Datos mensuales
  const datosMensuales = []
  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    datosMensuales.push({
      mes: mesKey,
      pagos: gastosPorMes[mesKey] || 0
    })
  }

  return {
    top15,
    totalPagos,
    datosMensuales,
    todosProveedores: gastosPorProveedor
  }
}

/**
 * Calcula flujo de efectivo
 */
export function calcularCashFlow(movimientos, saldos, año) {
  const meses = []

  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    const saldoActual = saldos[mesKey]?.['57'] || 0
    const saldoAnterior = m > 1
      ? saldos[`${año}-${String(m - 1).padStart(2, '0')}`]?.['57'] || 0
      : 0

    meses.push({
      mes: mesKey,
      saldo: saldoActual,
      variacion: saldoActual - saldoAnterior
    })
  }

  // KPIs
  const ultimoMes = meses[meses.length - 1]
  const variacionTotal = meses.reduce((sum, m) => sum + m.variacion, 0)

  return {
    meses,
    kpis: {
      saldoActual: ultimoMes.saldo,
      variacionMes: ultimoMes.variacion,
      variacionYTD: variacionTotal
    }
  }
}

/**
 * Calcula PyG agrupado a nivel de 3 dígitos (para presupuesto)
 */
export function calcularPyG3Digitos(movimientos, año) {
  const resultado = {}

  // Inicializar estructura: cada cuenta 3 dígitos con 12 meses
  Object.keys(ACCOUNT_GROUPS_3).forEach(cuenta => {
    resultado[cuenta] = {
      cuenta,
      nombre: ACCOUNT_GROUPS_3[cuenta].name,
      tipo: ACCOUNT_GROUPS_3[cuenta].type,
      meses: {}
    }
    for (let m = 1; m <= 12; m++) {
      resultado[cuenta].meses[m] = 0
    }
  })

  // Procesar movimientos
  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return

    const cuenta3 = mov.cuenta.substring(0, 3)
    if (!ACCOUNT_GROUPS_3[cuenta3]) return

    const mes = parseInt(mov.mes.split('-')[1])
    const neto = mov.debe - mov.haber

    // Ingresos: haber - debe (valor positivo = ingreso)
    // Gastos: debe - haber (valor positivo = gasto)
    const valor = ACCOUNT_GROUPS_3[cuenta3].type === 'ingreso' ? -neto : neto

    resultado[cuenta3].meses[mes] += valor
  })

  // Calcular totales acumulados
  Object.keys(resultado).forEach(cuenta => {
    let acumulado = 0
    for (let m = 1; m <= 12; m++) {
      acumulado += resultado[cuenta].meses[m]
      resultado[cuenta].meses[`acum_${m}`] = acumulado
    }
    resultado[cuenta].totalAnual = acumulado
  })

  return resultado
}

/**
 * Compara presupuesto vs real
 */
export function calcularPresupuestoVsReal(pyg3Digitos, presupuestos, mesActual) {
  const resultado = []

  // Agrupar presupuestos por cuenta
  const presupuestosPorCuenta = {}
  presupuestos.forEach(p => {
    if (!presupuestosPorCuenta[p.cuenta]) {
      presupuestosPorCuenta[p.cuenta] = { meses: {}, acumulados: {} }
    }
    presupuestosPorCuenta[p.cuenta].meses[p.mes] = p.importe
  })

  // Calcular acumulados de presupuesto
  Object.keys(presupuestosPorCuenta).forEach(cuenta => {
    let acum = 0
    for (let m = 1; m <= 12; m++) {
      acum += presupuestosPorCuenta[cuenta].meses[m] || 0
      presupuestosPorCuenta[cuenta].acumulados[m] = acum
    }
  })

  // Combinar datos reales con presupuesto
  Object.keys(pyg3Digitos).forEach(cuenta => {
    const real = pyg3Digitos[cuenta]
    const pres = presupuestosPorCuenta[cuenta] || { meses: {}, acumulados: {} }

    const presMes = pres.meses[mesActual] || 0
    const realMes = real.meses[mesActual] || 0
    const varMes = presMes !== 0 ? ((realMes - presMes) / Math.abs(presMes)) * 100 : null

    const presAcum = pres.acumulados[mesActual] || 0
    const realAcum = real.meses[`acum_${mesActual}`] || 0
    const varAcum = presAcum !== 0 ? ((realAcum - presAcum) / Math.abs(presAcum)) * 100 : null

    const cumplimiento = presAcum !== 0 ? (realAcum / presAcum) * 100 : null

    resultado.push({
      cuenta,
      nombre: real.nombre,
      tipo: real.tipo,
      presMes,
      realMes,
      varMes,
      presAcum,
      realAcum,
      varAcum,
      cumplimiento
    })
  })

  // Ordenar: primero ingresos (7xx), luego gastos (6xx)
  resultado.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'ingreso' ? -1 : 1
    return a.cuenta.localeCompare(b.cuenta)
  })

  return resultado
}
