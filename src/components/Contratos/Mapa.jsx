// ============================================
// CONTRATOS - Mapa: el reparto en dos chapas
// ============================================
// El esquema global que pidió Carlos el 05/10/2026 («a modo de organigrama, la división
// de la empresa por categorías y equipos»), dibujado como lo vería el taller en el
// programa de corte: una chapa con lo que se mantiene y otra con lo que se paga, cada
// una cortada en piezas cuya área es su parte del total.
//
//   · Tres niveles: vista → tipo de equipo o categoría → quién lo mantiene o lo cobra.
//     Entre vistas hay un pasillo; entre piezas, el corte; entre proveedores, un trazo.
//   · El color solo dice estado (rojo, ámbar, verde, gris) y nunca va solo: lleva icono
//     en la leyenda, número en la pieza y todo repetido en la lista de piezas de abajo.
//   · Cada pieza abre la lista que cuenta (mismas funciones que las listas).
//   · Dirección ve las dos vistas; compras, solo la suya (los datos de la otra ni llegan).
//   · Se imprime en una hoja apaisada (documento aparte, como las cuentas anuales).
//
// Los cuatro colores de estado están validados para daltonismo sobre el gris de la pieza
// (separación mínima entre cualquier par: 12,9; el mínimo exigible es 8).

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Clock, Check, CircleDashed, Printer } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { encajar, mapaEquipos, mapaContratos, ESTADOS_MAPA } from '../../utils/contratosMapa'
import { Tarjeta, Tabla, Fila, Td, Vacio, Boton, eur } from './ui'

// ── Materiales ──────────────────────────────────────────────────────────────
const TINTA = { rojo: '#A32020', ambar: '#F59E0B', verde: '#059669', gris: '#A8B3C2' }
const ACERO = '#E4EAF1' // la pieza
const ACERO_VIVO = '#F4F7FA' // la pieza bajo el ratón
const PLACA = '#C9D4E0' // cabecera de la pieza y trazo entre proveedores
const ICONO = { rojo: AlertTriangle, ambar: Clock, verde: Check, gris: CircleDashed }
const LEYENDA = {
  equipos: { rojo: 'Fuera de plazo', ambar: 'Toca en 60 días', verde: 'En plazo', gris: 'Sin fecha o sin plan' },
  contratos: { rojo: 'Vencido o con el plazo de aviso abierto', ambar: 'Hay que decidir en 90 días', verde: 'En plazo', gris: 'Sin vencimiento conocido' },
}
// El estado dicho detrás de su número: «18 fuera de plazo», «1 vencido o en aviso»
const CORTO = {
  equipos: { rojo: () => 'fuera de plazo', ambar: () => 'en 60 días', verde: () => 'en plazo', gris: () => 'sin fecha o sin plan' },
  contratos: { rojo: (n) => (n === 1 ? 'vencido o en aviso' : 'vencidos o en aviso'), ambar: () => 'a decidir', verde: () => 'en plazo', gris: () => 'sin vencimiento' },
}
// Rótulo de cada proveedor según el sitio que tiene su hueco: [ancho y alto mínimos, cuerpo del nombre, cuerpo de la cifra]
const TALLAS = [
  { w: 200, h: 104, nombre: 13, cifra: 22 },
  { w: 110, h: 58, nombre: 12, cifra: 15 },
  { w: 40, h: 19, nombre: 11, cifra: 11 },
]

// ── Medidas del corte (px) ──────────────────────────────────────────────────
const PASILLO = 16 // entre vistas
const CORTE = 4 // entre piezas
const TRAZO = 1 // entre proveedores de una misma pieza
const ROTULO = 26 // rótulo de cada vista
const CABECERA = 26 // nombre y cifra de la pieza
const TIRA = 5 // estado de la pieza
// Ancho útil de un A4 apaisado con los márgenes del documento impreso (297 mm − 2 × 13 mm, a 96 px por pulgada)
const ANCHO_HOJA = 1024

