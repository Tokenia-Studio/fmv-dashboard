// ============================================
// CONTRATOS - Alta y edición de un contrato (US-005, US-006, US-007, US-014, flujo 3)
// ============================================
// Solo dirección cambia la vista y la confirma (además lo impide un trigger en la
// base de datos). El importe anual se normaliza a 12 meses cuando la periodicidad
// lo permite; si no, se teclea o se deja pendiente.
//
// Desde el lector de PDF llega `propuesta` (campos leídos, marcados «IA» o «IA ·
// revisar») y `documento` (el PDF, que se sube con su nombre definitivo al guardar).
// En el alta se pueden crear los equipos que cubre (flujo 3) y su revisión de
// mantenimiento. Nada se guarda hasta pulsar Guardar.

import React, { useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import {
  CATEGORIAS, ESTADOS_DOCUMENTALES, ESTADOS_QUE_NO_SUMAN, PERIODICIDADES, RENOVACIONES, NAVES, VISTAS,
  TIPOS_EQUIPO, TIPOS_OBLIGACION, REGIMENES, CATEGORIAS_CON_REVISION,
  importeAnualDe, vistaPropuesta, siguienteCodigo, proveedorCortoPropuesto, slugBloque, codigoProveedorBC,
  regimenPorCategoria, tipoEquipoPropuesto, etiquetaRevision, componerNombreFichero, equipoExistente,
} from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, EntradaFecha, PieFormulario, Aviso, Badge, useCampos, useGuardar, eur } from './ui'

const CAMPOS = [
  'codigo', 'proveedor_nombre', 'proveedor_codigo', 'proveedor_corto', 'categoria', 'objeto', 'nave', 'referencia', 'importe', 'periodicidad',
  'importe_anual', 'importe_declarado', 'inicio', 'inicio_precision', 'fin', 'fin_precision', 'renovacion', 'preaviso_dias',
  'estado_documental', 'cuenta_gasto', 'observaciones', 'vista', 'vista_confirmada',
]
const NUMERICOS = ['importe', 'importe_anual', 'importe_declarado', 'preaviso_dias']

