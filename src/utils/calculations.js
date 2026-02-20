// ============================================
// CÁLCULOS - FMV Dashboard v2.0
// ============================================

import { ACCOUNT_GROUPS, SERVICIOS_SUBCUENTAS, ACCOUNT_GROUPS_3, ESTRUCTURA_BALANCE, ESTRUCTURA_PYG_CCAA } from './constants'

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
 * @param {Array} movimientos
 * @param {number} año
 * @param {Array} excludeSubcuentas - subcuentas 3 dígitos a excluir (ej: ['629'])
 */
export function calcularServiciosExt(movimientos, año, excludeSubcuentas = []) {
  const porMes = {}
  const porSubcuenta = {}

  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return
    if (mov.grupo !== '62') return

    const subcuenta = mov.subcuenta

    // Excluir subcuentas filtradas (ej: 629 para rol compras)
    if (excludeSubcuentas.length > 0 && excludeSubcuentas.includes(subcuenta)) return
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

/**
 * Calcula Presupuesto Compras: solo grupos 60 y 62
 * Combina: presupuesto + real contable + albaranes pendientes + pedidos pendientes
 */
export function calcularPresupuestoCompras(pyg3Digitos, presupuestos, albaranesPtes, pedidosPtes, mes) {
  // Agrupar presupuestos por cuenta
  const presPorCuenta = {}
  presupuestos.forEach(p => {
    const c3 = p.cuenta.substring(0, 3)
    if (!c3.startsWith('6')) return // solo gastos
    const grupo2 = c3.substring(0, 2)
    if (grupo2 !== '60' && grupo2 !== '62') return
    if (!presPorCuenta[c3]) presPorCuenta[c3] = {}
    if (!presPorCuenta[c3][p.mes]) presPorCuenta[c3][p.mes] = 0
    presPorCuenta[c3][p.mes] += p.importe
  })

  // Agrupar albaranes pendientes por cuenta 3 dígitos y mes
  const albPorCuenta = {}
  ;(albaranesPtes || []).forEach(a => {
    if (!a.es_pendiente) return
    const c = (a.cuenta_mapeada || '').substring(0, 3)
    if (!c) return
    const m = a.mes
    if (!albPorCuenta[c]) albPorCuenta[c] = {}
    if (!albPorCuenta[c][m]) albPorCuenta[c][m] = 0
    albPorCuenta[c][m] += Math.abs(a.importe || 0)
  })

  // Agrupar pedidos por cuenta 3 dígitos y mes
  const pedPorCuenta = {}
  ;(pedidosPtes || []).forEach(p => {
    const c = (p.cuenta || '').substring(0, 3)
    if (!c) return
    const m = p.mes
    if (!pedPorCuenta[c]) pedPorCuenta[c] = {}
    if (!pedPorCuenta[c][m]) pedPorCuenta[c][m] = 0
    pedPorCuenta[c][m] += Math.abs(p.importe || 0)
  })

  // Obtener todas las cuentas 3 dígitos relevantes (60x y 62x)
  const todasCuentas = new Set()
  Object.keys(ACCOUNT_GROUPS_3).forEach(c => {
    const g = c.substring(0, 2)
    if (g === '60' || g === '62') todasCuentas.add(c)
  })
  Object.keys(presPorCuenta).forEach(c => todasCuentas.add(c))
  Object.keys(albPorCuenta).forEach(c => todasCuentas.add(c))
  Object.keys(pedPorCuenta).forEach(c => todasCuentas.add(c))

  const resultado = {}
  todasCuentas.forEach(c3 => {
    const grupo2 = c3.substring(0, 2)
    if (grupo2 !== '60' && grupo2 !== '62') return

    const datos = { presMes: 0, presAcum: 0, realMes: 0, realAcum: 0, albMes: 0, albAcum: 0, pedMes: 0, pedAcum: 0 }

    // Presupuesto
    for (let m = 1; m <= mes; m++) {
      const v = presPorCuenta[c3]?.[m] || 0
      datos.presAcum += v
      if (m === mes) datos.presMes = v
    }

    // Real contable
    if (pyg3Digitos[c3]) {
      datos.realMes = pyg3Digitos[c3].meses[mes] || 0
      for (let m = 1; m <= mes; m++) datos.realAcum += pyg3Digitos[c3].meses[m] || 0
    }

    // Albaranes pendientes
    for (let m = 1; m <= mes; m++) {
      const v = albPorCuenta[c3]?.[m] || 0
      datos.albAcum += v
      if (m === mes) datos.albMes = v
    }

    // Pedidos pendientes
    for (let m = 1; m <= mes; m++) {
      const v = pedPorCuenta[c3]?.[m] || 0
      datos.pedAcum += v
      if (m === mes) datos.pedMes = v
    }

    datos.totalEstMes = datos.realMes + datos.albMes + datos.pedMes
    datos.totalEstAcum = datos.realAcum + datos.albAcum + datos.pedAcum
    datos.desvMes = datos.presMes !== 0 ? ((datos.totalEstMes - datos.presMes) / Math.abs(datos.presMes)) * 100 : null
    datos.desvAcum = datos.presAcum !== 0 ? ((datos.totalEstAcum - datos.presAcum) / Math.abs(datos.presAcum)) * 100 : null

    // Only include if there's any data
    const tieneData = datos.presMes !== 0 || datos.realMes !== 0 || datos.albMes !== 0 || datos.pedMes !== 0 ||
                      datos.presAcum !== 0 || datos.realAcum !== 0 || datos.albAcum !== 0 || datos.pedAcum !== 0
    if (tieneData) {
      resultado[c3] = {
        cuenta3: c3,
        grupo2,
        nombre: ACCOUNT_GROUPS_3[c3]?.name || `Cuenta ${c3}`,
        ...datos
      }
    }
  })

  return resultado
}

/**
 * Calcula mapeo inteligente proveedor → cuenta de gasto
 * Analiza el histórico de movimientos para sugerir la cuenta habitual de cada proveedor
 */
export function calcularMapeoProveedorCuenta(movimientos, proveedores, año) {
  const porProveedor = {}

  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return
    const grupo2 = mov.cuenta.substring(0, 2)
    if (grupo2 !== '60' && grupo2 !== '62') return
    if (!mov.codProcedencia || mov.codProcedencia === '') return
    if (mov.debe <= 0) return

    const cod = mov.codProcedencia
    if (!porProveedor[cod]) porProveedor[cod] = {}
    if (!porProveedor[cod][mov.cuenta]) porProveedor[cod][mov.cuenta] = { total: 0, num: 0 }
    porProveedor[cod][mov.cuenta].total += mov.debe
    porProveedor[cod][mov.cuenta].num += 1
  })

  const resultado = []

  Object.entries(porProveedor).forEach(([codigo, cuentas]) => {
    const totalProveedor = Object.values(cuentas).reduce((s, c) => s + c.total, 0)
    const numMovimientos = Object.values(cuentas).reduce((s, c) => s + c.num, 0)

    // Seleccionar cuenta con mayor importe
    let mejorCuenta = ''
    let mejorImporte = 0
    Object.entries(cuentas).forEach(([cuenta, data]) => {
      if (data.total > mejorImporte) {
        mejorCuenta = cuenta
        mejorImporte = data.total
      }
    })

    const cuenta3 = mejorCuenta.substring(0, 3)
    const confianza = totalProveedor > 0 ? (mejorImporte / totalProveedor) * 100 : 0

    resultado.push({
      codigo,
      nombre: proveedores[codigo] || `Proveedor ${codigo}`,
      cuentaSugerida: mejorCuenta,
      cuenta3,
      nombreCuenta3: ACCOUNT_GROUPS_3[cuenta3]?.name || `Cuenta ${cuenta3}`,
      totalDebe: totalProveedor,
      confianza: Math.round(confianza * 10) / 10,
      numMovimientos
    })
  })

  resultado.sort((a, b) => b.totalDebe - a.totalDebe)
  return resultado
}