const fuente = (peso, px) => `${peso} ${px}px Inter, system-ui, -apple-system, sans-serif`
let lienzo = null
function anchoTexto(texto, f) {
  if (typeof document === 'undefined') return String(texto).length * 6.5
  lienzo = lienzo || document.createElement('canvas').getContext('2d')
  lienzo.font = f
  return lienzo.measureText(String(texto)).width
}
/**
 * El nombre entero si cabe; si no, recortado y dicho con puntos suspensivos; y si no caben
 * ni cuatro letras, nada: nunca un rótulo cortado por el borde (el nombre completo está
 * siempre en la ficha y en la lista de piezas).
 */
function loQueCabe(texto, ancho, f) {
  const t = String(texto)
  if (ancho <= 0) return ''
  if (anchoTexto(t, f) <= ancho) return t
  for (let n = Math.min(t.length - 1, 40); n >= 4; n--) {
    const corto = `${t.slice(0, n).replace(/[\s,·/(-]+$/, '')}…`
    if (anchoTexto(corto, f) <= ancho) return corto
  }
  return ''
}
const sinFormaJuridica = (nombre) => String(nombre || '').replace(/,?\s+(s\.?\s?l\.?\s?u\.?|s\.?\s?a\.?\s?u\.?|s\.?\s?l\.?|s\.?\s?a\.?)\.?$/i, '').trim()
const euros = (n) => `${Math.round(n).toLocaleString('es-ES', { useGrouping: 'always' })} €`
const porcentaje = (v, total) => {
  if (!total) return ''
  const p = (v / total) * 100
  return p < 1 ? 'menos del 1 %' : `${Math.round(p)} %`
}
const plural = (n, uno, varios) => `${n.toLocaleString('es-ES')} ${n === 1 ? uno : varios}`

/**
 * Del reparto a la chapa: dónde va cada pieza, qué cabe escrito en ella y sus proveedores.
 * Las vistas van siempre en el mismo orden, a lo ancho (apiladas si la pantalla es estrecha).
 */
function trazar(regiones, W, H, conRotulo, cifra) {
  const vivas = regiones.filter((r) => r.valor > 0)
  const total = vivas.reduce((s, r) => s + r.valor, 0)
  const apiladas = vivas.length > 1 && W < 640
  const util = (apiladas ? H : W) - PASILLO * (vivas.length - 1)
  const rot = conRotulo ? ROTULO : 0
  const zonas = []
  const piezas = []
  let pos = 0

  for (const r of vivas) {
    const lado = (r.valor / total) * util
    const z = apiladas ? { x: 0, y: pos, w: W, h: lado } : { x: pos, y: 0, w: lado, h: H }
    zonas.push({ ...r, ...z, rotulo: conRotulo ? loQueCabe(r.nombre, z.w - CORTE - anchoTexto(euros(r.valor), fuente(500, 12)) - 16, fuente(600, 13)) : '' })
    pos += lado + PASILLO

    for (const p of encajar(r.piezas, z.x, z.y + rot, z.w, Math.max(0, z.h - rot))) {
      const c = { x: p.x + CORTE / 2, y: p.y + CORTE / 2, w: p.w - CORTE, h: p.h - CORTE }
      if (c.w < 3 || c.h < 3) continue
      const texto = cifra(p.valor)
      const base = { ...p, ...c, texto, partes: p.partes }
      if (c.w >= 104 && c.h >= 84) {
        // Pieza grande: cabecera con nombre y cifra, tira de estado y debajo sus proveedores
        const anchoCifra = anchoTexto(texto, fuente(600, 13))
        const aviso = p.estados.rojo > 0 ? 18 : 0
        const y0 = c.y + CABECERA + TIRA + 2 * TRAZO
        const dentro = encajar(p.partes, c.x, y0, c.w, c.y + c.h - y0).map((q) => {
          const d = { x: q.x + TRAZO / 2, y: q.y + TRAZO / 2, w: q.w - TRAZO, h: q.h - TRAZO }
          const talla = TALLAS.find((t) => d.w >= t.w && d.h >= t.h)
          const nombre = talla ? loQueCabe(q.sinNombre ? q.nombre : sinFormaJuridica(q.nombre), d.w - 14, fuente(500, talla.nombre)) : ''
          const valor = cifra(q.valor)
          // La cifra, si queda sitio debajo del nombre; en una pieza de un solo proveedor ya la dice la cabecera
          const conValor = nombre && p.partes.length > 1 && d.h >= talla.nombre + talla.cifra + 14 && anchoTexto(valor, fuente(600, talla.cifra)) <= d.w - 14
          return { ...q, ...d, talla, rotulo: nombre, textoValor: conValor ? valor : '' }
        })
        piezas.push({ ...base, modo: 'grande', rotulo: loQueCabe(p.nombre, c.w - 20 - anchoCifra - aviso, fuente(600, 12)), dentro })
      } else {
        const nombre = c.w >= 34 && c.h >= 22 ? loQueCabe(p.nombre, c.w - 10, fuente(600, 11)) : ''
        piezas.push({ ...base, modo: 'chica', rotulo: nombre, conCifra: !!nombre && c.h >= 42 && anchoTexto(texto, fuente(600, 13)) <= c.w - 10, conTira: c.h >= 14 && c.w >= 14 })
      }
    }
  }
  return { zonas, piezas }
}

