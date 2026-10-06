// ============================================
// CONTRATOS - Alta y edición de una obligación (US-004)
// ============================================
// Qué hay que hacerle a un equipo, grupo o contrato y cada cuánto. Si no hay ni
// última realizada ni fecha prevista, la app no inventa ninguna: sale «sin fecha
// fijada» y genera tarea. No se borra: se desactiva (conserva su historial).

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { contratosDb } from '../../lib/contratosDb'
import { TIPOS_OBLIGACION, sumaEnTotales } from '../../utils/contratosVista'
import { Modal, Etiqueta, Entrada, Selector, EntradaFecha, PieFormulario, useCampos, useGuardar } from './ui'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function FormObligacion({ obligacion, nueva = {}, onClose }) {
  const { modelo, recargar, puedeEditarContrato } = useContratos()
  const o = obligacion || nueva
  const { f, campo, poner } = useCampos({
    tipo: o.tipo || 'Revisión',
    etiqueta: o.etiqueta || '',
    periodicidad_meses: o.periodicidad_meses ?? '',
    mes_habitual: o.mes_habitual ?? '',
    proveedor_nombre: o.proveedor_nombre || '',
    precio: o.precio ?? '',
    pedido_pcp: o.pedido_pcp || '',
    primera_fecha: o.primera_fecha || '',
    primera_fecha_precision: o.primera_fecha_precision || 'dia',
    fecha_anunciada: o.fecha_anunciada || '',
    fecha_anunciada_precision: o.fecha_anunciada_precision || 'dia',
    contrato_id: o.contrato_id ?? '',
    activa: o.activa !== false,
  })
  const { guardando, error, setError, guardar } = useGuardar(recargar)

  const sujeto = o.equipo_id ? modelo.equipo(o.equipo_id)?.nombre : o.grupo_id ? modelo.grupo(o.grupo_id)?.nombre : null
  const soloContrato = !o.equipo_id && !o.grupo_id
  const contratos = modelo.contratos.filter((c) => puedeEditarContrato(c) && (sumaEnTotales(c) || c.id === o.contrato_id))

  const enviar = async (e) => {
    e.preventDefault()
    const per = f.periodicidad_meses === '' ? null : Number(f.periodicidad_meses)
    if (per != null && (!Number.isInteger(per) || per < 1 || per > 120)) return setError('La periodicidad va en meses (1 a 120).')
    if (f.precio !== '' && isNaN(Number(String(f.precio).replace(',', '.')))) return setError('El precio no es un número.')
    if (soloContrato && !f.contrato_id) return setError('Una obligación sin equipo ni grupo tiene que colgar de un contrato.')
    const etiqueta = f.etiqueta.trim() || `${f.tipo}${per ? (per === 12 ? ' anual' : per === 6 ? ' semestral' : per === 3 ? ' trimestral' : ` cada ${per} meses`) : ''}`
    const fila = {
      ...(obligacion ? { id: obligacion.id } : { equipo_id: o.equipo_id || null, grupo_id: o.grupo_id || null }),
      tipo: f.tipo,
      etiqueta,
      periodicidad_meses: per,
      mes_habitual: f.mes_habitual === '' ? null : Number(f.mes_habitual),
      proveedor_nombre: f.proveedor_nombre.trim() || null,
      precio: f.precio === '' ? null : Number(String(f.precio).replace(',', '.')),
      pedido_pcp: f.pedido_pcp.trim() || null,
      primera_fecha: f.primera_fecha || null,
      primera_fecha_precision: f.primera_fecha ? f.primera_fecha_precision : null,
      fecha_anunciada: f.fecha_anunciada || null,
      fecha_anunciada_precision: f.fecha_anunciada ? f.fecha_anunciada_precision : null,
      contrato_id: f.contrato_id === '' ? null : Number(f.contrato_id),
      activa: !!f.activa,
    }
    const hecho = await guardar(() => contratosDb.guardar('obligaciones', fila))
    if (hecho) onClose()
  }

  return (
    <Modal titulo={obligacion ? `Editar ${obligacion.etiqueta}` : `Nueva obligación${sujeto ? ` · ${sujeto}` : ''}`} onClose={onClose}>
      <form onSubmit={enviar}>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Etiqueta texto="Tipo"><Selector opciones={TIPOS_OBLIGACION} {...campo('tipo')} /></Etiqueta>
          <Etiqueta texto="Etiqueta" ayuda="Si se deja vacía: «Revisión anual», «Calibración semestral»…"><Entrada {...campo('etiqueta')} /></Etiqueta>
          <Etiqueta texto="Periodicidad (meses)" ayuda="Vacía si aún no se sabe: sale «sin fecha fijada»."><Entrada type="number" min="1" max="120" {...campo('periodicidad_meses')} /></Etiqueta>
          <Etiqueta texto="Mes habitual" ayuda="Si siempre se hace en el mismo mes, manda sobre la periodicidad.">
            <Selector opciones={MESES.map((m, i) => ({ valor: String(i + 1), etiqueta: m }))} vacio="—" value={f.mes_habitual === '' ? '' : String(f.mes_habitual)} onChange={campo('mes_habitual').onChange} />
          </Etiqueta>
          <Etiqueta texto="Última realizada antes de usar la app" ayuda="Fecha de partida. Las siguientes se registran con «Registrar realizada».">
            <EntradaFecha fecha={f.primera_fecha} precision={f.primera_fecha_precision} onChange={(d, p) => { poner('primera_fecha', d || ''); poner('primera_fecha_precision', p) }} />
          </Etiqueta>
          <Etiqueta texto="Fecha anunciada en la documentación" ayuda="Si el proveedor ya ha fijado la próxima visita.">
            <EntradaFecha fecha={f.fecha_anunciada} precision={f.fecha_anunciada_precision} onChange={(d, p) => { poner('fecha_anunciada', d || ''); poner('fecha_anunciada_precision', p) }} />
          </Etiqueta>
          <Etiqueta texto="Proveedor"><Entrada {...campo('proveedor_nombre')} /></Etiqueta>
          <Etiqueta texto="Precio (sin IVA)"><Entrada inputMode="decimal" {...campo('precio')} /></Etiqueta>
          <Etiqueta texto="Pedido PCP" ayuda="Si no hay contrato, el pedido hace de documento de origen."><Entrada {...campo('pedido_pcp')} /></Etiqueta>
          <Etiqueta texto={`Contrato que la cubre${soloContrato ? ' *' : ''}`}>
            <Selector opciones={contratos.map((c) => ({ valor: String(c.id), etiqueta: `${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}` }))} vacio="— Sin contrato (por pedido o factura) —" value={f.contrato_id === '' ? '' : String(f.contrato_id)} onChange={campo('contrato_id').onChange} disabled={soloContrato && !!o.contrato_id && !obligacion} />
          </Etiqueta>
          {obligacion && (
            <label className="sm:col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!f.activa} onChange={campo('activa').onChange} />
              Activa (desactivarla la quita del panel y del calendario, conservando su historial)
            </label>
          )}
        </div>
        <PieFormulario onCancelar={onClose} guardando={guardando} error={error} />
      </form>
    </Modal>
  )
}
