// ============================================
// VALIDATE SNAPSHOT - Comprueba que los cálculos sobre el JSON
// agregado dan exactamente el mismo resultado que sobre los
// movimientos brutos descargados de Supabase.
//
// Uso: node scripts/validate-snapshot.js [año]
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import {
  calcularPyG,
  calcularTotalesPyG,
  calcularSaldosBalance,
  calcularServiciosExt,
  calcularFinanciacion,
  calcularCashFlow,
  calcularPyG3Digitos,
  calcularCuentasAnuales
} from '../src/utils/calculations.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Cargar .env ---
const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8')
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim()
const SERVICE_ROLE = envContent.match(/SERVICE\s*ROL\s*=\s*(.+)/)?.[1]?.trim()
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const TOL = 0.5  // tolerancia 50 céntimos por errores acumulados de redondeo

// --- Comparador de números ---
function diffNum(a, b, label) {
  const d = Math.abs((a || 0) - (b || 0))
  if (d > TOL) return { label, raw: a, snap: b, diff: d }
  return null
}

function comparar(label, raw, snap, fields) {
  const errs = []
  for (const f of fields) {
    const e = diffNum(raw[f], snap[f], `${label}.${f}`)
    if (e) errs.push(e)
  }
  return errs
}

// --- Descargar movimientos ---
async function fetchAllMovimientos(año) {
  const PAGE_SIZE = 5000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('movimientos')
      .select('fecha, cuenta, grupo, subcuenta, debe, haber, descripcion, mes, año, cod_procedencia, documento')
      .eq('año', año)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    // mapear cod_procedencia → codProcedencia
    all = all.concat(data.map(m => ({ ...m, codProcedencia: m.cod_procedencia })))
    process.stdout.write(`\r  Descargando ${año}: ${all.length}...`)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  process.stdout.write('\n')
  return all
}

