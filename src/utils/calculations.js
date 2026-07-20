// ============================================
// CÁLCULOS - FMV Dashboard v2.0
// ============================================

import { ACCOUNT_GROUPS, SERVICIOS_SUBCUENTAS, ACCOUNT_GROUPS_3, ESTRUCTURA_BALANCE, ESTRUCTURA_PYG_CCAA, CASHFLOW_BUCKETS, CASHFLOW_TESORERIA_PREFIJO, PAREJAS_PRESTAMOS_MANUAL, TIPOS_FINANCIACION_MANUAL } from './constants'

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
 * Detecta parejas préstamo L/P (17x) ↔ tramo C/P (52x) a través de los
 * asientos de traspaso, que comparten descripción en el debe de la 17x
 * y el haber de la 52x. Devuelve { cuentaLP: cuentaCP }.
 */
export function detectarParejasTraspaso(movimientos) {
  const norm = (s) => (s || '').toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

  const links = {} // descNormalizada -> { lp: Set, cp: Set }
  movimientos.forEach(mov => {
    const g = mov.cuenta.substring(0, 2)
    if (g !== '17' && g !== '52') return
    const desc = mov.descripcion || ''
    if (!/traspaso/i.test(desc)) return
    const key = norm(desc)
    if (!links[key]) links[key] = { lp: new Set(), cp: new Set() }
    if (g === '17' && mov.debe > 0) links[key].lp.add(mov.cuenta)
    if (g === '52' && mov.haber > 0) links[key].cp.add(mov.cuenta)
  })

  const parejas = {}
  Object.values(links).forEach(({ lp, cp }) => {
    if (lp.size === 1 && cp.size === 1) parejas[[...lp][0]] = [...cp][0]
  })
  return parejas
}

/**
 * Traspaso L/P→C/P de un mes: suma por pareja de min(debe 17x, haber 52x).
 * Netear por pareja evita cruzar cuotas de un préstamo con disposiciones
 * de otro. Si no se conoce ninguna pareja, cae al neteo global (heurística
 * anterior). Robusto ante snapshots agregados por (mes, cuenta).
 */
function traspasoDelMes(porCuenta, parejas) {
  const cuentasPareja = Object.entries(parejas)
  if (cuentasPareja.length === 0) {
    let debe17 = 0, haber52 = 0
    Object.entries(porCuenta).forEach(([cuenta, f]) => {
      const g = cuenta.substring(0, 2)
      if (g === '17') debe17 += f.debe
      if (g === '52') haber52 += f.haber
    })
    return Math.min(debe17, haber52)
  }
  return cuentasPareja.reduce((sum, [lp, cp]) => {
    const d17 = porCuenta[lp]?.debe || 0
    const h52 = porCuenta[cp]?.haber || 0
    return sum + Math.min(d17, h52)
  }, 0)
}

/**
 * Calcula datos de financiación
 */