/**
 * Calcula PyG agrupado a nivel de subcuenta completa (9 dígitos) para drill-down
 */
export function calcularPyGSubcuentas(movimientos, año) {
  const resultado = {}

  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return

    const cuenta3 = mov.cuenta.substring(0, 3)
    if (!ACCOUNT_GROUPS_3[cuenta3]) return

    const subcuenta = mov.cuenta
    if (!resultado[subcuenta]) {
      resultado[subcuenta] = {
        cuenta: subcuenta,
        cuenta3,
        nombre: mov.descripcion || `Cuenta ${subcuenta}`,
        tipo: ACCOUNT_GROUPS_3[cuenta3].type,
        meses: {}
      }
      for (let m = 1; m <= 12; m++) {
        resultado[subcuenta].meses[m] = 0
      }
    }

    const mes = parseInt(mov.mes.split('-')[1])
    const neto = mov.debe - mov.haber
    const valor = ACCOUNT_GROUPS_3[cuenta3].type === 'ingreso' ? -neto : neto

    resultado[subcuenta].meses[mes] += valor
  })

  // Calcular acumulados
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
 * Calcula Cuentas Anuales (Balance + PyG oficial PGC)
 * @param {Array} movimientos - todos los movimientos
 * @param {number} año - año actual
 * @returns {{ balance: Object, pyg: Object }}
 */
