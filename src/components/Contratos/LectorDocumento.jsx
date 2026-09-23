// ============================================
// CONTRATOS - Lector asistido de PDF (US-014)
// ============================================
// Sube el PDF, la función de servidor `leer-documento` lo lee con la API de Claude
// y propone los campos. Nada se guarda hasta que la persona confirma:
//   · Contrato / oferta / factura sin contrato → se abre la ficha del contrato rellena.
//   · Certificados de calibración (uno o varios de un mismo pedido) → se confirman
//     uno a uno: el equipo se casa por nº de serie y se registra la realizada con
//     el certificado como documento de cierre.
// Si la lectura falla o tarda demasiado, el PDF sigue disponible y la ficha se
// rellena a mano.

import React, { useMemo, useState } from 'react'
import { FileSearch, Loader2 } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import {
  fichaDesdePropuesta, equiposDesdePropuesta, componerNombreFichero, proveedorCortoPropuesto,
  fechaRealizadaValida, hoyISO, hoyLocal,
} from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, Aviso, Badge, Boton, PieFormulario, useGuardar } from './ui'

const TIPOS = [
  { valor: 'contrato', etiqueta: 'Contrato, oferta, póliza o renovación', ayuda: 'Propone la ficha del contrato y los equipos que cubre.' },
  { valor: 'factura', etiqueta: 'Factura de un servicio sin contrato', ayuda: 'La factura hace de documento de origen: proveedor, importe y periodo cubierto.' },
  { valor: 'certificado', etiqueta: 'Certificados de calibración o revisión', ayuda: 'Puedes elegir varios del mismo pedido: se confirman uno a uno.' },
]

/**
 * @param tipoInicial  'contrato' | 'factura' | 'certificado'
 * @param onFicha      (propuestaFormulario | null, documento) → abre FormContrato
 */
export default function LectorDocumento({ tipoInicial = 'contrato', onFicha, onClose }) {
  const [tipo, setTipo] = useState(tipoInicial)
  const [ficheros, setFicheros] = useState([])
  const [estado, setEstado] = useState({ fase: 'elegir' }) // elegir | leyendo | error | certificados
  const { maestroProveedores } = useContratos()

  const leer = async () => {
    if (!ficheros.length) return
    if (tipo === 'certificado') {
      setEstado({ fase: 'certificados', cola: ficheros, indice: 0 })
      return
    }
    const fichero = ficheros[0]
    setEstado({ fase: 'leyendo', nombre: fichero.name })
    try {
      const r = await contratosDb.leerDocumento(fichero, tipo)
      const ficha = fichaDesdePropuesta(r.propuesta, maestroProveedores)
      onFicha(
        {
          ...ficha,
          equipos: tipo === 'contrato' ? equiposDesdePropuesta(r.propuesta, ficha.valores.categoria, ficha.valores.objeto) : [],
          revisionMeses: r.propuesta.campos.revision_periodicidad_meses?.valor || null,
        },
        { fichero, tipo: tipo === 'factura' ? 'factura' : 'contrato', rutaTemporal: r.ruta, ...ficha.documento },
      )
    } catch (err) {
      setEstado({ fase: 'error', mensaje: err.message, ruta: err.ruta, fichero })
    }
  }

  const aMano = () => {
    const { fichero, ruta } = estado
    onFicha(null, { fichero, tipo: tipo === 'factura' ? 'factura' : 'contrato', rutaTemporal: ruta, fecha: null, precision: null })
  }
  const cancelar = () => {
    if (estado.ruta) contratosDb.borrarTemporal(estado.ruta)
    onClose()
  }

  if (estado.fase === 'certificados') {
    return <ConfirmarCertificados cola={estado.cola} onClose={onClose} />
  }

  return (
    <Modal titulo="Leer un PDF con IA" onClose={estado.fase === 'leyendo' ? () => {} : cancelar} ancho="max-w-lg">
      <div className="p-4 space-y-3 text-sm">
        {estado.fase === 'elegir' && (
          <>
            <div className="space-y-2">
              {TIPOS.map((t) => (
                <label key={t.valor} className={`flex gap-2 rounded border p-2 cursor-pointer ${tipo === t.valor ? 'border-fmv-600 bg-fmv-50' : 'border-gray-200'}`}>
                  <input type="radio" name="tipo" checked={tipo === t.valor} onChange={() => { setTipo(t.valor); setFicheros([]) }} />
                  <span><span className="font-medium">{t.etiqueta}</span><span className="block text-xs text-gray-500">{t.ayuda}</span></span>
                </label>
              ))}
            </div>
            <Etiqueta texto={tipo === 'certificado' ? 'Certificados (PDF)' : 'Documento (PDF)'} ayuda="Hasta 20 MB. Vale un escaneo.">
              <input type="file" accept="application/pdf,.pdf" multiple={tipo === 'certificado'} onChange={(e) => setFicheros([...e.target.files])} className="text-sm" />
            </Etiqueta>
            <p className="text-xs text-gray-500">
              El PDF se envía a leer a la IA de Anthropic (no se usa para entrenar modelos). La app propone los datos y tú los revisas: nada se guarda hasta que confirmas.
            </p>
          </>
        )}
        {estado.fase === 'leyendo' && (
          <div className="py-8 text-center text-gray-600">
            <Loader2 size={28} className="mx-auto mb-3 animate-spin text-fmv-700" />
            Leyendo <strong>{estado.nombre}</strong>…
            <span className="block text-xs text-gray-500 mt-1">Suele tardar entre 15 segundos y un minuto.</span>
          </div>
        )}
        {estado.fase === 'error' && (
          <Aviso color="rojo">
            {estado.mensaje}
            <span className="block mt-1">Puedes rellenar la ficha a mano: el PDF se guardará igualmente con ella.</span>
          </Aviso>
        )}
      </div>
      {estado.fase === 'elegir' && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>
          <Boton onClick={leer} disabled={!ficheros.length}><FileSearch size={14} /> {tipo === 'certificado' && ficheros.length > 1 ? `Leer ${ficheros.length} certificados` : 'Leer'}</Boton>
        </div>
      )}
      {estado.fase === 'error' && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <Boton variante="secundario" onClick={cancelar}>Cancelar</Boton>
          <Boton onClick={aMano}>Rellenar a mano</Boton>
        </div>
      )}
    </Modal>
  )
}

