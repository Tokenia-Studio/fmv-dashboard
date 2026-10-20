// ============================================
// BASE LOCAL DE PRUEBAS SQL (PGlite) - módulo de contratos
// ============================================
// Postgres en memoria con lo mínimo de Supabase (arranque.sql) y, encima, las
// migraciones reales en su orden. Sirve para probar una migración y sus
// comprobaciones ANTES de que Carlos las ejecute en producción: que aplica, que todas
// las comprobaciones (nuevas y anteriores) dan OK, que se puede ejecutar dos veces,
// que la marcha atrás deja todo como estaba y que la comprobación nueva FALLA contra
// las reglas viejas (si no falla, no está comprobando nada).
// No conecta con Supabase: nada sale del equipo.
//
// Uso (desde esta carpeta, la primera vez `npm install`):
//   node probar.mjs                          → migraciones + todas las comprobaciones
//   node probar.mjs fichero.sql [!otro.sql]  → arranque + migraciones base + esos ficheros
//                                              («!» delante = se espera que falle)
// ============================================
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const SQL = resolve(AQUI, '../../sql')

// Lo que hay en producción, en el orden en que se ejecutó (contratos_codigo_proveedor_bc
// necesita tablas del Dashboard que aquí no están y no toca permisos: se salta)
const MIGRACIONES = [
  'contratos_migracion_2026-09-22.sql',
  'contratos_migracion_bucket_2026-09-22.sql',
  'contratos_proveedor_corto_2026-09-23.sql',
  'contratos_qa_2026-09-24.sql',
  'contratos_alta_por_rol_2026-10-05.sql',
  'contratos_documentos_por_contrato_2026-10-06.sql',
  'contratos_tareas_documentos_2026-10-20.sql',
]
const COMPROBACIONES = [
  'contratos_comprobacion_permisos.sql',
  'contratos_qa_2026-09-24_comprobacion.sql',
  'contratos_alta_por_rol_2026-10-05_comprobacion.sql',
  'contratos_documentos_por_contrato_2026-10-06_comprobacion.sql',
  'contratos_tareas_documentos_2026-10-20_comprobacion.sql',
  'almacen_real.sql',
]

const pedidos = process.argv.slice(2)
const ficheros = pedidos.length ? [...MIGRACIONES.slice(0, -1), ...pedidos] : [...MIGRACIONES, ...COMPROBACIONES]
const ruta = (f) => {
  for (const base of [SQL, AQUI]) {
    try { return { sql: readFileSync(resolve(base, f), 'utf-8') } } catch { /* siguiente carpeta */ }
  }
  return { sql: readFileSync(resolve(f), 'utf-8') }
}

const db = new PGlite()
await db.exec(readFileSync(resolve(AQUI, 'arranque.sql'), 'utf-8'))
let inesperados = 0
for (const f of ficheros) {
  const esperaFallo = f.startsWith('!')
  const nombre = f.replace(/^!/, '')
  try {
    const res = await db.exec(ruta(nombre).sql)
    const filas = [...res].reverse().find((r) => r.rows?.length)?.rows || []
    if (filas.length && 'resultado' in filas[0]) {
      const malos = filas.filter((r) => r.resultado !== 'OK')
      console.log(`■ ${nombre}: ${filas.length - malos.length}/${filas.length} OK`)
      for (const r of malos) console.log(`   ${r.resultado} · ${r.quien} · ${r.comprobacion} · esperado ${r.esperado} · obtenido ${r.obtenido}${r.detalle ? ' · ' + r.detalle : ''}`)
      if (malos.some((r) => r.resultado === 'FALLO') !== esperaFallo) inesperados++
    } else {
      console.log(`■ ${nombre}: aplicado`)
      if (esperaFallo) inesperados++
    }
  } catch (e) {
    console.log(`■ ${nombre}: ERROR ${e.message}`)
    if (!esperaFallo) inesperados++
  }
}
console.log(inesperados ? `\n${inesperados} resultado(s) inesperado(s)` : '\nTodo como se esperaba')
process.exit(inesperados ? 1 : 0)