export function calcularCuentasAnuales(movimientos, año) {
  const añoAnterior = año - 1
  const años = [año, añoAnterior]

  // 1. Calcular saldo (debe-haber) por cuenta 9 dígitos para cada año
  const saldosPorAño = {}
  años.forEach(a => { saldosPorAño[a] = {} })

  movimientos.forEach(mov => {
    const añoMov = parseInt(mov.mes.split('-')[0])
    const cuenta = mov.cuenta
    const grupo1 = cuenta.charAt(0)

    // Balance (grupos 1-5): acumulativo — el movimiento afecta al saldo de cierre
    // de CADA año >= añoMov (para no necesitar asiento de apertura)
    if (grupo1 >= '1' && grupo1 <= '5') {
      años.forEach(a => {
        if (añoMov <= a) {
          if (!saldosPorAño[a][cuenta]) {
            saldosPorAño[a][cuenta] = { debe: 0, haber: 0, nombre: mov.descripcion || '' }
          }
          saldosPorAño[a][cuenta].debe += mov.debe
          saldosPorAño[a][cuenta].haber += mov.haber
          if (!saldosPorAño[a][cuenta].nombre && mov.descripcion) {
            saldosPorAño[a][cuenta].nombre = mov.descripcion
          }
        }
      })
    } else if (grupo1 === '6' || grupo1 === '7') {
      // PyG (grupos 6-7): solo en su año
      if (!saldosPorAño[añoMov]) return
      if (!saldosPorAño[añoMov][cuenta]) {
        saldosPorAño[añoMov][cuenta] = { debe: 0, haber: 0, nombre: mov.descripcion || '' }
      }
      saldosPorAño[añoMov][cuenta].debe += mov.debe
      saldosPorAño[añoMov][cuenta].haber += mov.haber
      if (!saldosPorAño[añoMov][cuenta].nombre && mov.descripcion) {
        saldosPorAño[añoMov][cuenta].nombre = mov.descripcion
      }
    }
  })

  // Helper: comprobar si una cuenta coincide con un prefijo
  const cuentaCoincide = (cuenta, prefijo) => cuenta.startsWith(prefijo)

  // Helper: comprobar si una cuenta coincide con algún prefijo de la lista
  const cuentaEnLista = (cuenta, prefijos) => prefijos.some(p => cuentaCoincide(cuenta, p))

  // 2. Calcular valores de cada línea del Balance
  const calcularLineaBalance = (linea, saldos) => {
    if (!linea.cuentas) return { total: 0, cuentas: {} }

    let total = 0
    const cuentasDetalle = {}

    Object.entries(saldos).forEach(([cuenta, data]) => {
      if (!cuentaEnLista(cuenta, linea.cuentas)) return

      // Saldo bruto = debe - haber
      const saldoBruto = data.debe - data.haber
      // Aplicar signo: activo (signo=1) muestra debe-haber, pasivo (signo=-1) muestra haber-debe
      const valor = saldoBruto * linea.signo

      if (Math.abs(valor) > 0.005) {
        cuentasDetalle[cuenta] = { saldo: valor, nombre: data.nombre }
        total += valor
      }
    })

    return { total, cuentas: cuentasDetalle }
  }

  // 3. Calcular valores de cada línea del PyG CCAA
  // Usa el signo de la LÍNEA (no de la cuenta individual) para interpretar el saldo.
  // Esto funciona correctamente incluso para líneas mixtas (ej: pyg_2 con 61x y 71x,
  // pyg_11 con 69x y 77x) porque el signo determina la convención de presentación:
  //   signo=1 (ingreso): valor = haber-debe → positivo = ingreso/ganancia
  //   signo=-1 (gasto): valor = debe-haber → positivo = gasto, luego se niega para presentar negativo
  const calcularLineaPyG = (linea, saldos) => {
    if (!linea.cuentas || linea.cuentas.length === 0) return { total: 0, cuentas: {} }

    let total = 0
    const cuentasDetalle = {}

    Object.entries(saldos).forEach(([cuenta, data]) => {
      if (!cuentaEnLista(cuenta, linea.cuentas)) return

      const saldoBruto = data.debe - data.haber
      // signo=1: valor = haber-debe (positivo = ingreso/variación favorable)
      // signo=-1: valor = debe-haber (positivo = gasto)
      const valor = linea.signo === 1 ? -saldoBruto : saldoBruto

      if (Math.abs(valor) > 0.005) {
        cuentasDetalle[cuenta] = { saldo: valor, nombre: data.nombre }
        total += valor
      }
    })

    // Gastos: negar para presentación (los gastos se muestran con signo negativo)
    if (linea.signo === -1) {
      total = -total
      Object.keys(cuentasDetalle).forEach(c => {
        cuentasDetalle[c].saldo = -cuentasDetalle[c].saldo
      })
    }

    return { total, cuentas: cuentasDetalle }
  }

  // 4. Procesar PyG CCAA para cada año (PRIMERO, porque el balance lo necesita)
  const pyg = {}
  años.forEach(a => {
    const saldos = saldosPorAño[a] || {}
    const lineas = {}

    // Calcular líneas con cuentas
    ESTRUCTURA_PYG_CCAA.forEach(item => {
      if (item.cuentas) {
        lineas[item.id] = calcularLineaPyG(item, saldos)
      }
    })

    // Calcular subtotales
    ESTRUCTURA_PYG_CCAA.forEach(item => {
      if (item.subtotalDe) {
        let total = 0
        item.subtotalDe.forEach(childId => {
          total += lineas[childId]?.total || 0
        })
        lineas[item.id] = { total, cuentas: {} }
      }
    })

    pyg[a] = lineas
  })

  // 5. Procesar Balance para cada año
  const balance = {}
  años.forEach(a => {
    const saldos = saldosPorAño[a] || {}
    const lineas = {}

    // Calcular líneas con cuentas (type='line')
    ESTRUCTURA_BALANCE.forEach(item => {
      if (item.cuentas && item.cuentas.length > 0) {
        lineas[item.id] = calcularLineaBalance(item, saldos)
      }
    })

    // fp_vii (Resultado del ejercicio) = calculado desde PyG (grupos 6+7)
    // Durante el año, el resultado vive en las cuentas 6xx/7xx, no en la 129
    const resultadoPyG = pyg[a]?.a5?.total || 0
    lineas['fp_vii'] = { total: resultadoPyG, cuentas: {} }

    // Calcular subtotales en orden de dependencia (de dentro a fuera):
    // 1. Subgroups (fp) que dependen de líneas
    // 2. Groups (pn, pnc, pc, anc, ac) que dependen de subgroups/líneas
    // 3. Totals (total_activo, total_pnp) que dependen de groups
    const subtotalItems = ESTRUCTURA_BALANCE.filter(item => item.subtotalDe)
    const depthOrder = { subgroup: 0, group: 1, total: 2 }
    subtotalItems.sort((a, b) => (depthOrder[a.type] ?? 1) - (depthOrder[b.type] ?? 1))
    subtotalItems.forEach(item => {
      let total = 0
      item.subtotalDe.forEach(childId => {
        total += lineas[childId]?.total || 0
      })
      lineas[item.id] = { total, cuentas: {} }
    })

    balance[a] = lineas
  })

  // 6. Diagnóstico: detectar cuentas de balance (1-5) no capturadas por ESTRUCTURA_BALANCE
  const prefijosBalance = []
  ESTRUCTURA_BALANCE.forEach(item => {
    if (item.cuentas && item.cuentas.length > 0) {
      prefijosBalance.push(...item.cuentas)
    }
  })

  const cuentasHuerfanas = {}
  años.forEach(a => {
    const huerfanas = {}
    Object.entries(saldosPorAño[a] || {}).forEach(([cuenta, data]) => {
      const grupo1 = cuenta.charAt(0)
      if (grupo1 < '1' || grupo1 > '5') return
      const saldo = data.debe - data.haber
      if (Math.abs(saldo) < 0.01) return
      const capturada = prefijosBalance.some(p => cuenta.startsWith(p))
      if (!capturada) {
        huerfanas[cuenta] = { saldo, nombre: data.nombre }
      }
    })
    if (Object.keys(huerfanas).length > 0) {
      cuentasHuerfanas[a] = huerfanas
    }
  })

  return { balance, pyg, cuentasHuerfanas }
}

/**
 * Calcula el total de una sub-línea (child) filtrando las cuentas del padre
 * por los prefijos del child. Solo para drill-down visual, no afecta totales.
 */
export function calcularSubLinea(parentCuentas, childPrefixes) {
  let total = 0
  const cuentas = {}
  Object.entries(parentCuentas).forEach(([cuenta, data]) => {
    if (childPrefixes.some(p => cuenta.startsWith(p))) {
      total += data.saldo
      cuentas[cuenta] = data
    }
  })
  return { total, cuentas }
}