// ── Certificados: se leen y se confirman uno a uno ───────────────────────────

// Una sola lectura por fichero aunque el componente se monte dos veces (StrictMode
// en desarrollo, o al volver atrás): cada lectura sube un PDF temporal y cuesta dinero.
const lecturas = new WeakMap()
const leerUnaVez = (fichero) => {
  if (!lecturas.has(fichero)) lecturas.set(fichero, contratosDb.leerDocumento(fichero, 'certificado'))
  return lecturas.get(fichero)
}

function ConfirmarCertificados({ cola, onClose }) {
  const [indice, setIndice] = useState(0)
  const [lectura, setLectura] = useState(null) // { ruta, propuesta, candidatos } | { error }
  const [hechos, setHechos] = useState({ registrados: 0, saltados: 0 })
  const actual = cola[indice]

  React.useEffect(() => {
    if (!actual) return
    let vivo = true
    setLectura(null)
    leerUnaVez(actual)
      .then((r) => vivo && setLectura(r))
      .catch((err) => vivo && setLectura({ error: err.message, ruta: err.ruta }))
    return () => { vivo = false }
  }, [actual])

  const siguiente = (registrado) => {
    setHechos((h) => ({ registrados: h.registrados + (registrado ? 1 : 0), saltados: h.saltados + (registrado ? 0 : 1) }))
    setIndice((i) => i + 1)
  }

  if (!actual) {
    return (
      <Modal titulo="Certificados" onClose={onClose} ancho="max-w-md">
        <div className="p-4 text-sm">
          <Aviso color="verde">Terminado: {hechos.registrados} registrado{hechos.registrados === 1 ? '' : 's'}{hechos.saltados ? ` · ${hechos.saltados} sin registrar` : ''}.</Aviso>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end"><Boton onClick={onClose}>Cerrar</Boton></div>
      </Modal>
    )
  }

  return (
    <Modal titulo={`Certificado ${indice + 1} de ${cola.length} · ${actual.name}`} onClose={() => { if (lectura?.ruta) contratosDb.borrarTemporal(lectura.ruta); onClose() }} ancho="max-w-2xl">
      {!lectura ? (
        <div className="p-8 text-center text-sm text-gray-600">
          <Loader2 size={28} className="mx-auto mb-3 animate-spin text-fmv-700" />
          Leyendo el certificado…
        </div>
      ) : (
        <FormCertificado key={indice} fichero={actual} lectura={lectura} onHecho={() => siguiente(true)} onSaltar={() => { if (lectura?.ruta) contratosDb.borrarTemporal(lectura.ruta); siguiente(false) }} />
      )}
    </Modal>
  )
}

