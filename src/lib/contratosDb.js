// ============================================
// MÓDULO DE CONTRATOS - acceso a las tablas ctr_* y al bucket privado 'contratos'
// ============================================
// Todo va con la sesión del usuario: lo que no le toca lo filtra la base de
// datos (RLS por rol y vista, sql/contratos_migracion_2026-09-22.sql), no esta
// capa. Aquí no hay ninguna comprobación de permisos que sustituya a la RLS:
// las de las pantallas son solo para no ofrecer botones que van a fallar.

import { supabase } from './supabase'

const BUCKET = 'contratos'
const TAMANO_MAXIMO = 20 * 1024 * 1024 // mismo tope que el bucket
const SEGUNDOS_ENLACE = 60             // enlaces firmados de corta duración (arquitectura §5)

const TABLAS = {
  contratos: 'ctr_contratos',
  grupos: 'ctr_grupos_equipos',
  equipos: 'ctr_equipos',
  contratoEquipo: 'ctr_contrato_equipo',
  obligaciones: 'ctr_obligaciones',
  realizadas: 'ctr_realizadas',
  realizadaUnidades: 'ctr_realizada_unidades',
  hitos: 'ctr_hitos',
  documentos: 'ctr_documentos',
  documentoContrato: 'ctr_documento_contrato',
  tareas: 'ctr_tareas',
  tareasNotas: 'ctr_tareas_notas',
}

// Columnas que pone la base de datos (triggers de autoría): no se envían nunca
const COLUMNAS_SERVIDOR = ['creado_por', 'modificado_por', 'creado_en', 'modificado_en', 'subido_por', 'subido_en', 'registrado_por', 'registrado_en']

const limpiar = (fila) => {
  const out = {}
  for (const [k, v] of Object.entries(fila)) {
    if (COLUMNAS_SERVIDOR.includes(k)) continue
    out[k] = v === '' ? null : v
  }
  return out
}

const fallo = (error, que) => {
  if (!error) return
  const e = new Error(mensajeError(error, que))
  e.causa = error
  throw e
}

/** Error de Supabase → frase para la persona. */
export function mensajeError(error, que = 'guardar') {
  const code = error?.code || error?.statusCode
  const msg = error?.message || String(error)
  if (code === '42501' || /row-level security|permission denied|not allowed/i.test(msg))
    return `No tienes permiso para ${que} esto.`
  if (code === '23505') return 'Ya existe un registro con ese mismo código o fichero.'
  if (code === '23514' && /fecha/.test(msg)) return 'La fecha no puede ser futura.'
  if (code === '23514') return 'Hay un dato fuera de los valores admitidos.'
  if (/Solo dirección/.test(msg)) return msg
  return `No se ha podido ${que}: ${msg}`
}

async function paginado(tabla) {
  // Volumen pequeño (cientos de filas), pero se pagina igual para no chocar con el límite de 1000
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from(tabla).select('*').range(desde, desde + 999)
    fallo(error, `leer ${tabla}`)
    filas.push(...data)
    if (data.length < 1000) return filas
  }
}

