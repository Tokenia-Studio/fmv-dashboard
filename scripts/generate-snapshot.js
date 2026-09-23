// ============================================
// GENERATE SNAPSHOT - Años cerrados a la tabla saldos_cerrados
// ============================================
//
// Lee todos los movimientos de un año desde Supabase, los AGREGA por
// (mes, cuenta_9digitos) y los guarda en `public.saldos_cerrados`. El Dashboard
// lee esa tabla (con sesión y rol) en lugar de descargar el diario entero de
// los años cerrados.
//
// Hasta el 23-sep-2026 el resultado se escribía en src/data/saldos_<año>.json y
// viajaba dentro del JavaScript público: cualquiera con la URL lo descargaba sin
// iniciar sesión. Por eso ahora va a una tabla con RLS
// (sql/saldos_cerrados_2026-09-23.sql) y el bundle no lleva ningún saldo.
//
// Lo que NO se preserva (asumido innecesario para años cerrados):
//   - codProcedencia: solo se usa en pestaña Proveedores y filtra por año actual
//   - documento: solo se usa en exportaciones de drill-down
//   - fecha exacta: se usa solo para ordenar saldos; la suma por mes es invariante
//
// Uso (la clave de servicio se lee de .env, línea «SERVICE ROL=…»; nunca VITE_):
//   npm run snapshot -- 2024                          regenera 2024 desde el diario
//   npm run snapshot -- 2022 2023 2024 --desde-json   carga única desde los JSON antiguos
//   npm run snapshot -- 2024 --seco                   calcula y comprueba sin escribir
//
// Si algo falla a mitad de un año, ese año se borra entero de la tabla: la app,
// al no encontrarlo, lee el diario completo de ese año (más lento, mismos importes).
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const TABLA = 'saldos_cerrados'

// --- Cargar .env ---
const envContent = readFileSync(resolve(ROOT, '.env'), 'utf-8')
const SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim()
const SERVICE_ROLE = envContent.match(/SERVICE\s*ROL\s*=\s*(.+)/)?.[1]?.trim()

if (!SUPABASE_URL || !SERVICE_ROLE) {
  // Sin la clave de servicio no se puede escribir en saldos_cerrados (la app solo lee)
  console.error('ERROR: faltan VITE_SUPABASE_URL o SERVICE ROL en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

// --- Args ---
const args = process.argv.slice(2)
const DESDE_JSON = args.includes('--desde-json')
const SECO = args.includes('--seco')
const AÑOS_OBJETIVO = args.filter((a) => /^\d{4}$/.test(a)).map(Number)
if (!AÑOS_OBJETIVO.length) {
  console.error('Indica los años: npm run snapshot -- 2024   (o 2022 2023 2024)')
  process.exit(1)
}

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

  // Fecha (último día del mes), neto y año
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
      descripcion: row.descripcion,
      mes: row.mes,
      año: Number(yyyy)
    }
  })
}

// --- Verificacion: totales debe/haber deben coincidir ---
const suma = (arr, f) => arr.reduce((s, x) => s + Number(x[f] || 0), 0)
function verificar(originales, agregados) {
  const debeOrig = suma(originales, 'debe')
  const haberOrig = suma(originales, 'haber')
  const debeAgg = suma(agregados, 'debe')
  const haberAgg = suma(agregados, 'haber')
  const tolDebe = Math.abs(debeOrig - debeAgg)
  const tolHaber = Math.abs(haberOrig - haberAgg)
  return { ok: tolDebe < 1 && tolHaber < 1, debeOrig, debeAgg, tolDebe, haberOrig, haberAgg, tolHaber }
}

// --- Filas del año: desde el diario o desde el JSON antiguo (carga única) ---
async function filasDelAño(año) {
  if (DESDE_JSON) {
    const fichero = resolve(ROOT, `src/data/saldos_${año}.json`)
    if (!existsSync(fichero)) throw new Error(`no existe ${fichero}`)
    const snap = JSON.parse(readFileSync(fichero, 'utf-8'))
    const filas = snap.movimientos.map(({ codProcedencia, documento, ...m }) => m)
    const t = snap.totales
    if (Math.abs(suma(filas, 'debe') - t.debe) > 0.01 || Math.abs(suma(filas, 'haber') - t.haber) > 0.01)
      throw new Error('el JSON no cuadra con sus propios totales')
    console.log(`  Desde JSON: ${filas.length} filas (generado ${snap.generado})`)
    return filas
  }
  const originales = await fetchAllMovimientos(año)
  if (originales.length === 0) throw new Error(`sin movimientos en Supabase para ${año}`)
  const agregados = agregar(originales)
  console.log(`  Originales: ${originales.length} · agregados: ${agregados.length}`)
  const v = verificar(originales, agregados)
  if (!v.ok) {
    throw new Error(`descuadre: debe ${v.debeOrig.toFixed(2)} vs ${v.debeAgg.toFixed(2)}, haber ${v.haberOrig.toFixed(2)} vs ${v.haberAgg.toFixed(2)}`)
  }
  console.log('  ✓ Totales debe/haber cuadran (dif <1 EUR)')
  return agregados
}

async function borrarAño(año) {
  const { error } = await supabase.from(TABLA).delete().eq('año', año)
  if (error) throw error
}

async function escribirAño(año, filas) {
  await borrarAño(año)
  try {
    for (let i = 0; i < filas.length; i += 500) {
      const { error } = await supabase.from(TABLA).insert(filas.slice(i, i + 500))
      if (error) throw error
    }
    // Comprobación contra lo escrito: mismas filas y mismos totales
    const { data, error } = await supabase.from(TABLA).select('debe, haber').eq('año', año).range(0, 9999)
    if (error) throw error
    if (data.length !== filas.length) throw new Error(`escritas ${data.length} de ${filas.length} filas`)
    if (Math.abs(suma(data, 'debe') - suma(filas, 'debe')) > 0.01 || Math.abs(suma(data, 'haber') - suma(filas, 'haber')) > 0.01)
      throw new Error('los totales escritos no cuadran')
  } catch (err) {
    await borrarAño(año).catch(() => {})
    throw err
  }
}

// --- Main ---
async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  SNAPSHOT FMV → tabla saldos_cerrados')
  console.log('═══════════════════════════════════════')
  console.log(`Años: ${AÑOS_OBJETIVO.join(', ')} · origen: ${DESDE_JSON ? 'JSON antiguos' : 'diario de Supabase'}${SECO ? ' · EN SECO (no escribe)' : ''}`)

  let fallos = 0
  for (const año of AÑOS_OBJETIVO) {
    console.log(`\n--- Año ${año} ---`)
    try {
      const filas = await filasDelAño(año)
      console.log(`  Debe ${suma(filas, 'debe').toFixed(2)} · Haber ${suma(filas, 'haber').toFixed(2)}`)
      if (SECO) continue
      await escribirAño(año, filas)
      console.log(`  ✓ ${filas.length} filas en ${TABLA}`)
    } catch (err) {
      fallos++
      console.error(`  ✗ ${año}: ${err.message}. No queda nada de ${año} en ${TABLA}: la app leerá su diario completo.`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(fallos ? `  TERMINADO CON ${fallos} AÑO(S) SIN CARGAR` : '  COMPLETADO')
  console.log('═══════════════════════════════════════')
  if (fallos) process.exit(1)
}

main().catch(err => {
  console.error('\n✗ Error fatal:', err)
  process.exit(1)
})