// ── La ficha que sale al pasar el ratón o al llegar con el teclado ──────────
const Pista = forwardRef(function Pista(_, ref) {
  const [p, setP] = useState(null)
  useImperativeHandle(ref, () => ({ mostrar: (datos, x, y) => setP({ datos, x, y }), ocultar: () => setP(null) }), [])
  if (!p) return null
  const ancho = 280
  const izquierda = p.x + ancho + 24 > window.innerWidth ? Math.max(8, p.x - ancho - 14) : p.x + 14
  const arriba = p.y + 190 > window.innerHeight ? Math.max(8, p.y - 180) : p.y + 16
  const d = p.datos
  return createPortal(
    <div role="tooltip" className="fixed z-[60] pointer-events-none rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm text-slate-800 print:hidden" style={{ left: izquierda, top: arriba, width: ancho }}>
      <div className="font-semibold leading-snug">{d.titulo}</div>
      <div className="text-xs text-slate-600">{d.resumen}</div>
      {d.estados?.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {d.estados.map(([estado, texto]) => {
            const Icono = ICONO[estado]
            return <li key={estado} className="flex items-center gap-1.5"><Icono size={12} style={{ color: TINTA[estado] }} strokeWidth={2.5} /> {texto}</li>
          })}
        </ul>
      )}
      {d.detalle && <div className="mt-1.5 text-xs text-slate-600">{d.detalle}</div>}
      <div className="mt-1.5 border-t border-gray-100 pt-1 text-xs text-fmv-700">{d.accion}</div>
    </div>,
    document.body,
  )
})

/** Tira de estado: tramos proporcionales, siempre en el mismo orden y separados por un hueco. */
function Tira({ estados, alto = TIRA, className = '', style }) {
  const total = ESTADOS_MAPA.reduce((s, e) => s + estados[e], 0)
  if (!total) return null
  return (
    <span className={`flex gap-px overflow-hidden ${className}`} style={{ height: alto, ...style }} aria-hidden="true">
      {ESTADOS_MAPA.filter((e) => estados[e] > 0).map((e) => (
        <span key={e} style={{ flexGrow: estados[e], flexBasis: 0, minWidth: 2, background: TINTA[e] }} />
      ))}
    </span>
  )
}

function useAncho(ref, fijo) {
  const [ancho, setAncho] = useState(fijo || 0)
  useEffect(() => {
    if (fijo || !ref.current) return undefined
    const medir = () => setAncho(Math.floor(ref.current.clientWidth))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref, fijo])
  return fijo || ancho
}

/**
 * Una chapa. `regiones` = [{ clave, nombre, valor, piezas: [{ clave, nombre, valor, estados, partes }] }].
 * `anchoFijo` y `altoFijo` son para el documento impreso, que no se puede medir.
 */