function FormCertificado({ fichero, lectura, onHecho, onSaltar }) {
  const { modelo, recargar } = useContratos()
  const { guardando, error, setError, guardar } = useGuardar(recargar)
  const c = lectura.propuesta?.campos || {}
  const exactos = lectura.candidatos?.exactos || []
  const parciales = lectura.candidatos?.parciales || []

  const [datos, setDatos] = useState({
    fecha: c.fecha?.precision === 'dia' ? c.fecha.valor : '',
    resultado: c.resultado?.valor || 'apto',
    entidad: c.entidad?.valor || '',
    referencia: c.referencia?.valor || '',
    equipoId: exactos.length === 1 ? String(exactos[0].id) : '',
    obligacionId: '',
  })
  const poner = (k, v) => setDatos((d) => ({ ...d, [k]: v }))
  const marca = (k) => (c[k]?.valor != null ? <Badge color={c[k].dudoso ? 'ambar' : 'azul'}>{c[k].dudoso ? 'IA · revisar' : 'IA'}</Badge> : null)

  // A qué se aplica: primero los equipos que casan por nº de serie, luego el resto con
  // obligaciones propias y los grupos (extintores, eslingas…: la revisión es del grupo)
  const opcionesEquipo = useMemo(() => {
    const ids = new Set([...exactos, ...parciales].map((e) => e.id))
    const conObligacion = modelo.equipos.filter((e) => e.estado !== 'baja' && !ids.has(e.id) && e.obligaciones.some((o) => o.viva && o.equipo_id === e.id))
    const grupos = modelo.grupos.filter((g) => g.obligaciones.some((o) => o.viva))
    return [
      ...exactos.map((e) => ({ valor: String(e.id), etiqueta: `✓ ${e.nombre} · serie ${e.num_serie}` })),
      ...parciales.map((e) => ({ valor: String(e.id), etiqueta: `≈ ${e.nombre} · serie ${e.num_serie}` })),
      ...grupos.map((g) => ({ valor: `g${g.id}`, etiqueta: `Grupo: ${g.nombre} (${g.unidades.filter((u) => u.estado !== 'baja').length} uds)` })),
      ...conObligacion.map((e) => ({ valor: String(e.id), etiqueta: `${e.nombre}${e.num_serie ? ` · serie ${e.num_serie}` : ''}` })),
    ]
  }, [modelo, exactos, parciales])

  const esGrupo = datos.equipoId.startsWith('g')
  const equipo = !datos.equipoId ? null : esGrupo ? modelo.grupo(Number(datos.equipoId.slice(1))) : modelo.equipo(Number(datos.equipoId))
  const obligaciones = !equipo ? [] : esGrupo ? equipo.obligaciones.filter((o) => o.viva) : equipo.obligaciones.filter((o) => o.viva && o.equipo_id === equipo.id)
  const obligacionId = datos.obligacionId || String((obligaciones.find((o) => o.tipo === 'Calibración') || obligaciones[0])?.id || '')
  const obligacion = obligacionId ? modelo.obligacion(Number(obligacionId)) : null

  const enviar = async (e) => {
    e.preventDefault()
    if (!obligacion) return setError('Elige el equipo y la obligación que certifica.')
    if (!fechaRealizadaValida(datos.fecha, hoyLocal())) return setError('Indica la fecha de la calibración (no puede ser futura).')
    const hecho = await guardar(async () => {
      const contrato = obligacion.contrato_id ? modelo.contrato(obligacion.contrato_id) : null
      const corto = contrato?.proveedor_corto || proveedorCortoPropuesto(datos.entidad || obligacion.proveedor_nombre || 'Proveedor')
      const nombre = componerNombreFichero({
        fecha: datos.fecha, precision: 'dia', proveedorCorto: corto, tipo: 'certificado',
        objeto: `${obligacion.tipo} ${equipo.nombre}`, referencia: (!esGrupo && equipo.num_serie) || datos.referencia,
      })
      const doc = await contratosDb.subirDocumento(fichero, `${corto}/${nombre}`, {
        nombre_original: fichero.name, tipo: 'certificado', rol: 'cierre', fecha: datos.fecha, fecha_precision: 'dia',
        referencia: datos.referencia || null, descripcion: `${obligacion.tipo} · ${equipo.nombre}`, obligacion_id: obligacion.id,
      })
      await contratosDb.registrarRealizadas([{
        obligacion_id: obligacion.id, fecha: datos.fecha, resultado: datos.resultado, documento_id: doc.id,
        // En un grupo el certificado da el resultado global; el de cada unidad se marca desde la ficha del grupo
        nota: [datos.entidad && `Certifica: ${datos.entidad}`, datos.referencia && `Certificado ${datos.referencia}`, esGrupo && 'resultado del grupo completo', 'leído con IA'].filter(Boolean).join(' · '),
        unidades: [],
      }])
      await contratosDb.borrarTemporal(lectura.ruta)
      return true
    })
    if (hecho) onHecho()
  }

  return (
    <form onSubmit={enviar}>
      <div className="p-4 space-y-3 text-sm">
        {lectura.error ? (
          <Aviso color="rojo">{lectura.error} Puedes registrarlo a mano: elige el equipo, la fecha y el resultado.</Aviso>
        ) : (
          <>
            <Aviso color="azul">
              Nº de serie leído: <strong>{c.num_serie?.valor || '—'}</strong> {marca('num_serie')}.{' '}
              {exactos.length === 1 ? 'Casa con un equipo.' : exactos.length > 1 ? `Casa con ${exactos.length} equipos: elige el correcto.` : parciales.length ? 'No casa exacto: hay equipos parecidos, elige.' : 'No casa con ningún equipo: elígelo de la lista.'}
            </Aviso>
            {lectura.propuesta?.avisos?.length > 0 && <Aviso>{lectura.propuesta.avisos.join(' · ')}</Aviso>}
          </>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Equipo *" className="sm:col-span-2">
            <Selector opciones={opcionesEquipo} vacio="— Elige el equipo —" value={datos.equipoId} onChange={(e) => { poner('equipoId', e.target.value); poner('obligacionId', '') }} />
          </Etiqueta>
          {equipo && (
            <Etiqueta texto="Qué certifica *" className="sm:col-span-2">
              {obligaciones.length ? (
                <Selector opciones={obligaciones.map((o) => ({ valor: String(o.id), etiqueta: `${o.tipo} · ${o.etiqueta}` }))} value={obligacionId} onChange={(e) => poner('obligacionId', e.target.value)} />
              ) : (
                <span className="block text-amber-700">Este equipo no tiene ninguna obligación propia. Créala desde su ficha y vuelve a leer el certificado.</span>
              )}
            </Etiqueta>
          )}
          <Etiqueta texto={<>Fecha de la calibración * {marca('fecha')}</>}><Entrada type="date" max={hoyISO()} value={datos.fecha} onChange={(e) => poner('fecha', e.target.value)} /></Etiqueta>
          <Etiqueta texto={<>Resultado {marca('resultado')}</>}>
            <Selector opciones={['apto', 'no apto', 'sin resultado']} value={datos.resultado} onChange={(e) => poner('resultado', e.target.value)} />
          </Etiqueta>
          <Etiqueta texto={<>Entidad que certifica {marca('entidad')}</>}><Entrada value={datos.entidad} onChange={(e) => poner('entidad', e.target.value)} /></Etiqueta>
          <Etiqueta texto={<>Nº de certificado {marca('referencia')}</>}><Entrada value={datos.referencia} onChange={(e) => poner('referencia', e.target.value)} /></Etiqueta>
        </div>
      </div>
      <PieFormulario onCancelar={onSaltar} guardando={guardando} error={error} textoGuardar="Registrar calibración">
        <span className="text-xs text-gray-500 mr-auto">«Cancelar» salta este certificado sin registrarlo.</span>
      </PieFormulario>
    </form>
  )
}
