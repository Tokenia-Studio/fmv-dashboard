// ============================================
// CONTRASTE - la carga inicial frente a la hoja «Vencimientos 12 meses»
// ============================================
//
// Criterio de aceptación del bloque 1.3: con los datos que se van a cargar, el
// calendario que genera la app (el mismo código que las pantallas:
// src/utils/contratosVista.js) tiene que llegar a los avisos que en el Excel se
// calcularon a mano. La POC del 21/09/2026 llegaba a 36 de 38; los 2 que faltan
// son hitos que solo existen como texto (pago aplazado, revisión de precios).
//
// Uso: node scripts/carga_contratos/contraste.js   (lee Mantenimientos/carga_inicial/carga.json)
// ============================================

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { construirModelo, calendario, filasEquipos, sumaEnTotales, hoyLocal } from '../../src/utils/contratosVista.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const d = JSON.parse(readFileSync(resolve(ROOT, 'Mantenimientos/carga_inicial/carga.json'), 'utf-8'))
const hoy = hoyLocal()
const m = construirModelo({ ...d, realizadas: [], realizadaUnidades: [], tareasNotas: [] }, hoy)

const claveMes = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
const codigo = new Map(m.contratos.map((c) => [c.id, c.codigo]))

// Lo que genera la app: vencimiento de cada contrato vivo y próxima de cada obligación con contrato
const generado = new Set()
for (const c of m.contratos) if (c.calc.estado !== 'historico' && c.calc.vence) generado.add(`${c.codigo}|${claveMes(c.calc.vence.d)}`)
for (const o of m.obligaciones) if (o.viva && o.calc.proxima && o.contrato_id) generado.add(`${codigo.get(o.contrato_id)}|${claveMes(o.calc.proxima.d)}`)
for (const c of m.contratos) for (const h of c.hitos) if (h.calc.fecha) generado.add(`${c.codigo}|${claveMes(h.calc.fecha.d)}`)

const hoja = d.vencimientosHoja.filter((v) => v.fecha && v.contrato)
const filas = hoja.map((v) => ({ v, ok: generado.has(`${v.contrato}|${String(v.fecha).slice(0, 7)}`) }))
const ok = filas.filter((f) => f.ok).length

console.log(`Contraste con la hoja «Vencimientos 12 meses»: ${ok} de ${hoja.length} avisos reproducidos (POC, sin hitos: 36 de 38)`)
for (const f of filas.filter((x) => !x.ok)) console.log(`  · no sale: ${String(f.v.fecha).slice(0, 10)} ${f.v.contrato} — ${f.v.que}`)

// Cifras del panel con los datos de la carga
const eq = filasEquipos(m).filter((f) => f.situacion !== 'baja')
const cuenta = (s) => eq.filter((f) => f.situacion === s).length
console.log('\nPanel «Equipos y mantenimiento» con la carga:')
console.log(`  en servicio ${eq.length} (${eq.reduce((s, f) => s + f.unidades, 0)} unidades) · fuera de plazo ${cuenta('fuera')} · 60 días ${cuenta('proxima')} · sin fecha ${cuenta('sinfecha')} · sin plan ${cuenta('sinplan')} · sin cierre ${eq.filter((f) => f.sinCierre).length}`)
for (const vista of ['compras_fabrica', 'administracion']) {
  const cs = m.contratos.filter((c) => c.vista === vista && sumaEnTotales(c))
  const est = (e) => cs.filter((c) => c.calc.estado === e).length
  const cal = calendario(m, vista)
  console.log(`Vista ${vista}: ${cs.length} contratos vivos · vencidos sin cerrar ${est('vencido')} · aviso abierto ${est('avisar')} · decidir en 90 días ${est('proximo')} · sin vencimiento ${est('sinvenc')} · calendario: ${cal.atrasados.length} atrasados, ${cal.meses.reduce((s, x) => s + x.eventos.length, 0)} en 13 meses, ${cal.sinFecha.length} sin fecha`)
}
const auto = new Map()
for (const t of m.tareasAutomaticas) auto.set(t.tipo, (auto.get(t.tipo) || 0) + 1)
console.log(`\nTareas automáticas: ${m.tareasAutomaticas.length} → ${[...auto].map(([k, v]) => `${k} ${v}`).join(' · ')}`)
console.log(`Tareas del inventario y de la carga: ${d.tareas.length}`)