function Chapa({ regiones, conRotulo, proporcion, altoMin, altoMax, anchoFijo, altoFijo, cifra, pista, fichaPieza, fichaParte, alPulsarRotulo, alPulsarPieza, alPulsarParte, vacio }) {
  const ref = useRef(null)
  const ancho = useAncho(ref, anchoFijo)
  const alto = altoFijo || Math.round(Math.min(altoMax, Math.max(altoMin, ancho * proporcion))) + (conRotulo ? ROTULO : 0)
  const d = useMemo(() => (ancho ? trazar(regiones, ancho, alto, conRotulo, cifra) : null), [regiones, ancho, alto, conRotulo, cifra])

  // Lo mismo con ratón que con teclado: la ficha sigue al puntero o se pega a la pieza enfocada
  const eventos = (datos) => ({
    onMouseMove: (e) => pista?.current?.mostrar(datos(), e.clientX, e.clientY),
    onMouseLeave: () => pista?.current?.ocultar(),
    onFocus: (e) => { const r = e.currentTarget.getBoundingClientRect(); pista?.current?.mostrar(datos(), r.left + Math.min(r.width, 40), r.bottom - 8) },
    onBlur: () => pista?.current?.ocultar(),
  })
  const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-fmv-600 focus-visible:z-10'

  if (!regiones.some((r) => r.valor > 0)) return <Vacio>{vacio}</Vacio>
  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: alto, width: anchoFijo || undefined }}>
      {/* El borde de cada chapa, a un corte de sus piezas */}
      {d?.zonas.map((z) => (
        <div key={`borde:${z.clave}`} className="absolute pointer-events-none" style={{ left: z.x - CORTE / 2, top: z.y + (conRotulo ? ROTULO : 0) - CORTE / 2, width: z.w + CORTE, height: z.h - (conRotulo ? ROTULO : 0) + CORTE, border: `1px solid ${PLACA}`, borderRadius: 3 }} />
      ))}
      {d?.zonas.map((z) => z.rotulo && (
        <button key={z.clave} type="button" onClick={() => alPulsarRotulo?.(z)} className={`absolute flex items-baseline gap-2 text-left hover:underline ${foco}`} style={{ left: z.x + CORTE / 2, top: z.y, width: z.w - CORTE, height: ROTULO - 4 }}>
          <span className="text-[13px] font-semibold text-slate-800 truncate">{z.rotulo}</span>
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">{euros(z.valor)}</span>
        </button>
      ))}
      {d?.piezas.map((p) => p.modo === 'grande' ? (
        <div key={p.clave} className="absolute" style={{ left: p.x, top: p.y, width: p.w, height: p.h, background: PLACA, borderRadius: 2 }}>
          <button type="button" onClick={() => alPulsarPieza(p)} aria-label={fichaPieza(p).leido} {...eventos(() => fichaPieza(p))} className={`mapa-cabecera absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-2 text-left ${foco}`} style={{ height: CABECERA }}>
            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap overflow-hidden">{p.rotulo}</span>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 whitespace-nowrap" style={{ fontVariantNumeric: 'normal' }}>
              {p.estados.rojo > 0 && <AlertTriangle size={13} strokeWidth={2.5} style={{ color: TINTA.rojo }} aria-hidden="true" />}
              {p.texto}
            </span>
          </button>
          <Tira estados={p.estados} className="absolute inset-x-0" style={{ top: CABECERA }} />
          {p.dentro.map((q) => (
            <button key={q.clave} type="button" onClick={() => alPulsarParte(p, q)} aria-label={fichaParte(p, q).leido} {...eventos(() => fichaParte(p, q))} className={`mapa-pieza absolute flex flex-col items-start justify-start overflow-hidden px-1.5 pt-1 text-left ${q.sinNombre ? 'mapa-sin' : ''} ${foco}`} style={{ left: q.x - p.x, top: q.y - p.y, width: q.w, height: q.h }}>
              {q.rotulo && <span className="font-medium leading-tight text-slate-700 whitespace-nowrap" style={{ fontSize: q.talla.nombre }}>{q.rotulo}</span>}
              {q.textoValor && <span className={`leading-tight whitespace-nowrap ${q.talla.cifra > 11 ? 'font-semibold text-slate-800' : 'text-slate-500'}`} style={{ fontSize: q.talla.cifra, fontVariantNumeric: 'normal' }}>{q.textoValor}</span>}
            </button>
          ))}
        </div>
      ) : (
        <button key={p.clave} type="button" onClick={() => alPulsarPieza(p)} aria-label={fichaPieza(p).leido} {...eventos(() => fichaPieza(p))} className={`mapa-pieza absolute flex flex-col items-start justify-start overflow-hidden px-1.5 pt-1 text-left ${foco}`} style={{ left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: 2 }}>
          {p.rotulo && <span className="text-[11px] font-semibold leading-tight text-slate-800 whitespace-nowrap">{p.rotulo}</span>}
          {p.conCifra && <span className="text-[13px] font-semibold leading-tight text-slate-900 whitespace-nowrap" style={{ fontVariantNumeric: 'normal' }}>{p.texto}</span>}
          {p.conTira && <Tira estados={p.estados} alto={4} className="absolute inset-x-0 bottom-0" />}
        </button>
      ))}
    </div>
  )
}

