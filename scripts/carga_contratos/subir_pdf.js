// ============================================
// SUBIR PDF - carga inicial del módulo de contratos (bloque 1.3)
// ============================================
//
// Sube al bucket PRIVADO `contratos` los PDF que lista
// Mantenimientos/carga_inicial/subida_pdf.json (lo genera construir_carga.py).
// Se ejecuta ANTES de carga_contratos.sql, para que ninguna ficha apunte a un
// fichero que aún no está.
//
// Usa la clave de servicio del .env local (línea «SERVICE ROL=…», nunca VITE_):
// solo en el equipo de Carlos, nunca en el navegador ni en el repositorio.
//
// Uso:
//   node scripts/carga_contratos/subir_pdf.js --seco   comprueba sin subir nada
//   node scripts/carga_contratos/subir_pdf.js          sube
//
// Antes de subir cada fichero comprueba su huella (SHA-256) contra la del
// manifiesto: si el fichero local ha cambiado desde que se generó la carga, no
// lo sube. Si la ruta ya existe en el bucket, no la pisa (se puede relanzar).
// ============================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const MANIFIESTO = resolve(ROOT, 'Mantenimientos/carga_inicial/subida_pdf.json')
const BUCKET = 'contratos'
const TAMANO_MAXIMO = 20 * 1024 * 1024
const SECO = process.argv.includes('--seco')

const env = readFileSync(resolve(ROOT, '.env'), 'utf-8')
const URL = env.match(/VITE_SUPABASE_URL\s*=\s*(.+)/)?.[1]?.trim()
const SERVICE_ROLE = env.match(/SERVICE\s*ROL\s*=\s*(.+)/)?.[1]?.trim()
if (!URL || !SERVICE_ROLE) {
  console.error('ERROR: faltan VITE_SUPABASE_URL o SERVICE ROL en .env')
  process.exit(1)
}
if (!existsSync(MANIFIESTO)) {
  console.error('ERROR: no existe el manifiesto. Ejecuta antes: python scripts/carga_contratos/construir_carga.py')
  process.exit(1)
}
const supabase = createClient(URL, SERVICE_ROLE, { auth: { persistSession: false } })
const lista = JSON.parse(readFileSync(MANIFIESTO, 'utf-8'))

async function existentes() {
  // Todas las rutas ya presentes en el bucket (carpeta por carpeta)
  const rutas = new Set()
  const carpetas = [...new Set(lista.map((x) => x.ruta.split('/')[0]))]
  for (const c of carpetas) {
    const { data, error } = await supabase.storage.from(BUCKET).list(c, { limit: 1000 })
    if (error) throw error
    for (const f of data || []) rutas.add(`${c}/${f.name}`)
  }
  return rutas
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log(`  SUBIDA DE PDF → bucket privado «${BUCKET}»${SECO ? '  (EN SECO: no sube nada)' : ''}`)
  console.log('═══════════════════════════════════════')

  const { data: bucket, error: eb } = await supabase.storage.getBucket(BUCKET)
  if (eb) throw eb
  if (bucket.public) throw new Error(`El bucket «${BUCKET}» es PÚBLICO: no se sube nada. Revisar la migración del bucket.`)
  console.log(`Bucket «${BUCKET}»: privado ✓ · ${lista.length} ficheros en el manifiesto`)

  const ya = await existentes()
  let subidos = 0, saltados = 0, fallos = 0, bytes = 0
  for (const [i, x] of lista.entries()) {
    const etiqueta = `[${String(i + 1).padStart(3)}/${lista.length}] ${x.ruta}`
    try {
      const local = resolve(ROOT, x.local)
      if (!existsSync(local)) throw new Error(`no existe ${x.local}`)
      const buf = readFileSync(local)
      if (buf.length > TAMANO_MAXIMO) throw new Error(`pasa de 20 MB (${(buf.length / 1048576).toFixed(1)} MB)`)
      if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error('no empieza por %PDF-: no es un PDF')
      const h = createHash('sha256').update(buf).digest('hex')
      if (h !== x.sha256) throw new Error('el fichero ha cambiado desde que se generó la carga: volver a generarla')
      if (ya.has(x.ruta)) {
        saltados++
        console.log(`${etiqueta}  · ya estaba, no se pisa`)
        continue
      }
      bytes += buf.length
      if (!SECO) {
        const { error } = await supabase.storage.from(BUCKET).upload(x.ruta, buf, { contentType: 'application/pdf', upsert: false })
        if (error) throw error
      }
      subidos++
      console.log(`${etiqueta}  ✓ ${SECO ? 'se subiría' : 'subido'} (${(statSync(local).size / 1024).toFixed(0)} KB)`)
    } catch (err) {
      fallos++
      console.error(`${etiqueta}  ✗ ${err.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`  ${SECO ? 'Se subirían' : 'Subidos'}: ${subidos} (${(bytes / 1048576).toFixed(1)} MB) · ya estaban: ${saltados} · fallos: ${fallos}`)
  console.log(fallos ? '  HAY FALLOS: no ejecutar carga_contratos.sql hasta resolverlos' : SECO ? '  Todo listo para subir' : '  Listo. Siguiente: ejecutar carga_contratos.sql en Supabase')
  console.log('═══════════════════════════════════════')
  if (fallos) process.exit(1)
}

main().catch((err) => {
  console.error('\n✗ Error fatal:', err.message || err)
  process.exit(1)
})