export default function FormContrato({ contrato, propuesta, documento, onClose, onGuardado }) {
  const { modelo, vista, recargar, esDireccion, maestroProveedores } = useContratos()
  const leido = propuesta?.valores || {}
  const marcas = propuesta?.marcas || {}
  const inicial = contrato
    ? Object.fromEntries(CAMPOS.map((k) => [k, contrato[k] ?? (k === 'vista_confirmada' ? false : '')]))
    : {
        codigo: siguienteCodigo(modelo.contratos),
        vista: esDireccion ? (leido.categoria ? vistaPropuesta(leido.categoria) : vista) : 'compras_fabrica',
        vista_confirmada: esDireccion,
        estado_documental: 'Vigente',
        renovacion: 'no consta',
        periodicidad: 'anual',
        inicio_precision: 'dia',
        fin_precision: 'dia',
        ...leido,
      }
  // Equipos que menciona el PDF: los que ya existen se marcan para enlazar (no se duplican)
  const [yaExistian] = useState(() => {
    const out = []
    for (const e of propuesta?.equipos || []) {
      const x = equipoExistente(e, modelo)
      if (x && !out.some((y) => y.tipo === x.tipo && y.id === x.id)) out.push({ ...x, propuesto: e.nombre })
    }
    return out
  })
  const idsDe = (x) => (x.tipo === 'grupo' ? (modelo.grupo(x.id)?.unidades || []).filter((u) => u.estado !== 'baja').map((u) => u.id) : [x.id])
  const { f, campo, poner } = useCampos({ ...inicial, equipos: contrato ? contrato.equiposIds : [...new Set(yaExistian.flatMap(idsDe))] })
  const [anualManual, setAnualManual] = useState(contrato ? importeAnualDe(contrato.importe, contrato.periodicidad) == null && contrato.importe_anual != null : false)
  const { guardando, error, setError, guardar } = useGuardar(recargar)
  // Si algo falla después de crear el contrato (p. ej. al subir el PDF), reintentar no lo duplica
  const creado = useRef(null)

  // Equipos nuevos (flujo 3) y revisión de mantenimiento: solo en el alta
  const [nuevos, setNuevos] = useState(() =>
    (propuesta?.equipos || []).filter((e) => !yaExistian.some((y) => y.propuesto === e.nombre)).map((e) => ({ ...e, nave: leido.nave || '' })),
  )
  const [revision, setRevision] = useState({
    crear: !contrato && CATEGORIAS_CON_REVISION.includes(leido.categoria || ''),
    meses: propuesta?.revisionMeses || 12,
    tipo: leido.categoria === 'Calibración' ? 'Calibración' : leido.categoria === 'Inspección' ? 'Inspección' : 'Revisión',
  })

  const proveedores = useMemo(
    () => Object.entries(maestroProveedores).map(([codigo, v]) => ({ codigo, nombre: typeof v === 'string' ? v : v?.nombre })).filter((p) => p.nombre),
    [maestroProveedores],
  )
  const anualCalculado = importeAnualDe(f.importe, f.periodicidad)
  // Lista para enlazar: equipos sueltos y grupos como una sola línea («Puente grúa GH × 4»)
  const sueltosElegibles = modelo.equipos.filter((e) => !e.grupo_id && (e.estado !== 'baja' || f.equipos.includes(e.id)))
  const gruposElegibles = modelo.grupos.filter((g) => g.unidades.some((u) => u.estado !== 'baja' || f.equipos.includes(u.id)))
  const idsGrupo = (g) => g.unidades.filter((u) => u.estado !== 'baja').map((u) => u.id)
  const grupoMarcado = (g) => idsGrupo(g).length > 0 && idsGrupo(g).every((id) => f.equipos.includes(id))
  const alternarGrupo = (g) => {
    const ids = idsGrupo(g)
    poner('equipos', grupoMarcado(g) ? f.equipos.filter((x) => !ids.includes(x)) : [...new Set([...f.equipos, ...ids])])
  }
  // Equipos existentes marcados que aún no tienen ninguna obligación viva: también reciben la revisión
  const existentesSinPlan = f.equipos.map((id) => modelo.equipo(id)).filter((e) => e && !e.grupo_id && e.estado !== 'baja' && !e.obligaciones.some((o) => o.viva))
  const gruposSinPlan = gruposElegibles.filter((g) => grupoMarcado(g) && !g.obligaciones.some((o) => o.viva))

  const IA = ({ c }) => (marcas[c] ? <Badge color={marcas[c] === 'dudoso' ? 'ambar' : 'azul'} title="Leído del PDF: revísalo antes de guardar">{marcas[c] === 'dudoso' ? 'IA · revisar' : 'IA'}</Badge> : null)
  const T = (texto, c) => <>{texto} <IA c={c} /></>

  const cambiarProveedor = (e) => {
    const nombre = e.target.value
    poner('proveedor_nombre', nombre)
    const p = proveedores.find((x) => x.nombre === nombre)
    if (p) poner('proveedor_codigo', p.codigo)
  }
  const cambiarCategoria = (e) => {
    const cat = e.target.value
    poner('categoria', cat)
    if (!contrato && esDireccion) poner('vista', vistaPropuesta(cat))
    if (!contrato) setRevision((r) => ({ ...r, crear: CATEGORIAS_CON_REVISION.includes(cat) }))
  }
  const alternarEquipo = (id) => poner('equipos', f.equipos.includes(id) ? f.equipos.filter((x) => x !== id) : [...f.equipos, id])
  const cambiarNuevo = (i, k, v) => setNuevos((l) => l.map((x, j) => (j === i ? { ...x, [k]: v, ...(k === 'nombre' && !x.tipoTocado ? { tipo: tipoEquipoPropuesto(v) } : {}), ...(k === 'tipo' ? { tipoTocado: true } : {}) } : x)))
  const anadirNuevo = () => setNuevos((l) => [...l, { nombre: '', tipo: 'Instalaciones', unidades: 1, num_serie: '', modelo: '', nave: f.nave || '', regimen: regimenPorCategoria(f.categoria, f.objeto) }])

  const cerrar = () => {
    if (documento?.rutaTemporal && !creado.current) contratosDb.borrarTemporal(documento.rutaTemporal)
    onClose()
  }

  const enviar = async (ev) => {
    ev.preventDefault()
    for (const [k, t] of [['proveedor_nombre', 'el proveedor'], ['categoria', 'la categoría'], ['objeto', 'el objeto'], ['estado_documental', 'el estado']]) {
      if (!String(f[k] || '').trim()) return setError(`Falta ${t}.`)
    }
    for (const k of NUMERICOS) {
      if (f[k] !== '' && f[k] != null && isNaN(Number(String(f[k]).replace(',', '.')))) return setError('Hay un importe o un preaviso que no es un número.')
    }
    if (f.inicio && f.fin && f.fin < f.inicio) return setError('La fecha fin es anterior al inicio.')
    if (nuevos.some((n) => !n.nombre.trim())) return setError('Hay un equipo nuevo sin nombre.')
    if (nuevos.some((n) => !Number.isInteger(Number(n.unidades)) || Number(n.unidades) < 1 || Number(n.unidades) > 500)) return setError('Las unidades de cada equipo nuevo van de 1 a 500.')
    const meses = Number(revision.meses)
    if (revision.crear && (!Number.isInteger(meses) || meses < 1 || meses > 120)) return setError('La periodicidad de la revisión va en meses (1 a 120).')
    const corto = slugBloque(f.proveedor_corto || proveedorCortoPropuesto(f.proveedor_nombre))

    const fila = {}
    for (const k of CAMPOS) {
      let v = f[k]
      if (typeof v === 'string') v = v.trim()
      if (NUMERICOS.includes(k)) v = v === '' || v == null ? null : Number(String(v).replace(',', '.'))
      fila[k] = v === '' ? null : v
    }
    fila.proveedor_corto = corto || null
    fila.proveedor_codigo = codigoProveedorBC(fila.proveedor_codigo)
    if (!anualManual) fila.importe_anual = anualCalculado
    if (!fila.inicio) fila.inicio_precision = null
    if (!fila.fin) fila.fin_precision = null
    fila.vivo = !ESTADOS_QUE_NO_SUMAN.includes(fila.estado_documental)
    if (!esDireccion) {
      // compras no cambia ni confirma la vista (la base de datos también lo impide)
      delete fila.vista_confirmada
      if (contrato) delete fila.vista
      else fila.vista = 'compras_fabrica'
    }
    const codigo = fila.codigo
    delete fila.codigo

    const hecho = await guardar(async () => {
      // 1) El contrato (si ya se creó en un intento anterior, se actualiza)
      const existente = contrato || creado.current
      const c = existente
        ? await contratosDb.guardar('contratos', { id: existente.id, codigo, ...fila })
        : await contratosDb.crearContrato(fila, codigo || siguienteCodigo(modelo.contratos))
      if (!contrato) creado.current = c

      // 2) Equipos nuevos: uno suelto o un grupo con sus unidades
      const idsNuevos = []
      const destinosRevision = [...existentesSinPlan.map((e) => ({ equipo_id: e.id })), ...gruposSinPlan.map((g) => ({ grupo_id: g.id }))]
      for (const n of nuevos.filter((x) => !x.creado)) {
        const base = { tipo: n.tipo, nave: n.nave || null, regimen: n.regimen, estado: 'activo' }
        if (Number(n.unidades) > 1) {
          const g = await contratosDb.guardar('grupos', { nombre: n.nombre.trim(), tipo: n.tipo, nave: n.nave || null })
          const uds = await contratosDb.crearUnidades(g, Number(n.unidades), { ...base, nombre: n.nombre.trim() })
          idsNuevos.push(...uds.map((u) => u.id))
          destinosRevision.push({ grupo_id: g.id })
        } else {
          const e = await contratosDb.guardar('equipos', { ...base, nombre: n.nombre.trim(), num_serie: n.num_serie || null, modelo: n.modelo || null })
          idsNuevos.push(e.id)
          destinosRevision.push({ equipo_id: e.id })
        }
        n.creado = true // no se vuelve a crear si hay que reintentar
      }

      // 3) Enlaces contrato—equipo
      const antes = contrato ? contrato.equiposIds : []
      await contratosDb.fijarEquiposDeContrato(c.id, [...new Set([...f.equipos, ...idsNuevos])], antes)

      // 4) Revisión de mantenimiento propuesta (sin fecha: la app pide fijar la primera)
      if (revision.crear) {
        for (const d of destinosRevision) {
          await contratosDb.guardar('obligaciones', {
            ...d, contrato_id: c.id, tipo: revision.tipo, etiqueta: etiquetaRevision(meses, revision.tipo),
            periodicidad_meses: meses, proveedor_nombre: fila.proveedor_nombre,
          })
        }
        revision.crear = false
      }

      // 5) El PDF leído, con su nombre definitivo, como documento de origen del contrato
      if (documento?.fichero && !documento.subido) {
        const tipoDoc = documento.tipo || 'contrato'
        const nombre = componerNombreFichero({
          fecha: documento.fecha, precision: documento.precision, proveedorCorto: corto,
          tipo: tipoDoc, objeto: fila.objeto, referencia: fila.referencia,
        })
        await contratosDb.subirDocumento(documento.fichero, `${corto}/${nombre}`, {
          nombre_original: documento.fichero.name, tipo: tipoDoc, rol: 'origen',
          fecha: documento.fecha || null, fecha_precision: documento.fecha ? documento.precision || 'dia' : null,
          referencia: fila.referencia, descripcion: fila.objeto,
        }, [c.id])
        documento.subido = true
        await contratosDb.borrarTemporal(documento.rutaTemporal)
      }
      return c
    })
    if (hecho) (onGuardado || onClose)(hecho)
  }

  const titulo = contrato ? `Editar ${contrato.codigo || contrato.proveedor_nombre}` : documento ? 'Nuevo contrato desde PDF' : 'Nuevo contrato'
  return (
    <Modal titulo={titulo} onClose={cerrar} ancho="max-w-3xl">
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {propuesta && (
            <div className="sm:col-span-3 space-y-2">
              <Aviso color="azul">
                Datos leídos del PDF <strong>{documento?.fichero?.name}</strong>. Los marcados <Badge color="azul">IA</Badge> vienen del documento y los <Badge color="ambar">IA · revisar</Badge> son dudosos: compruébalos antes de guardar. Lo que el documento no dice está vacío.
              </Aviso>
              {propuesta.avisos?.length > 0 && <Aviso>{propuesta.avisos.map((a, i) => <div key={i}>{a}</div>)}</Aviso>}
            </div>
          )}
          <Etiqueta texto="Código"><Entrada {...campo('codigo')} /></Etiqueta>
          <Etiqueta texto={T('Proveedor *', 'proveedor_nombre')} className="sm:col-span-2">
            <Entrada value={f.proveedor_nombre} onChange={cambiarProveedor} list="ctr-proveedores" autoFocus={!contrato && !propuesta} />
            <datalist id="ctr-proveedores">{proveedores.map((p) => <option key={p.codigo} value={p.nombre}>{p.codigo}</option>)}</datalist>
          </Etiqueta>
          <Etiqueta texto={T('Nº proveedor BC', 'proveedor_codigo')} ayuda="Se rellena al elegir un proveedor del maestro."><Entrada {...campo('proveedor_codigo')} /></Etiqueta>
          <Etiqueta texto="Nombre corto" ayuda="El que va en el nombre de los ficheros: Chubb, Gruaspuente. Sin espacios ni acentos.">
            <Entrada {...campo('proveedor_corto')} placeholder={proveedorCortoPropuesto(f.proveedor_nombre) || 'Chubb'} />
          </Etiqueta>
          <Etiqueta texto={T('Categoría *', 'categoria')}>
            <Entrada value={f.categoria} onChange={cambiarCategoria} list="ctr-categorias" />
            <datalist id="ctr-categorias">{CATEGORIAS.map((t) => <option key={t} value={t} />)}</datalist>
          </Etiqueta>
          <Etiqueta texto="Vista" ayuda={esDireccion ? 'Solo dirección la cambia.' : 'La decide dirección.'}>
            {esDireccion ? (
              <Selector opciones={Object.entries(VISTAS).map(([valor, etiqueta]) => ({ valor, etiqueta }))} {...campo('vista')} />
            ) : (
              <div className="input text-sm bg-gray-50">{VISTAS[f.vista]}</div>
            )}
          </Etiqueta>
          {esDireccion && (
            <label className="sm:col-span-3 flex items-center gap-2 text-sm -mt-1">
              <input type="checkbox" checked={!!f.vista_confirmada} onChange={campo('vista_confirmada').onChange} />
              Vista confirmada por dirección (si no, se muestra como «propuesta»)
            </label>
          )}
          <Etiqueta texto={T('Objeto *', 'objeto')} className="sm:col-span-3"><Entrada {...campo('objeto')} placeholder="Revisión anual de 4 puentes grúa" /></Etiqueta>
          <Etiqueta texto={T('Nave', 'nave')}>
            <Entrada {...campo('nave')} list="ctr-naves-contrato" />
            <datalist id="ctr-naves-contrato">{NAVES.map((t) => <option key={t} value={t} />)}</datalist>
          </Etiqueta>
          <Etiqueta texto={T('Referencia', 'referencia')} ayuda="Nº de contrato, póliza u oferta."><Entrada {...campo('referencia')} /></Etiqueta>
          <Etiqueta texto={T('Estado documental *', 'estado_documental')}><Selector opciones={ESTADOS_DOCUMENTALES} {...campo('estado_documental')} /></Etiqueta>

          <Etiqueta texto={T('Importe (sin IVA)', 'importe')}><Entrada inputMode="decimal" {...campo('importe')} /></Etiqueta>
          <Etiqueta texto={T('Periodicidad del importe', 'periodicidad')}><Selector opciones={PERIODICIDADES.map((p) => ({ valor: p.valor, etiqueta: p.etiqueta }))} vacio="—" {...campo('periodicidad')} /></Etiqueta>
          <Etiqueta texto="Importe anual" ayuda={anualManual ? 'Tecleado a mano.' : anualCalculado != null ? 'Calculado a 12 meses.' : 'No se puede normalizar: tecléalo o déjalo pendiente.'}>
            {anualManual ? (
              <Entrada inputMode="decimal" {...campo('importe_anual')} />
            ) : (
              <div className="input text-sm bg-gray-50 tabular-nums">{anualCalculado != null ? eur(anualCalculado) : '—'}</div>
            )}
            <button type="button" className="text-xs text-fmv-700 underline mt-1" onClick={() => { setAnualManual(!anualManual); if (!anualManual) poner('importe_anual', anualCalculado ?? f.importe_anual ?? '') }}>
              {anualManual ? 'Calcularlo' : 'Teclearlo a mano'}
            </button>
          </Etiqueta>
          <Etiqueta texto="Importe declarado por compras" ayuda="Para detectar discrepancias con el contrato."><Entrada inputMode="decimal" {...campo('importe_declarado')} /></Etiqueta>
          <Etiqueta texto="Cuenta de gasto BC" ayuda="Necesaria para el cruce con lo contabilizado (fase 3)."><Entrada {...campo('cuenta_gasto')} placeholder="62200000" /></Etiqueta>
          <div />

          <Etiqueta texto={T('Inicio', 'inicio')}><EntradaFecha fecha={f.inicio} precision={f.inicio_precision} onChange={(d, p) => { poner('inicio', d || ''); poner('inicio_precision', p) }} /></Etiqueta>
          <Etiqueta texto={T('Fin', 'fin')} ayuda="Sin fin y con prórroga tácita anual: vence en el aniversario del inicio."><EntradaFecha fecha={f.fin} precision={f.fin_precision} onChange={(d, p) => { poner('fin', d || ''); poner('fin_precision', p) }} /></Etiqueta>
          <div className="grid grid-cols-2 gap-2">
            <Etiqueta texto={T('Renovación', 'renovacion')}><Selector opciones={RENOVACIONES} vacio="—" {...campo('renovacion')} /></Etiqueta>
            <Etiqueta texto={T('Preaviso (días)', 'preaviso_dias')}><Entrada type="number" min="0" {...campo('preaviso_dias')} /></Etiqueta>
          </div>

          <Etiqueta texto="Observaciones" className="sm:col-span-3"><textarea className="input text-sm" rows={3} {...campo('observaciones')} /></Etiqueta>

          <div className="sm:col-span-3">
            <span className="block text-xs font-medium text-gray-600 mb-1">Equipos que cubre</span>
            {yaExistian.length > 0 && (
              <Aviso color="azul">
                Ya existían y se enlazan (no se crean de nuevo): {yaExistian.map((y) => <strong key={y.tipo + y.id} className="mr-2">{y.nombre}</strong>)} <Badge color="azul">IA</Badge>
              </Aviso>
            )}
            {sueltosElegibles.length + gruposElegibles.length > 0 && (
              <div className="max-h-44 overflow-y-auto rounded border border-gray-200 grid grid-cols-1 sm:grid-cols-2 mt-1">
                {gruposElegibles.map((g) => (
                  <label key={'g' + g.id} className="flex items-center gap-2 px-2 py-1 text-sm border-b border-gray-100">
                    <input type="checkbox" checked={grupoMarcado(g)} onChange={() => alternarGrupo(g)} />
                    <span>{g.nombre} <span className="text-gray-500">× {idsGrupo(g).length} · {g.tipo}</span></span>
                  </label>
                ))}
                {sueltosElegibles.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 px-2 py-1 text-sm border-b border-gray-100">
                    <input type="checkbox" checked={f.equipos.includes(e.id)} onChange={() => alternarEquipo(e.id)} />
                    <span>{e.nombre} <span className="text-gray-500">· {e.tipo}{e.regimen !== 'propio' ? ` · ${e.regimen}` : ''}</span></span>
                  </label>
                ))}
              </div>
            )}

            {nuevos.length > 0 && (
              <div className="mt-2 space-y-2">
                <span className="block text-xs font-medium text-gray-600">Equipos nuevos {propuesta?.equipos?.length ? <Badge color="azul">IA</Badge> : null}</span>
                {nuevos.map((n, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end rounded border border-fmv-200 bg-fmv-50 p-2">
                    <Etiqueta texto="Nombre" className="col-span-2 sm:col-span-4"><Entrada value={n.nombre} onChange={(e) => cambiarNuevo(i, 'nombre', e.target.value)} placeholder="Puente grúa GH 5T" /></Etiqueta>
                    <Etiqueta texto="Tipo" className="sm:col-span-3">
                      <Entrada value={n.tipo} onChange={(e) => cambiarNuevo(i, 'tipo', e.target.value)} list="ctr-tipos-equipo-nuevo" />
                    </Etiqueta>
                    <Etiqueta texto="Unidades" className="sm:col-span-1"><Entrada type="number" min="1" max="500" value={n.unidades} onChange={(e) => cambiarNuevo(i, 'unidades', e.target.value)} /></Etiqueta>
                    <Etiqueta texto="Régimen" className="sm:col-span-2"><Selector opciones={REGIMENES} value={n.regimen} onChange={(e) => cambiarNuevo(i, 'regimen', e.target.value)} /></Etiqueta>
                    <Etiqueta texto="Nº de serie" className="sm:col-span-2"><Entrada value={n.num_serie} onChange={(e) => cambiarNuevo(i, 'num_serie', e.target.value)} disabled={Number(n.unidades) > 1} /></Etiqueta>
                    <div className="col-span-2 sm:col-span-12 flex justify-between text-xs text-gray-500">
                      <span>{Number(n.unidades) > 1 ? `Se crea un grupo con ${n.unidades} unidades; la identificación de cada una se completa después.` : ''}</span>
                      <button type="button" className="inline-flex items-center gap-1 hover:text-red-600" onClick={() => setNuevos((l) => l.filter((_, j) => j !== i))}><Trash2 size={12} /> Quitar</button>
                    </div>
                  </div>
                ))}
                <datalist id="ctr-tipos-equipo-nuevo">{TIPOS_EQUIPO.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
            )}
            {!contrato && (
              <button type="button" className="mt-2 inline-flex items-center gap-1 text-sm text-fmv-700 hover:underline" onClick={anadirNuevo}>
                <Plus size={14} /> Crear equipo nuevo
              </button>
            )}
            {f.vista === 'administracion' && (f.equipos.length > 0 || nuevos.length > 0) && (
              <p className="text-xs text-gray-500 mt-1">Al cubrir equipos, compras verá este contrato completo (importe incluido) desde la ficha de esos equipos, sin poder editarlo.</p>
            )}
          </div>

          {!contrato && (
            <div className="sm:col-span-3 rounded border border-gray-200 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={revision.crear} onChange={(e) => setRevision({ ...revision, crear: e.target.checked })} />
                Crear la revisión de mantenimiento de los equipos que cubre {propuesta?.revisionMeses ? <Badge color="azul">IA</Badge> : null}
              </label>
              {revision.crear && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <Etiqueta texto="Tipo"><Selector opciones={TIPOS_OBLIGACION} value={revision.tipo} onChange={(e) => setRevision({ ...revision, tipo: e.target.value })} /></Etiqueta>
                  <Etiqueta texto="Cada (meses)"><Entrada type="number" min="1" max="120" value={revision.meses} onChange={(e) => setRevision({ ...revision, meses: e.target.value })} /></Etiqueta>
                  <p className="col-span-2 text-xs text-gray-500">
                    Para {nuevos.length} equipo{nuevos.length === 1 ? '' : 's'} nuevo{nuevos.length === 1 ? '' : 's'}
                    {existentesSinPlan.length + gruposSinPlan.length ? ` y ${existentesSinPlan.length + gruposSinPlan.length} existente${existentesSinPlan.length + gruposSinPlan.length === 1 ? '' : 's'} sin plan` : ''}. Sin fecha de partida: la app pedirá fijar la primera.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <PieFormulario onCancelar={cerrar} guardando={guardando} error={error} textoGuardar={documento ? 'Guardar contrato y PDF' : 'Guardar'} />
      </form>
    </Modal>
  )
}
