// ============================================
// GENERATE SNAPSHOT - Años cerrados a JSON estatico
// ============================================
//
// Lee todos los movimientos de un año desde Supabase y genera un fichero
// JSON con los movimientos AGREGADOS por (mes, cuenta_9digits).
//
// El JSON resultante es compatible con todas las funciones de calculations.js
// porque preserva los campos clave: mes, cuenta, grupo, subcuenta, debe, haber,
// fecha (ultimo dia del mes), descripcion (nombre cuenta).
//
// Lo que NO se preserva (asumido innecesario para años cerrados):
//   - codProcedencia: solo se usa en pestaña Proveedores y filtra por año actual
//   - documento: solo se usa en exportaciones de drill-down
//   - fecha exacta: se usa solo para ordenar saldos; la suma por mes es invariante
//
// Uso:
//   node scripts/generate-snapshot.js          # genera 2023 y 2024
//   node scripts/generate-snapshot.js 2024     # genera solo 2024
//
// Output: src/data/saldos_<año>.json
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// --- Cargar .env ---
const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8')
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim()
const SERVICE_ROLE = envContent.match(/SERVICE\s*ROL\s*=\s*(.+)/)?.[1]?.trim()
  || envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.+)/)?.[1]?.trim()

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('ERROR: faltan VITE_SUPABASE_URL o SERVICE ROL en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

// --- Args ---
const argYear = process.argv[2] ? parseInt(process.argv[2]) : null
const AÑOS_OBJETIVO = argYear ? [argYear] : [2023, 2024]

// --- Descargar movimientos por año ---
async function fetchAllMovimientos(año) {
  const PAGE_SIZE = 5000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('movimientos')
      .select('fecha, cuenta, grupo, subcuenta, debe, haber, descripcion, mes, año')
      .eq('año', año)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    process.stdout.write(`\r  ${año}: ${all.length} movs descargados...`)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  process.stdout.write('\n')
  return all
}

// --- Agregar por (mes, cuenta) ---
function agregar(movimientos) {
  const agg = new Map()
  for (const m of movimientos) {
    const key = `${m.mes}|${m.cuenta}`
    let row = agg.get(key)
    if (!row) {
      row = {
        mes: m.mes,
        cuenta: m.cuenta,
        grupo: m.grupo,
        subcuenta: m.subcuenta,
        debe: 0,
        haber: 0,
        descripcion: m.descripcion || ''
      }
      agg.set(key, row)
    }
    row.debe += Number(m.debe || 0)
    row.haber += Number(m.haber || 0)
    if (!row.descripcion && m.descripcion) row.descripcion = m.descripcion
  }

  // Añadir fecha (ultimo dia del mes), neto, año, codProcedencia=null
  return Array.from(agg.values()).map(row => {
    const [yyyy, mm] = row.mes.split('-')
    const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate()
    return {
      fecha: `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`,
      cuenta: row.cuenta,
      grupo: row.grupo,
      subcuenta: row.subcuenta,
      debe: Math.round(row.debe * 100) / 100,
      haber: Math.round(row.haber * 100) / 100,
      neto: Math.round((row.debe - row.haber) * 100) / 100,
      codProcedencia: null,
      descripcion: row.descripcion,
      documento: null,
      mes: row.mes,
      año: Number(yyyy)
    }
  })
}

// --- Verificacion: totales debe/haber deben coincidir ---
function verificar(originales, agregados) {
  const sum = (arr, f) => arr.reduce((s, x) => s + Number(x[f] || 0), 0)
  const debeOrig = sum(originales, 'debe')
  const haberOrig = sum(originales, 'haber')
  const debeAgg = sum(agregados, 'debe')
  const haberAgg = sum(agregados, 'haber')
  const tolDebe = Math.abs(debeOrig - debeAgg)
  const tolHaber = Math.abs(haberOrig - haberAgg)
  const ok = tolDebe < 1 && tolHaber < 1  // tolerancia 1 EUR por redondeos
  return {
    ok,
    debeOrig, debeAgg, tolDebe,
    haberOrig, haberAgg, tolHaber
  }
}

// --- Main ---
async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  GENERADOR SNAPSHOT FMV')
  console.log('═══════════════════════════════════════')
  console.log(`Años objetivo: ${AÑOS_OBJETIVO.join(', ')}`)

  const outDir = resolve(ROOT, 'src/data')
  mkdirSync(outDir, { recursive: true })

  for (const año of AÑOS_OBJETIVO) {
    console.log(`\n--- Año ${año} ---`)
    let originales
    try {
      originales = await fetchAllMovimientos(año)
    } catch (err) {
      console.error(`  ERROR descargando ${año}:`, err.message)
      continue
    }

    if (originales.length === 0) {
      console.log(`  ⚠ Sin movimientos en Supabase para ${año}. Skip.`)
      continue
    }

    const agregados = agregar(originales)
    const ratio = (agregados.length / originales.length * 100).toFixed(1)
    console.log(`  Originales: ${originales.length}`)
    console.log(`  Agregados:  ${agregados.length} (${ratio}% del original)`)

    const v = verificar(originales, agregados)
    if (!v.ok) {
      console.error(`  ✗ DESCUADRE en ${año}!`)
      console.error(`    Debe:  ${v.debeOrig.toFixed(2)} vs ${v.debeAgg.toFixed(2)} (dif: ${v.tolDebe.toFixed(2)})`)
      console.error(`    Haber: ${v.haberOrig.toFixed(2)} vs ${v.haberAgg.toFixed(2)} (dif: ${v.tolHaber.toFixed(2)})`)
      console.error(`  Snapshot NO escrito`)
      continue
    }
    console.log(`  ✓ Totales debe/haber cuadran (dif <1 EUR)`)

    const snapshot = {
      año,
      generado: new Date().toISOString(),
      movimientosOriginales: originales.length,
      movimientosAgregados: agregados.length,
      totales: {
        debe: Math.round(v.debeAgg * 100) / 100,
        haber: Math.round(v.haberAgg * 100) / 100
      },
      movimientos: agregados
    }

    const outFile = resolve(outDir, `saldos_${año}.json`)
    writeFileSync(outFile, JSON.stringify(snapshot))
    const sizeKB = (statSync(outFile).size / 1024).toFixed(1)
    console.log(`  ✓ ${outFile.replace(ROOT, '.')} (${sizeKB} KB)`)
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  COMPLETADO')
  console.log('═══════════════════════════════════════')
}

main().catch(err => {
  console.error('\n✗ Error fatal:', err)
  process.exit(1)
})