export function calcularFinanciacion(movimientos, saldos, año) {
  const meses = []
  const parejas = { ...detectarParejasTraspaso(movimientos), ...PAREJAS_PRESTAMOS_MANUAL }

  // Cuentas 52x vigiladas por concepto: el objetivo operativo es llevarlas a 0
  const cuentasConfirming = Object.keys(TIPOS_FINANCIACION_MANUAL)
    .filter(c => c.startsWith('52') && TIPOS_FINANCIACION_MANUAL[c] === 'Confirming proveedores')
  const cuentasFinImpuestos = Object.keys(TIPOS_FINANCIACION_MANUAL)
    .filter(c => c.startsWith('52') && TIPOS_FINANCIACION_MANUAL[c] === 'Financiación impuestos')

  // Deuda con la que arranca el año (arrastre de ejercicios anteriores):
  // sin ella la tabla de flujos no cuadra a ojo (inicial + neto = final)
  let deudaInicial = 0
  let saldoConfirming = 0
  let saldoFinImpuestos = 0
  movimientos.forEach(mov => {
    if (mov.mes >= `${año}-01`) return
    const g = mov.cuenta.substring(0, 2)
    if (g === '17' || g === '52') deudaInicial += mov.haber - mov.debe
    if (cuentasConfirming.includes(mov.cuenta)) saldoConfirming += mov.haber - mov.debe
    if (cuentasFinImpuestos.includes(mov.cuenta)) saldoFinImpuestos += mov.haber - mov.debe
  })

  for (let m = 1; m <= 12; m++) {
    const mesKey = `${año}-${String(m).padStart(2, '0')}`
    const saldoMes = saldos[mesKey] || {}

    // Gastos financieros del mes (66x)
    const gastosFinMes = movimientos
      .filter(mov => mov.mes === mesKey && mov.grupo === '66')
      .reduce((sum, mov) => sum + (mov.debe - mov.haber), 0)

    // Flujos de deuda del mes (17x, 52x): haber = entra financiación, debe = se devuelve.
    // El traspaso L/P→C/P (debe 17 / haber 52) no es flujo real → se descuenta de ambos lados.
    const flujoDeuda = { debe17: 0, haber17: 0, debe52: 0, haber52: 0 }
    const porCuenta = {}
    movimientos.forEach(mov => {
      if (mov.mes !== mesKey) return
      const g = mov.cuenta.substring(0, 2)
      if (g !== '17' && g !== '52') return
      if (g === '17') { flujoDeuda.debe17 += mov.debe; flujoDeuda.haber17 += mov.haber }
      if (g === '52') { flujoDeuda.debe52 += mov.debe; flujoDeuda.haber52 += mov.haber }
      if (cuentasConfirming.includes(mov.cuenta)) saldoConfirming += mov.haber - mov.debe
      if (cuentasFinImpuestos.includes(mov.cuenta)) saldoFinImpuestos += mov.haber - mov.debe
      if (!porCuenta[mov.cuenta]) porCuenta[mov.cuenta] = { debe: 0, haber: 0 }
      porCuenta[mov.cuenta].debe += mov.debe
      porCuenta[mov.cuenta].haber += mov.haber
    })
    const traspaso = traspasoDelMes(porCuenta, parejas)
    const nuevaFinanciacion = flujoDeuda.haber17 + flujoDeuda.haber52 - traspaso
    const amortizacion = flujoDeuda.debe17 + flujoDeuda.debe52 - traspaso

    meses.push({
      mes: mesKey,
      deudaCorto: saldoMes['52'] || 0,
      deudaLargo: saldoMes['17'] || 0,
      deudaTotal: (saldoMes['52'] || 0) + (saldoMes['17'] || 0),
      gastosFinancieros: gastosFinMes,
      nuevaFinanciacion,
      amortizacion,
      traspasoLPCP: traspaso,
      tesoreria: saldoMes['57'] || 0,
      confirming: saldoConfirming,
      finImpuestos: saldoFinImpuestos
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
  const nuevaFinYTD = meses.reduce((sum, m) => sum + m.nuevaFinanciacion, 0)
  const amortizacionRealYTD = meses.reduce((sum, m) => sum + m.amortizacion, 0)

  // Proyección a cierre de año: media mensual de amortización real aplicada
  // a los meses restantes. La nueva financiación no se proyecta (es una
  // decisión discrecional, no un calendario contractual como las cuotas).
  let ultimoMesReal = 0
  movimientos.forEach(mov => {
    if (!mov.mes.startsWith(String(año))) return
    const m = parseInt(mov.mes.substring(5), 10)
    if (m > ultimoMesReal) ultimoMesReal = m
  })
  // BC exporta apuntes con fecha futura (vencimientos, costes esperados):
  // el último mes real nunca puede pasar del mes en curso
  const hoy = new Date()
  if (año === hoy.getFullYear()) {
    ultimoMesReal = Math.min(ultimoMesReal, hoy.getMonth() + 1)
  }

  const mediaAmortizacion = ultimoMesReal > 0 ? amortizacionRealYTD / ultimoMesReal : 0
  let deudaProyectada = ultimoMesReal > 0 ? meses[ultimoMesReal - 1].deudaTotal : 0
  let amortizacionPrevistaResto = 0
  for (let i = ultimoMesReal; i < 12; i++) {
    const amortMes = Math.min(mediaAmortizacion, deudaProyectada)
    deudaProyectada = Math.max(0, deudaProyectada - amortMes)
    amortizacionPrevistaResto += amortMes
    meses[i].proyectado = true
    meses[i].amortizacionPrevista = amortMes
    meses[i].deudaTotalPrevista = deudaProyectada
  }

  const proyeccion = {
    ultimoMesReal,
    mesesRestantes: 12 - ultimoMesReal,
    mediaAmortizacionMensual: mediaAmortizacion,
    amortizacionPrevistaResto,
    amortizacionPrevistaAño: amortizacionRealYTD + amortizacionPrevistaResto,
    deudaEstimadaCierre: deudaProyectada
  }

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
    proyeccion,
    deudaInicial,
    prestamos: calcularDetallePrestamos(movimientos, año),
    kpis: {
      deudaCorto: ultimoMes.deudaCorto,
      deudaLargo: ultimoMes.deudaLargo,
      deudaTotal: ultimoMes.deudaTotal,
      deudaNeta: ultimoMes.deudaTotal - ultimoMes.tesoreria,
      gastosFinYTD,
      amortizacionYTD,
      nuevaFinYTD,
      amortizacionRealYTD,
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
 * Desglose de deuda viva por préstamo (subcuentas 17x y 52x).
 *
 * Saldo vivo = acumulado (haber - debe) de todos los ejercicios cargados
 * hasta el fin del año indicado. El tramo C/P (52x) se empareja con su
 * préstamo L/P (17x) a través de los asientos de traspaso L/P→C/P, que
 * comparten descripción en el debe de la 17x y el haber de la 52x.
 * Las 52x sin pareja (pólizas, confirming) se listan como líneas propias.
 */
export function calcularDetallePrestamos(movimientos, año) {
  const finAño = `${año}-12`
  const cuentas = {}

  movimientos.forEach(mov => {
    const g = mov.cuenta.substring(0, 2)
    if (g !== '17' && g !== '52') return
    if (mov.mes > finAño) return

    if (!cuentas[mov.cuenta]) {
      cuentas[mov.cuenta] = {
        cuenta: mov.cuenta,
        grupo: g,
        saldo: 0,
        mesesAño: {}, // mesKey -> { debe, haber } solo del año en curso
        descripciones: {}
      }
    }
    const c = cuentas[mov.cuenta]
    c.saldo += mov.haber - mov.debe

    const desc = (mov.descripcion || '').trim()
    if (desc) c.descripciones[desc] = (c.descripciones[desc] || 0) + 1

    if (mov.mes.startsWith(String(año))) {
      if (!c.mesesAño[mov.mes]) c.mesesAño[mov.mes] = { debe: 0, haber: 0 }
      c.mesesAño[mov.mes].debe += mov.debe
      c.mesesAño[mov.mes].haber += mov.haber
    }
  })

  // Emparejar L/P ↔ C/P: detección por traspasos + mapeo manual (que manda)
  const parejaDeLP = { ...detectarParejasTraspaso(movimientos), ...PAREJAS_PRESTAMOS_MANUAL }

  // Flujos del año por préstamo: el traspaso L/P→C/P del mes dentro de la
  // pareja (min(debe 17x, haber 52x)) no es caja y se netea de ambos lados
  const flujosAño = (lp, cp) => {
    let nueva = 0, amortizado = 0, reclasificado = 0
    for (let m = 1; m <= 12; m++) {
      const mesKey = `${año}-${String(m).padStart(2, '0')}`
      const fLP = (lp && lp.mesesAño[mesKey]) || { debe: 0, haber: 0 }
      const fCP = (cp && cp.mesesAño[mesKey]) || { debe: 0, haber: 0 }
      const traspaso = lp && cp ? Math.min(fLP.debe, fCP.haber) : 0
      nueva += fLP.haber + fCP.haber - traspaso
      amortizado += fLP.debe + fCP.debe - traspaso
      reclasificado += traspaso
    }
    return { nueva, amortizado, reclasificado }
  }

  // Nombre orientativo: la descripción más repetida, priorizando las que
  // suenan a producto financiero (el nombre oficial sale del plan de cuentas)
  const mejorNombre = (c) => {
    if (!c) return ''
    const entradas = Object.entries(c.descripciones)
    if (entradas.length === 0) return ''
    const financieras = entradas.filter(([d]) =>
      /prestamo|préstamo|leasing|renting|poliza|póliza|credito|crédito|hipoteca|confirming|banco|bank/i.test(d))
    const candidatas = financieras.length > 0 ? financieras : entradas
    let nombre = candidatas.sort((a, b) => b[1] - a[1])[0][0]
    // Si es el texto de un traspaso, quedarse con el nombre del producto
    const m = nombre.match(/traspaso.*?((prestamo|préstamo|leasing|renting|poliza|póliza|credito|crédito|hipoteca).*)$/i)
    if (m) nombre = m[1].trim()
    return nombre
  }

  const cpEmparejadas = new Set(Object.values(parejaDeLP))
  const prestamos = []

  Object.values(cuentas).forEach(c => {
    if (c.grupo !== '17') return
    const cp = parejaDeLP[c.cuenta] ? cuentas[parejaDeLP[c.cuenta]] : null
    const flujos = flujosAño(c, cp)
    prestamos.push({
      cuentaLP: c.cuenta,
      cuentaCP: cp ? cp.cuenta : null,
      nombre: mejorNombre(c) || mejorNombre(cp),
      saldoLP: c.saldo,
      saldoCP: cp ? cp.saldo : 0,
      saldoTotal: c.saldo + (cp ? cp.saldo : 0),
      nuevaFinAño: flujos.nueva,
      amortizadoAño: flujos.amortizado,
      reclasificadoAño: flujos.reclasificado
    })
  })

  Object.values(cuentas).forEach(c => {
    if (c.grupo !== '52' || cpEmparejadas.has(c.cuenta)) return
    const flujos = flujosAño(null, c)
    prestamos.push({
      cuentaLP: null,
      cuentaCP: c.cuenta,
      nombre: mejorNombre(c),
      saldoLP: 0,
      saldoCP: c.saldo,
      saldoTotal: c.saldo,
      nuevaFinAño: flujos.nueva,
      amortizadoAño: flujos.amortizado,
      reclasificadoAño: flujos.reclasificado
    })
  })

  // Descartar cuentas muertas: sin saldo vivo ni movimiento en el año
  const vivos = prestamos.filter(p =>
    Math.abs(p.saldoTotal) > 0.5 || p.nuevaFinAño > 0.5 || p.amortizadoAño > 0.5)
  // Préstamos bancarios (con tramo L/P) primero, el resto después
  vivos.sort((a, b) => {
    const grupoA = a.cuentaLP ? 0 : 1
    const grupoB = b.cuentaLP ? 0 : 1
    return grupoA - grupoB || b.saldoTotal - a.saldoTotal
  })

  return {
    prestamos: vivos,
    totales: {
      saldoLP: vivos.reduce((s, p) => s + p.saldoLP, 0),
      saldoCP: vivos.reduce((s, p) => s + p.saldoCP, 0),
      saldoTotal: vivos.reduce((s, p) => s + p.saldoTotal, 0),
      nuevaFinAño: vivos.reduce((s, p) => s + p.nuevaFinAño, 0),
      amortizadoAño: vivos.reduce((s, p) => s + p.amortizadoAño, 0),
      reclasificadoAño: vivos.reduce((s, p) => s + p.reclasificadoAño, 0)
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
// ¿La cuenta es inversión? Grupo 2 sin amortización acumulada (28x) ni deterioros (29x).
// Mismo criterio que TablaPresupuestoInversiones.
export const esCuentaInversion = (cuenta) =>
  String(cuenta).startsWith('2') && !String(cuenta).startsWith('28') && !String(cuenta).startsWith('29')

// Resumen de inversiones (CAPEX) del año: presupuesto y real, del mes y acumulado.
// Se usa en la pestaña Ppto Compras para dar la foto completa de lo que vigila
// el rol compras sin tener que ir a la pestaña de Inversiones.
// Real = altas de inmovilizado (debe − haber), igual que en TablaPresupuestoInversiones.
// `presupuestos` ya viene filtrado por año desde DataContext (getByYear).
export function calcularResumenInversiones(movimientos, presupuestos, año, mes) {
  let presMes = 0, presAcum = 0, realMes = 0, realAcum = 0

  movimientos.forEach(mov => {
    if (!mov.mes || !mov.mes.startsWith(String(año))) return
    if (!esCuentaInversion(mov.cuenta)) return
    const m = parseInt(mov.mes.split('-')[1])
    const valor = mov.debe - mov.haber
    if (m === mes) realMes += valor
    if (m <= mes) realAcum += valor
  })

  ;(presupuestos || []).forEach(p => {
    if (!esCuentaInversion(p.cuenta)) return
    if (p.mes === mes) presMes += p.importe
    if (p.mes <= mes) presAcum += p.importe
  })

  const desv = (real, pres) => (!pres ? null : ((real - pres) / Math.abs(pres)) * 100)

  return {
    presMes, realMes, presAcum, realAcum,
    desvMes: desv(realMes, presMes),
    desvAcum: desv(realAcum, presAcum)
  }
}

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
    albPorCuenta[c][m] += (a.importe || 0)
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

  // Acumulador de resultado (grupos 6+7) para el Balance — acumulativo como los 1-5
  // Necesario porque sin asiento de cierre, el resultado de años anteriores
  // no está en la cuenta 129 y se perdería si solo tomamos el PyG del año
  const resultadoAcumulado = {}
  años.forEach(a => { resultadoAcumulado[a] = 0 })

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
      // PyG (grupos 6-7): solo en su año (para la tabla PyG)
      if (saldosPorAño[añoMov]) {
        if (!saldosPorAño[añoMov][cuenta]) {
          saldosPorAño[añoMov][cuenta] = { debe: 0, haber: 0, nombre: mov.descripcion || '' }
        }
        saldosPorAño[añoMov][cuenta].debe += mov.debe
        saldosPorAño[añoMov][cuenta].haber += mov.haber
        if (!saldosPorAño[añoMov][cuenta].nombre && mov.descripcion) {
          saldosPorAño[añoMov][cuenta].nombre = mov.descripcion
        }
      }
      // Acumular resultado para el Balance (haber-debe = beneficio positivo)
      años.forEach(a => {
        if (añoMov <= a) {
          resultadoAcumulado[a] += (mov.haber - mov.debe)
        }
      })
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

    // fp_vii (Resultado del ejercicio) = solo PyG del año actual
    const resultadoPyG = pyg[a]?.a5?.total || 0
    lineas['fp_vii'] = { total: resultadoPyG, cuentas: {} }

    // Inyectar resultado acumulado de ejercicios anteriores en fp_v
    // Sin asientos de cierre, el resultado de años previos (6xx/7xx) no llega a la 129.
    // resultadoAcumulado tiene TODOS los años <= a; restamos el del año actual.
    const resultadoPrevios = (resultadoAcumulado[a] || 0) - resultadoPyG
    if (Math.abs(resultadoPrevios) > 0.005) {
      const fpvPrev = lineas['fp_v'] || { total: 0, cuentas: {} }
      lineas['fp_v'] = {
        total: fpvPrev.total + resultadoPrevios,
        cuentas: {
          ...fpvPrev.cuentas,
          'SIN_CIERRE': { saldo: resultadoPrevios, nombre: 'Rdo. acumulado ej. anteriores (sin cierre contable)' }
        }
      }
    }

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

/**
 * Puente beneficio → caja (cash flow mensual agregado)
 *
 * Clasifica todos los movimientos no-57 en CASHFLOW_BUCKETS. Por partida
 * doble, la suma de contribuciones = Δ tesorería real (57), de modo que
 * el puente cuadra al céntimo salvo asientos descuadrados en origen.
 * Funciona igual con movimientos brutos y con snapshots agregados
 * (solo usa cuenta / mes / debe / haber).
 */
export function calcularPuenteCaja(movimientos, año) {
  const buckets = CASHFLOW_BUCKETS.map(b => ({
    id: b.id,
    label: b.label,
    descripcion: b.descripcion,
    meses: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0])),
    total: 0
  }))
  const porId = Object.fromEntries(buckets.map(b => [b.id, b]))
  const residual = porId['otros']

  const deltaReal = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]))
  const intereses = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]))

  movimientos.forEach(mov => {
    if (!mov.mes?.startsWith(String(año))) return
    const mes = parseInt(mov.mes.split('-')[1])
    if (!mes || mes < 1 || mes > 12) return
    const neto = (mov.debe || 0) - (mov.haber || 0)
    const cuenta = mov.cuenta || ''

    if (cuenta.startsWith(CASHFLOW_TESORERIA_PREFIJO)) {
      deltaReal[mes] += neto
      return
    }

    // Primer bucket cuyo prefijo coincida (orden de CASHFLOW_BUCKETS)
    const bucket = CASHFLOW_BUCKETS.find(b => b.prefijos.some(p => cuenta.startsWith(p)))
    const destino = bucket ? porId[bucket.id] : residual

    // Contribución a caja: una cuenta no-57 que aumenta por debe consume caja
    destino.meses[mes] += -neto
    destino.total += -neto

    // Línea informativa: intereses (66x), ya incluidos en 'beneficio'
    if (cuenta.startsWith('66')) intereses[mes] += neto
  })

  // Verificación mensual y anual
  const meses = {}
  let totalCalc = 0
  let totalReal = 0
  for (let m = 1; m <= 12; m++) {
    const calc = buckets.reduce((s, b) => s + b.meses[m], 0)
    meses[m] = { deltaCalc: calc, deltaReal: deltaReal[m], intereses: intereses[m] }
    totalCalc += calc
    totalReal += deltaReal[m]
  }
  const interesesTotal = Object.values(intereses).reduce((s, v) => s + v, 0)

  return {
    buckets,
    meses,
    totalCalc,
    totalReal,
    interesesTotal,
    cuadra: Math.abs(totalCalc - totalReal) < 0.01
  }
}