export const contratosDb = {
  /** Una consulta por tabla, en paralelo. Devuelve { contratos, grupos, equipos, … }. */
  cargarTodo: async () => {
    const claves = Object.keys(TABLAS)
    const resultados = await Promise.all(claves.map((k) => paginado(TABLAS[k])))
    return Object.fromEntries(claves.map((k, i) => [k, resultados[i]]))
  },

  /** Inserta (sin id) o actualiza (con id) una fila y la devuelve como la deja la base de datos. */
  guardar: async (entidad, fila) => {
    const tabla = TABLAS[entidad]
    const { id, ...resto } = limpiar(fila)
    const consulta = id
      ? supabase.from(tabla).update(resto).eq('id', id).select().single()
      : supabase.from(tabla).insert(resto).select().single()
    const { data, error } = await consulta
    fallo(error, 'guardar')
    return data
  },

  /** Contrato nuevo con código correlativo: si el código ya existe (otra persona, o uno que no ves), prueba el siguiente. */
  crearContrato: async (fila, codigoInicial) => {
    const m = /^([A-Z]+)(\d+)$/.exec(codigoInicial || '')
    for (let intento = 0; intento < 20; intento++) {
      const codigo = m ? `${m[1]}${String(Number(m[2]) + intento).padStart(m[2].length, '0')}` : codigoInicial
      const { id, ...resto } = limpiar({ ...fila, codigo })
      const { data, error } = await supabase.from(TABLAS.contratos).insert(resto).select().single()
      if (!error) return data
      if (error.code !== '23505' || !m) fallo(error, 'crear el contrato')
    }
    throw new Error('No se ha encontrado un código libre para el contrato.')
  },

  /** Deja exactamente estos equipos enlazados al contrato. */
  fijarEquiposDeContrato: async (contratoId, equiposIds, actuales) => {
    const quitar = actuales.filter((id) => !equiposIds.includes(id))
    const poner = equiposIds.filter((id) => !actuales.includes(id))
    if (quitar.length) {
      const { error } = await supabase.from(TABLAS.contratoEquipo).delete().eq('contrato_id', contratoId).in('equipo_id', quitar)
      fallo(error, 'desenlazar equipos del contrato')
    }
    if (poner.length) {
      const { error } = await supabase.from(TABLAS.contratoEquipo).insert(poner.map((equipo_id) => ({ contrato_id: contratoId, equipo_id })))
      fallo(error, 'enlazar equipos al contrato')
    }
  },

  /** Equipos de un grupo, de una vez («29 extintores»): nombre base + número. */
  crearUnidades: async (grupo, cantidad, plantilla, desde = 0) => {
    const filas = Array.from({ length: cantidad }, (_, i) => limpiar({
      ...plantilla,
      grupo_id: grupo.id,
      nombre: `${plantilla.nombre || grupo.nombre} ${String(i + 1 + desde).padStart(2, '0')}`,
    }))
    const { data, error } = await supabase.from(TABLAS.equipos).insert(filas).select()
    fallo(error, 'crear las unidades')
    return data
  },

  /**
   * Registra una o varias realizadas (US-003). Cada una: { obligacion_id, fecha, resultado,
   * nota, documento_id, unidades: [{ equipo_id, resultado }] }. Las unidades solo en grupos.
   * Si falla a mitad, se dice cuántas se han guardado: no hay transacción desde el navegador.
   */
  registrarRealizadas: async (lista) => {
    const hechas = []
    for (const r of lista) {
      const { unidades, ...fila } = r
      const { data, error } = await supabase.from(TABLAS.realizadas).insert(limpiar(fila)).select().single()
      if (error) {
        const e = new Error(`${mensajeError(error, 'registrar la realizada')}${hechas.length ? ` (se han guardado ${hechas.length} de ${lista.length})` : ''}`)
        e.causa = error
        throw e
      }
      if (unidades?.length) {
        const { error: eu } = await supabase.from(TABLAS.realizadaUnidades).insert(
          unidades.map((u) => ({ realizada_id: data.id, equipo_id: u.equipo_id, resultado: u.resultado })),
        )
        fallo(eu, 'guardar el resultado de cada unidad')
      }
      hechas.push(data)
    }
    return hechas
  },

  /** Un registro erróneo no se borra: se anula (queda en el historial). */
  anularRealizada: async (id) => {
    const { error } = await supabase.from(TABLAS.realizadas).update({ anulada: true }).eq('id', id)
    fallo(error, 'anular la realizada')
  },

  /** Responsable, nota o «posponer hasta» de una tarea automática. */
  guardarNotaTarea: async (clave, cambios) => {
    const { error } = await supabase.from(TABLAS.tareasNotas).upsert(limpiar({ clave, ...cambios }), { onConflict: 'clave' })
    fallo(error, 'guardar la nota de la tarea')
  },

  /**
   * Sube un PDF y crea su ficha. `ruta` es la propuesta (Proveedor/nombre.pdf); si ya
   * existe se añade -2, -3… La ficha se crea después de subir; si la ficha falla, el
   * fichero se borra para no dejar huérfanos.
   */
  subirDocumento: async (fichero, ruta, ficha, contratosIds = []) => {
    if (!fichero) throw new Error('Falta el fichero.')
    if (fichero.type && fichero.type !== 'application/pdf') throw new Error('Solo se admiten ficheros PDF.')
    if (!/\.pdf$/i.test(fichero.name)) throw new Error('Solo se admiten ficheros PDF.')
    if (fichero.size > TAMANO_MAXIMO) throw new Error('El PDF pasa de 20 MB.')

    let rutaFinal = ruta
    for (let n = 2; ; n++) {
      const { error } = await supabase.storage.from(BUCKET).upload(rutaFinal, fichero, { contentType: 'application/pdf', upsert: false })
      if (!error) break
      const existe = error.statusCode === '409' || error.statusCode === 409 || /exists|duplicate/i.test(error.message || '')
      if (!existe || n > 50) fallo(error, 'subir el PDF')
      rutaFinal = ruta.replace(/\.pdf$/i, `-${n}.pdf`)
    }

    const { data: doc, error } = await supabase.from(TABLAS.documentos)
      .insert(limpiar({ ...ficha, ruta: rutaFinal, nombre_original: ficha.nombre_original || fichero.name }))
      .select().single()
    if (error) {
      await supabase.storage.from(BUCKET).remove([rutaFinal])
      fallo(error, 'crear la ficha del documento')
    }
    if (contratosIds.length) {
      const { error: el } = await supabase.from(TABLAS.documentoContrato).insert(contratosIds.map((contrato_id) => ({ documento_id: doc.id, contrato_id })))
      fallo(el, 'enlazar el documento al contrato')
    }
    return doc
  },

  /** Enlaza un documento ya subido a más contratos (un PDF puede respaldar varios). */
  enlazarDocumento: async (documentoId, contratoId) => {
    const { error } = await supabase.from(TABLAS.documentoContrato).insert({ documento_id: documentoId, contrato_id: contratoId })
    fallo(error, 'enlazar el documento')
  },

  /** Borra ficha y fichero. La RLS decide si se puede. */
  borrarDocumento: async (doc) => {
    const { error } = await supabase.from(TABLAS.documentos).delete().eq('id', doc.id)
    fallo(error, 'borrar el documento')
    await supabase.storage.from(BUCKET).remove([doc.ruta])
  },

  /** Enlace firmado de 60 s para abrir el PDF. */
  urlDocumento: async (ruta) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, SEGUNDOS_ENLACE)
    fallo(error, 'abrir el PDF')
    return data.signedUrl
  },

  // ── Lector asistido (US-014) ────────────────────────────────────────────────

  /** ¿Está encendido el lector? (configuracion.ctr_lector_activo, apagado por defecto). */
  lectorActivo: async () => {
    const { data, error } = await supabase.from('configuracion').select('value').eq('key', 'ctr_lector_activo').maybeSingle()
    if (error) return false
    return data?.value === true
  },

  /**
   * Sube el PDF a una carpeta temporal propia (`_lectura/<uid>/`) y pide a la
   * función de servidor que lo lea. Devuelve { ruta, propuesta, candidatos }.
   * La lectura no guarda nada: la ficha la guarda la persona al confirmar, y el
   * PDF definitivo se sube entonces con su nombre compuesto. El temporal se borra
   * con borrarTemporal() al terminar (lo pueda o no leer).
   */
  leerDocumento: async (fichero, tipo) => {
    if (!fichero || !/\.pdf$/i.test(fichero.name) || (fichero.type && fichero.type !== 'application/pdf')) throw new Error('Solo se pueden leer ficheros PDF.')
    if (fichero.size > TAMANO_MAXIMO) throw new Error('El PDF pasa de 20 MB.')
    const { data: sesion } = await supabase.auth.getUser()
    const uid = sesion?.user?.id
    if (!uid) throw new Error('Sesión no válida.')
    const ruta = `_lectura/${uid}/${Date.now()}.pdf`
    const { error: eu } = await supabase.storage.from(BUCKET).upload(ruta, fichero, { contentType: 'application/pdf', upsert: false })
    fallo(eu, 'subir el PDF para leerlo')

    const { data, error } = await supabase.functions.invoke('leer-documento', { body: { tipo, ruta } })
    if (error) {
      // El cuerpo del error trae el motivo en español; si no, un mensaje genérico
      let motivo = 'La lectura ha fallado. Puedes rellenar la ficha a mano.'
      try {
        const cuerpo = await error.context?.json?.()
        if (cuerpo?.error) motivo = cuerpo.detalle ? `${cuerpo.error} (detalle: ${cuerpo.detalle})` : cuerpo.error
      } catch { /* sin cuerpo legible */ }
      const e = new Error(motivo)
      e.ruta = ruta
      throw e
    }
    return { ruta, ...data }
  },

  /** Borra el PDF temporal de lectura (solo puede quien lo subió). */
  borrarTemporal: async (ruta) => {
    if (!ruta || !ruta.startsWith('_lectura/')) return
    await supabase.storage.from(BUCKET).remove([ruta])
  },

  /** Tarea manual: borrar solo si se creó por error (las resueltas se marcan, no se borran). */
  borrarTarea: async (id) => {
    const { error } = await supabase.from(TABLAS.tareas).delete().eq('id', id)
    fallo(error, 'borrar la tarea')
  },
}