function Leyenda({ de }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
      {ESTADOS_MAPA.map((e) => {
        const Icono = ICONO[e]
        return (
          <li key={e} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4" style={{ background: TINTA[e], borderRadius: 1 }} />
            <Icono size={12} strokeWidth={2.5} style={{ color: TINTA[e] }} aria-hidden="true" />
            {LEYENDA[de][e]}
          </li>
        )
      })}
    </ul>
  )
}

/** El estado dicho con números: lo malo primero y con su color; lo que va bien, en texto llano. */
function EstadoEnTexto({ estados, de }) {
  const partes = ESTADOS_MAPA.filter((e) => estados[e] > 0)
  if (!partes.length) return <span className="text-gray-400">—</span>
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
      {partes.map((e) => {
        const Icono = ICONO[e]
        return (
          <span key={e} className={`inline-flex items-center gap-1 whitespace-nowrap ${e === 'rojo' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
            <Icono size={12} strokeWidth={2.5} style={{ color: TINTA[e] }} aria-hidden="true" />
            {estados[e].toLocaleString('es-ES')} {CORTO[de][e](estados[e])}
          </span>
        )
      })}
    </span>
  )
}

function Reparto({ valor, maximo, total }) {
  return (
    <span className="flex items-center gap-2">
      <span className="block h-2 w-24 shrink-0 rounded bg-gray-100"><span className="block h-2 rounded bg-fmv-600" style={{ width: `${maximo ? Math.max(2, (valor / maximo) * 100) : 0}%` }} /></span>
      <span className="text-xs text-slate-600 whitespace-nowrap">{porcentaje(valor, total)}</span>
    </span>
  )
}

export default function Mapa() {
  const { modelo, vista, esDireccion, irAVista, abrir } = useContratos()
  const pista = useRef(null)
  const [conProveedores, setConProveedores] = useState(false)

  const vistas = useMemo(() => (esDireccion ? ['compras_fabrica', 'administracion'] : ['compras_fabrica']), [esDireccion])
  const equipos = useMemo(() => mapaEquipos(modelo), [modelo])
  const contratos = useMemo(() => mapaContratos(modelo, vistas), [modelo, vistas])
  const chapaEquipos = useMemo(() => [{ clave: 'equipos', nombre: 'Equipos', valor: equipos.total, piezas: equipos.piezas }], [equipos])
  const sinImporte = contratos.regiones.flatMap((r) => r.piezas.filter((p) => p.sinImporte > 0).map((p) => ({ ...p, region: r })))
  const unidades = (n) => n.toLocaleString('es-ES')

  // Qué abre cada cosa (siempre la lista que cuenta)
  const abrirTipo = (p) => irAVista('compras_fabrica', 'equipos', { tipo: p.nombre })
  const abrirMantenedor = (p, q) => irAVista('compras_fabrica', 'equipos', q.sinNombre ? { tipo: p.nombre } : { tipo: p.nombre, q: q.nombre })
  const abrirCategoria = (p) => irAVista(p.vista, 'contratos', { categoria: p.nombre })
  const abrirProveedor = (p, q) => (q.contratos.length === 1 ? abrir('contrato', q.contratos[0]) : irAVista(p.vista, 'contratos', { categoria: p.nombre, q: q.nombre }))

  // La ficha de cada pieza (y lo que oye quien navega con lector de pantalla)
  const estadosDe = (estados, de, unidad) => ESTADOS_MAPA.filter((e) => estados[e] > 0).map((e) => [e, `${unidad(estados[e])} ${CORTO[de][e](estados[e])}`])
  const conLeido = (f) => ({ ...f, leido: [f.titulo, f.resumen, ...(f.estados || []).map((x) => x[1]), f.accion].join('. ') })
  const fichaTipo = (p) => conLeido({
    titulo: p.nombre,
    resumen: `${plural(p.valor, 'equipo', 'equipos')}, ${porcentaje(p.valor, equipos.total)} de los que hay en servicio`,
    estados: estadosDe(p.estados, 'equipos', unidades),
    detalle: `Lo mantiene: ${p.partes.map((q) => `${q.sinNombre ? 'nadie' : sinFormaJuridica(q.nombre)} (${q.valor})`).join(', ')}.${p.noAptos ? ` ${plural(p.noAptos, 'no apto', 'no aptos')}.` : ''}`,
    accion: 'Abre la lista de estos equipos',
  })
  const fichaMantenedor = (p, q) => conLeido({
    titulo: q.sinNombre ? 'Sin mantenedor' : q.nombre,
    resumen: `${p.nombre}: ${plural(q.valor, 'equipo', 'equipos')}${q.sinNombre ? ' sin revisión ni calibración contratada' : ''}`,
    estados: estadosDe(q.estados, 'equipos', unidades),
    accion: 'Abre la lista de estos equipos',
  })
  const fichaCategoria = (p) => conLeido({
    titulo: p.nombre,
    resumen: `${eur(p.valor)} al año en ${plural(p.n - p.sinImporte, 'contrato', 'contratos')}, ${porcentaje(p.valor, contratos.total)} de lo contratado`,
    estados: estadosDe(p.estadosN, 'contratos', unidades),
    detalle: p.sinImporte ? `Además, ${plural(p.sinImporte, 'contrato', 'contratos')} sin importe conocido.` : null,
    accion: 'Abre la lista de estos contratos',
  })
  const fichaProveedor = (p, q) => conLeido({
    titulo: q.nombre,
    resumen: `${p.nombre}: ${eur(q.valor)} al año en ${plural(q.n - q.sinImporte, 'contrato', 'contratos')}`,
    estados: estadosDe(q.estadosN, 'contratos', unidades),
    detalle: q.sinImporte ? `Además, ${plural(q.sinImporte, 'contrato', 'contratos')} sin importe conocido.` : null,
    accion: q.contratos.length === 1 ? 'Abre el contrato' : 'Abre sus contratos',
  })

  const propsEquipos = { regiones: chapaEquipos, cifra: unidades, fichaPieza: fichaTipo, fichaParte: fichaMantenedor, alPulsarPieza: abrirTipo, alPulsarParte: abrirMantenedor, vacio: 'Todavía no hay equipos en servicio.' }
  const propsContratos = { regiones: contratos.regiones, conRotulo: contratos.regiones.length > 1, cifra: euros, fichaPieza: fichaCategoria, fichaParte: fichaProveedor, alPulsarRotulo: (z) => irAVista(z.vista, 'contratos'), alPulsarPieza: abrirCategoria, alPulsarParte: abrirProveedor, vacio: 'Ningún contrato vivo tiene importe conocido todavía.' }

  const notaEquipos = `${plural(equipos.total, 'equipo', 'equipos')} en servicio`
  const notaContratos = `${eur(contratos.total)} al año en ${plural(contratos.n - contratos.sinImporte, 'contrato', 'contratos')}`
  const bandeja = sinImporte.length > 0 && (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-slate-600">
      <span>Sin importe conocido, no se pueden dibujar a escala:</span>
      {sinImporte.map((p) => (
        <button key={p.clave} type="button" onClick={() => irAVista(p.vista, 'contratos', { categoria: p.nombre, sinImporte: true })} className="mapa-sin rounded-sm px-1.5 py-0.5 font-medium text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-fmv-600">
          {p.nombre} {p.sinImporte}
        </button>
      ))}
    </div>
  )

  const maxEquipos = Math.max(1, ...equipos.piezas.map((p) => p.valor))
  const maxContratos = Math.max(1, ...contratos.regiones.flatMap((r) => r.piezas.map((p) => p.valor)))
  const listaEquipos = (
    <Tabla columnas={['Tipo de equipo', { t: 'Equipos', num: true }, 'Reparto', 'Estado']}>
      {equipos.piezas.map((p) => (
        <React.Fragment key={p.clave}>
          <Fila onClick={() => abrirTipo(p)}>
            <Td className="font-medium">{p.nombre}</Td>
            <Td num>{unidades(p.valor)}</Td>
            <Td><Reparto valor={p.valor} maximo={maxEquipos} total={equipos.total} /></Td>
            <Td><EstadoEnTexto estados={p.estados} de="equipos" /></Td>
          </Fila>
          {conProveedores && p.partes.map((q) => (
            <Fila key={q.clave} onClick={() => abrirMantenedor(p, q)} className="text-slate-600">
              <Td className="!pl-8">{q.sinNombre ? <span className="italic">Sin mantenedor</span> : q.nombre}</Td>
              <Td num>{unidades(q.valor)}</Td>
              <Td />
              <Td><EstadoEnTexto estados={q.estados} de="equipos" /></Td>
            </Fila>
          ))}
        </React.Fragment>
      ))}
      <tr className="total-row"><Td>Total</Td><Td num>{unidades(equipos.total)}</Td><Td /><Td /></tr>
    </Tabla>
  )
  const listaContratos = (
    <Tabla columnas={['Categoría', { t: 'Contratos', num: true }, { t: 'Importe anual', num: true }, 'Reparto', 'Estado']}>
      {contratos.regiones.map((r) => (
        <React.Fragment key={r.clave}>
          {contratos.regiones.length > 1 && (
            <tr className="subtotal-row"><Td>{r.nombre}</Td><Td num>{r.n}</Td><Td num>{eur(r.valor)}</Td><Td /><Td /></tr>
          )}
          {r.piezas.map((p) => (
            <React.Fragment key={p.clave}>
              <Fila onClick={() => abrirCategoria(p)}>
                <Td className="font-medium">{p.nombre}</Td>
                <Td num>{p.n}</Td>
                <Td num>{p.valor > 0 ? eur(p.valor) : <span className="text-gray-400">—</span>}{p.sinImporte > 0 && <span className="block text-xs font-normal text-slate-500">{p.sinImporte} sin importe</span>}</Td>
                <Td>{p.valor > 0 && <Reparto valor={p.valor} maximo={maxContratos} total={contratos.total} />}</Td>
                <Td><EstadoEnTexto estados={p.estadosN} de="contratos" /></Td>
              </Fila>
              {conProveedores && p.partes.map((q) => (
                <Fila key={q.clave} onClick={() => abrirProveedor(p, q)} className="text-slate-600">
                  <Td className="!pl-8">{q.nombre}</Td>
                  <Td num>{q.n}</Td>
                  <Td num>{q.valor > 0 ? eur(q.valor) : <span className="text-gray-400">sin importe</span>}</Td>
                  <Td />
                  <Td><EstadoEnTexto estados={q.estadosN} de="contratos" /></Td>
                </Fila>
              ))}
            </React.Fragment>
          ))}
        </React.Fragment>
      ))}
      <tr className="total-row"><Td>Total</Td><Td num>{contratos.n}</Td><Td num>{eur(contratos.total)}</Td><Td /><Td /></tr>
    </Tabla>
  )

  const hoy = modelo.hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="space-y-4">
      {/* Mientras esta pantalla está abierta, imprimir saca la hoja apaisada */}
      <style>{ESTILO}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-sm text-slate-600">
          FMV en dos chapas, como en el programa de corte: lo que se mantiene y lo que se paga.
          Cuanto mayor es una pieza, más pesa en el total. Pulsa cualquiera para abrir su lista.
        </p>
        <Boton variante="secundario" onClick={() => window.print()} title="Las dos chapas en una hoja apaisada; la lista de piezas, en la siguiente"><Printer size={14} /> Imprimir</Boton>
      </div>

      <Tarjeta titulo="Lo que se mantiene" nota={notaEquipos}>
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-600">Una pieza por tipo de equipo; su tamaño es el número de equipos. Dentro, quién los mantiene.</p>
          <Chapa {...propsEquipos} pista={pista} proporcion={0.2} altoMin={200} altoMax={280} />
          <Leyenda de="equipos" />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Lo que se paga" nota={notaContratos}>
        <div className="space-y-3 p-4">
          <p className="text-xs text-slate-600">Una pieza por categoría de contrato; su tamaño es el importe anual sin IVA. Dentro, cada proveedor.{!esDireccion && ' Solo los contratos de Equipos y mantenimiento.'}</p>
          <Chapa {...propsContratos} pista={pista} proporcion={0.34} altoMin={260} altoMax={440} />
          {bandeja}
          <Leyenda de="contratos" />
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Lista de piezas"
        nota="Lo mismo, con sus números"
        acciones={<label className="flex items-center gap-1 text-xs text-white"><input type="checkbox" checked={conProveedores} onChange={(e) => setConProveedores(e.target.checked)} /> Ver proveedores</label>}
      >
        <div className="grid grid-cols-1 2xl:grid-cols-2 2xl:divide-x divide-gray-100">
          {equipos.piezas.length ? listaEquipos : <Vacio>Todavía no hay equipos en servicio.</Vacio>}
          {contratos.n ? listaContratos : <Vacio>Todavía no hay contratos vivos.</Vacio>}
        </div>
      </Tarjeta>

      <Pista ref={pista} />

      {/* Documento de impresión: en pantalla no existe; al imprimir sale él solo (mismo mecanismo que las cuentas anuales) */}
      {createPortal(
        <div className="ccaa-print-doc mapa-impreso print-exact text-black">
          <div className="mb-2 flex items-baseline justify-between border-b border-gray-300 pb-1">
            <h1 className="text-[15pt] font-bold">FMV: mapa de equipos y contratos</h1>
            <span className="text-[9pt] text-gray-600">{hoy}. {esDireccion ? 'Las dos vistas.' : 'Equipos y mantenimiento.'}</span>
          </div>
          <div className="mb-1 flex items-baseline justify-between"><h2 className="text-[11pt] font-semibold">Lo que se mantiene</h2><span className="text-[9pt] text-gray-600">{notaEquipos}. El tamaño de cada pieza es su número de equipos.</span></div>
          <Chapa {...propsEquipos} anchoFijo={ANCHO_HOJA} altoFijo={200} />
          <div className="mt-1 mb-3"><Leyenda de="equipos" /></div>
          <div className="mb-1 flex items-baseline justify-between"><h2 className="text-[11pt] font-semibold">Lo que se paga</h2><span className="text-[9pt] text-gray-600">{notaContratos}. El tamaño de cada pieza es su importe anual sin IVA.</span></div>
          <Chapa {...propsContratos} anchoFijo={ANCHO_HOJA} altoFijo={270} />
          <div className="mt-1 space-y-1">{bandeja}<Leyenda de="contratos" /></div>
          <div className="break-before-page pt-[4mm]">
            <h2 className="mb-1 text-[11pt] font-semibold">Lista de piezas: equipos</h2>
            {listaEquipos}
            <h2 className="mt-4 mb-1 text-[11pt] font-semibold">Lista de piezas: contratos</h2>
            {listaContratos}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

// Lo que Tailwind no da: el rayado de «no se sabe», el cambio de tono al pasar y la hoja apaisada
const ESTILO = `
.mapa-pieza { background: ${ACERO}; }
.mapa-pieza:hover, .mapa-pieza:focus-visible { background: ${ACERO_VIVO}; }
.mapa-cabecera:hover, .mapa-cabecera:focus-visible { background: rgba(255, 255, 255, 0.35); }
.mapa-sin { background: repeating-linear-gradient(45deg, ${ACERO} 0 5px, #D3DCE6 5px 6px); }
.mapa-sin:hover, .mapa-sin:focus-visible { background: repeating-linear-gradient(45deg, ${ACERO_VIVO} 0 5px, #D3DCE6 5px 6px); }
@page { size: A4 landscape; margin: 0; }
@media print { .ccaa-print-doc.mapa-impreso { padding: 9mm 13mm 6mm; width: 297mm; } }
`