// --- Validar un año ---
async function validar(año) {
  console.log(`\n═══ AÑO ${año} ═══`)

  console.log('1. Cargando movimientos brutos de Supabase...')
  const raw = await fetchAllMovimientos(año)
  console.log(`   ${raw.length} movimientos brutos`)

  console.log('2. Cargando snapshot agregado...')
  const snapPath = resolve(ROOT, `src/data/saldos_${año}.json`)
  const snap = JSON.parse(readFileSync(snapPath, 'utf-8'))
  console.log(`   ${snap.movimientos.length} movimientos agregados (snapshot)`)

  const errors = []

  // ---- PyG ----
  console.log('\n3. Comparando PyG mensual...')
  const pygRaw = calcularPyG(raw, año)
  const pygSnap = calcularPyG(snap.movimientos, año)
  const totRaw = calcularTotalesPyG(pygRaw)
  const totSnap = calcularTotalesPyG(pygSnap)
  const pygFields = ['ventas', 'compras', 'varExistMP', 'varExistPT', 'servicios',
    'personal', 'subvenciones', 'otrosIngExplot', 'restoGastos', 'amortizaciones',
    'gastosFinancieros', 'ingExcepc', 'ingFinancieros', 'otrosIngresos',
    'margenBruto', 'ebitda', 'resultado']
  const ePyG = comparar('PyG.totales', totRaw, totSnap, pygFields)
  if (ePyG.length === 0) console.log('   ✓ Totales PyG iguales')
  else { console.log(`   ✗ ${ePyG.length} diferencias`); errors.push(...ePyG) }

  // Mes a mes
  let mesesIguales = 0
  for (let i = 0; i < 12; i++) {
    const eMes = comparar(`PyG.mes${i+1}`, pygRaw[i], pygSnap[i], pygFields)
    if (eMes.length === 0) mesesIguales++
    else errors.push(...eMes)
  }
  console.log(`   ✓ ${mesesIguales}/12 meses iguales`)

  // ---- Saldos Balance ----
  console.log('\n4. Comparando saldos Balance (17, 40, 41, 52, 57)...')
  const saldosRaw = calcularSaldosBalance(raw, año)
  const saldosSnap = calcularSaldosBalance(snap.movimientos, año)
  let saldosOk = 0
  let saldosErr = 0
  for (let m = 1; m <= 12; m++) {
    const mk = `${año}-${String(m).padStart(2, '0')}`
    for (const cta of ['17', '40', '41', '52', '57']) {
      const e = diffNum(saldosRaw[mk][cta], saldosSnap[mk][cta], `Saldo.${mk}.${cta}`)
      if (e) { errors.push(e); saldosErr++ } else saldosOk++
    }
  }
  console.log(`   ✓ ${saldosOk} OK / ✗ ${saldosErr} dif`)

  // ---- Servicios Ext ----
  console.log('\n5. Comparando Servicios Exteriores...')
  const sExtRaw = calcularServiciosExt(raw, año)
  const sExtSnap = calcularServiciosExt(snap.movimientos, año)
  const totSubRaw = sExtRaw.subcuentas.reduce((a, s) => a + s.total, 0)
  const totSubSnap = sExtSnap.subcuentas.reduce((a, s) => a + s.total, 0)
  const eSExt = diffNum(totSubRaw, totSubSnap, 'ServExt.total')
  if (eSExt) { errors.push(eSExt); console.log(`   ✗ ${eSExt.diff.toFixed(2)} dif`) }
  else console.log(`   ✓ Total iguales (${totSubRaw.toFixed(2)})`)

  // ---- Financiacion ----
  console.log('\n6. Comparando Financiacion...')
  const finRaw = calcularFinanciacion(raw, saldosRaw, año)
  const finSnap = calcularFinanciacion(snap.movimientos, saldosSnap, año)
  const finFields = ['deudaCorto', 'deudaLargo', 'deudaTotal', 'gastosFinYTD', 'tesoreria']
  const eFin = comparar('Fin.kpis', finRaw.kpis, finSnap.kpis, finFields)
  if (eFin.length === 0) console.log('   ✓ KPIs Financiacion iguales')
  else { console.log(`   ✗ ${eFin.length} dif`); errors.push(...eFin) }

  // ---- CashFlow ----
  console.log('\n7. Comparando Cash Flow...')
  const cfRaw = calcularCashFlow(raw, saldosRaw, año)
  const cfSnap = calcularCashFlow(snap.movimientos, saldosSnap, año)
  const eCf = comparar('CF.kpis', cfRaw.kpis, cfSnap.kpis, ['saldoActual', 'variacionMes', 'variacionYTD'])
  if (eCf.length === 0) console.log('   ✓ KPIs CashFlow iguales')
  else { console.log(`   ✗ ${eCf.length} dif`); errors.push(...eCf) }

  // ---- PyG 3 dígitos ----
  console.log('\n8. Comparando PyG 3 dígitos (cuenta a cuenta)...')
  const pyg3Raw = calcularPyG3Digitos(raw, año)
  const pyg3Snap = calcularPyG3Digitos(snap.movimientos, año)
  let pyg3Ok = 0
  let pyg3Err = 0
  for (const cta of Object.keys(pyg3Raw)) {
    const e = diffNum(pyg3Raw[cta].totalAnual, pyg3Snap[cta]?.totalAnual, `PyG3.${cta}`)
    if (e) { errors.push(e); pyg3Err++ } else pyg3Ok++
  }
  console.log(`   ✓ ${pyg3Ok} cuentas OK / ✗ ${pyg3Err} dif`)

  // ---- Cuentas Anuales (PyG + Balance, línea a línea, solo año actual) ----
  console.log('\n9. Comparando Cuentas Anuales (línea a línea)...')
  const ccaaRaw = calcularCuentasAnuales(raw, año)
  const ccaaSnap = calcularCuentasAnuales(snap.movimientos, año)
  let pygOk = 0, pygErr = 0
  Object.keys(ccaaRaw.pyg[año] || {}).forEach(id => {
    const e = diffNum(ccaaRaw.pyg[año][id].total, ccaaSnap.pyg[año]?.[id]?.total, `CCAA.pyg.${id}`)
    if (e) { errors.push(e); pygErr++ } else pygOk++
  })
  console.log(`   PyG: ✓ ${pygOk} líneas OK / ✗ ${pygErr} dif`)

  let balOk = 0, balErr = 0
  Object.keys(ccaaRaw.balance[año] || {}).forEach(id => {
    const e = diffNum(ccaaRaw.balance[año][id].total, ccaaSnap.balance[año]?.[id]?.total, `CCAA.balance.${id}`)
    if (e) { errors.push(e); balErr++ } else balOk++
  })
  console.log(`   Balance: ✓ ${balOk} líneas OK / ✗ ${balErr} dif`)

  return errors
}

// --- Main ---
async function main() {
  const argYear = process.argv[2] ? parseInt(process.argv[2]) : null
  const años = argYear ? [argYear] : [2023, 2024]

  console.log('═══════════════════════════════════════')
  console.log('  VALIDADOR SNAPSHOT FMV')
  console.log('═══════════════════════════════════════')

  const todosErrores = []
  for (const año of años) {
    const errs = await validar(año)
    if (errs.length > 0) {
      todosErrores.push({ año, errs })
    }
  }

  console.log('\n═══════════════════════════════════════')
  if (todosErrores.length === 0) {
    console.log('  ✓ TODO CUADRA — snapshot validado')
  } else {
    console.log('  ✗ HAY DIFERENCIAS')
    todosErrores.forEach(({ año, errs }) => {
      console.log(`\n  Año ${año}: ${errs.length} diferencias`)
      errs.slice(0, 10).forEach(e => {
        console.log(`    - ${e.label}: raw=${e.raw?.toFixed?.(2) || e.raw} snap=${e.snap?.toFixed?.(2) || e.snap} dif=${e.diff?.toFixed?.(2)}`)
      })
      if (errs.length > 10) console.log(`    ...y ${errs.length - 10} más`)
    })
    process.exit(1)
  }
  console.log('═══════════════════════════════════════')
}

main().catch(err => {
  console.error('\n✗ Error fatal:', err)
  process.exit(1)
})
