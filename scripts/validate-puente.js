// ============================================
// VALIDATE PUENTE - Comprueba que el puente beneficio → caja
// (calcularPuenteCaja) cuadra al céntimo con la variación real
// de tesorería (57) en los saldos de años cerrados (tabla saldos_cerrados,
// leída con la clave de servicio del .env).
//
// Uso: node --loader ./scripts/loader.mjs scripts/validate-puente.js [año]
// ============================================

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { calcularPuenteCaja } from '../src/utils/calculations.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8')
const supabase = createClient(
  envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim(),
  envContent.match(/SERVICE\s*ROL\s*=\s*(.+)/)?.[1]?.trim(),
  { auth: { persistSession: false } }
)

const añoArg = process.argv[2] ? parseInt(process.argv[2]) : null
const años = añoArg ? [añoArg] : [2022, 2023, 2024]

const fmt = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

let fallos = 0

for (const año of años) {
  const { data, error } = await supabase.from('saldos_cerrados').select('*').eq('año', año).order('id').range(0, 9999)
  if (error) throw error
  const movs = data.map(m => ({ ...m, debe: Number(m.debe), haber: Number(m.haber), neto: Number(m.neto) }))

  // Precondición: el diario debe cuadrar (todos los asientos completos)
  const sumaDiario = movs.reduce((s, m) => s + (m.debe - m.haber), 0)
  const puente = calcularPuenteCaja(movs, año)

  console.log(`\n=== ${año} ===`)
  console.log(`  Σ diario (debe-haber): ${fmt(sumaDiario)} ${Math.abs(sumaDiario) < 0.01 ? 'OK' : '⚠ DIARIO DESCUADRADO'}`)
  console.log(`  Δ tesorería real (57): ${fmt(puente.totalReal)}`)
  console.log(`  Δ tesorería puente:    ${fmt(puente.totalCalc)}`)
  console.log(`  Intereses (66):        ${fmt(puente.interesesTotal)}`)
  console.log(`  Cuadre anual:          ${puente.cuadra ? '✔ OK' : '✘ FALLO (dif ' + fmt(puente.totalCalc - puente.totalReal) + ')'}`)

  // Cuadre mes a mes
  let mesesFallo = 0
  for (let m = 1; m <= 12; m++) {
    const { deltaCalc, deltaReal } = puente.meses[m]
    if (Math.abs(deltaCalc - deltaReal) >= 0.01) {
      console.log(`    ✘ mes ${m}: calc ${fmt(deltaCalc)} vs real ${fmt(deltaReal)}`)
      mesesFallo++
    }
  }
  console.log(`  Cuadre mensual:        ${mesesFallo === 0 ? '✔ 12/12 meses OK' : `✘ ${mesesFallo} meses descuadrados`}`)

  // Desglose por bucket (anual)
  console.log('  Desglose anual:')
  for (const b of puente.buckets) {
    if (Math.abs(b.total) < 0.01) continue
    console.log(`    ${b.label.padEnd(30)} ${fmt(b.total).padStart(16)}`)
  }

  if (!puente.cuadra || mesesFallo > 0) fallos++
}

console.log(`\n${fallos === 0 ? '✔ TODOS LOS AÑOS CUADRAN AL CÉNTIMO' : `✘ ${fallos} año(s) con descuadre`}`)
process.exit(fallos === 0 ? 0 : 1)
