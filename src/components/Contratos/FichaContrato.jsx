// ============================================
// CONTRATOS - Ficha del contrato (US-005, US-006, US-007)
// ============================================

import React, { useState } from 'react'
import { Pencil, Plus, Upload, Gavel } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { textoFecha, textoDia, hayDiscrepancia, VISTAS } from '../../utils/contratosVista'
import { Tarjeta, Campo, Tabla, Fila, Td, Sec, Vacio, Aviso, Badge, Pendiente, Boton, eur, valor, fechaFila, EST_CONTRATO, EST_DOCUMENTAL, EST_OBLIGACION } from './ui'
import { Cabecera } from './FichaEquipo'
import BloqueObligacion from './BloqueObligacion'
import TablaDocumentos from './TablaDocumentos'
import FormContrato from './FormContrato'
import FormObligacion from './FormObligacion'
import FormDocumento from './FormDocumento'
import FormDecision from './FormDecision'

export default function FichaContrato({ id }) {
  const { modelo, vista, cerrarFicha, abrir, puedeEditarContrato } = useContratos()
  const [form, setForm] = useState(null)
  const c = modelo.contrato(id)
  if (!c) return <Aviso>Contrato no encontrado o sin permiso para verlo. <button className="underline" onClick={cerrarFicha}>Volver</button></Aviso>

  const editable = puedeEditarContrato(c)
  const [color, texto] = EST_CONTRATO[c.calc.estado]
  const equipos = c.equiposIds.map((eid) => modelo.equipo(eid)).filter(Boolean)
  const tareas = modelo.tareas.filter((t) => t.contrato_id === c.id)
  const discrepa = hayDiscrepancia(c)
  const vivo = c.calc.estado !== 'historico'

  return (
    <div className="space-y-4">
      <Cabecera
        onVolver={cerrarFicha}
        titulo={`${c.codigo ? c.codigo + ' · ' : ''}${c.proveedor_nombre}`}
        subtitulo={c.objeto}
        acciones={
          editable && (
            <>
              <Boton variante="secundario" onClick={() => setForm('editar')}><Pencil size={14} /> Editar</Boton>
              <Boton variante="secundario" onClick={() => setForm('documento')}><Upload size={14} /> Subir documento</Boton>
              <Boton variante="secundario" onClick={() => setForm('obligacion')}><Plus size={14} /> Obligación</Boton>
              {vivo && <Boton onClick={() => setForm('decision')}><Gavel size={14} /> Registrar decisión</Boton>}
            </>
          )
        }
      />

      {!editable && <Aviso color="azul">Este contrato lo gestiona <strong>{VISTAS[c.vista]}</strong>. Lo ves porque cubre un equipo de tu vista; para cambiarlo, habla con dirección.</Aviso>}
      {c.vista !== vista && editable && <Aviso color="azul">Contrato de la vista <strong>{VISTAS[c.vista]}</strong>, enlazado a un equipo de esta.</Aviso>}
      {!c.vista_confirmada && <Aviso color="gris">Vista propuesta por la carga inicial según la categoría: la confirma dirección al editar el contrato.</Aviso>}
      {c.calc.estado === 'vencido' && <Aviso color="rojo"><strong>Vencido el {textoFecha(c.calc.vence)} sin decisión registrada.</strong> Comprobar si se sigue cobrando y registrar la decisión: renovado, renegociado o cancelado.</Aviso>}
      {c.calc.estado === 'avisar' && <Aviso color="rojo"><strong>El plazo de aviso está abierto desde el {textoDia(c.calc.avisar)}.</strong> Si nadie dice nada antes del {textoFecha(c.calc.vence)}, se renueva solo.</Aviso>}

      <Tarjeta titulo="Condiciones">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo etiqueta="Vista">{VISTAS[c.vista]}{!c.vista_confirmada && <span className="text-xs text-gray-500"> (propuesta)</span>}</Campo>
          <Campo etiqueta="Categoría">{c.categoria}</Campo>
          <Campo etiqueta="Estado documental"><Badge color={EST_DOCUMENTAL[c.estado_documental] || 'gris'}>{c.estado_documental}</Badge></Campo>
          <Campo etiqueta="Nº proveedor BC">{valor(c.proveedor_codigo, 'Pendiente')}</Campo>
          <Campo etiqueta="Nave">{valor(c.nave, 'No consta')}</Campo>
          <Campo etiqueta="Referencia">{valor(c.referencia, 'Sin referencia')}</Campo>
          <Campo etiqueta="Importe">{c.importe != null ? `${eur(c.importe)} · ${c.periodicidad || ''}` : <Pendiente>Sin importe conocido</Pendiente>}</Campo>
          <Campo etiqueta="Importe anual (sin IVA)">{c.importe_anual != null ? eur(c.importe_anual) : <Pendiente>Sin importe conocido</Pendiente>}</Campo>
          <Campo etiqueta="Inicio">{c.inicio ? fechaFila(c.inicio, c.inicio_precision) : <Pendiente>No consta</Pendiente>}</Campo>
          <Campo etiqueta="Vence">{c.calc.vence ? <>{textoFecha(c.calc.vence)} <span className="font-normal text-gray-500">· {c.calc.como}</span></> : <Pendiente>Sin vencimiento conocido</Pendiente>}</Campo>
          <Campo etiqueta="Renovación y preaviso">{valor(c.renovacion, 'No consta')}{c.renovacion === 'tácita' && !c.fin && (c.renovacion_meses ? ` cada ${c.renovacion_meses} meses` : <span className="font-normal text-gray-500"> (anual supuesta)</span>)} · {c.preaviso_dias != null ? `${c.preaviso_dias} días` : <Pendiente>preaviso no consta</Pendiente>}</Campo>
          <Campo etiqueta="Fecha límite de aviso (calculada)">{c.calc.avisar ? <><strong>{textoDia(c.calc.avisar)}</strong> <Badge color={color}>{texto}</Badge></> : <><Pendiente>No calculable</Pendiente> <Badge color={color}>{texto}</Badge></>}</Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Gasto: contratado frente a contabilizado">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo etiqueta="Contratado al año">{c.importe_anual != null ? eur(c.importe_anual) : <Pendiente>Sin importe</Pendiente>}</Campo>
          <Campo etiqueta="Declarado por compras">{c.importe_declarado != null ? <>{eur(c.importe_declarado)} {discrepa && <Badge color="rojo">No coincide</Badge>}</> : '—'}</Campo>
          <Campo etiqueta="Cuenta de gasto BC">{valor(c.cuenta_gasto, 'Pendiente: necesaria para el cruce')}</Campo>
          <Campo etiqueta="Contabilizado">{<span className="text-gray-500 font-normal">Fase 3: se leerá del diario por cuenta y nº de proveedor</span>}</Campo>
        </div>
        {c.observaciones && <p className="px-4 pb-4 text-sm whitespace-pre-line"><strong>Observaciones:</strong> {c.observaciones}</p>}
      </Tarjeta>

      {equipos.length > 0 && (
        <Tarjeta titulo="Equipos que cubre" nota="El estado de cada equipo lo lleva Equipos y mantenimiento">
          <Tabla columnas={['Equipo', 'Nave', 'Próxima obligación', '']}>
            {equipos.map((e) => {
              const p = e.principal
              return (
                <Fila key={e.id} onClick={() => abrir('equipo', e.id)}>
                  <Td className="font-medium">{e.nombre}<Sec>{e.regimen !== 'propio' ? e.regimen : ''}</Sec></Td>
                  <Td>{e.nave}</Td>
                  <Td>{p?.calc.proxima ? textoFecha(p.calc.proxima) : e.sin_plan ? <Pendiente>Sin plan de mantenimiento</Pendiente> : e.estado === 'baja' ? 'De baja' : <Pendiente>Sin fecha</Pendiente>}</Td>
                  <Td>{p && <Badge color={EST_OBLIGACION[p.calc.estado][0]}>{EST_OBLIGACION[p.calc.estado][1]}</Badge>}</Td>
                </Fila>
              )
            })}
          </Tabla>
        </Tarjeta>
      )}

      {c.obligacionesPropias.length > 0 && (
        <Tarjeta titulo="Obligaciones del propio contrato" nota="No dependen de un equipo">
          <div className="p-4 space-y-3">{c.obligacionesPropias.map((o) => <BloqueObligacion key={o.id} o={o} editable={editable} />)}</div>
        </Tarjeta>
      )}

      {c.hitos.length > 0 && (
        <Tarjeta titulo="Hitos" nota="Alta de hitos: fase 2">
          <Tabla columnas={['Fecha', 'Tipo', 'Qué', { t: 'Importe', num: true }, '']}>
            {c.hitos.map((h) => (
              <Fila key={h.id}>
                <Td>{fechaFila(h.fecha, 'dia')}</Td><Td>{h.tipo}</Td><Td>{h.descripcion}</Td>
                <Td num>{h.importe != null ? eur(h.importe) : '—'}</Td>
                <Td><Badge color={{ vencido: 'rojo', avisar: 'ambar', cerrado: 'gris' }[h.calc.estado] || 'verde'}>{h.calc.estado}</Badge></Td>
              </Fila>
            ))}
          </Tabla>
        </Tarjeta>
      )}

      <Tarjeta titulo="Documentos" nota={`${c.docs.filter((d) => d.rol === 'origen').length} de origen · ${c.docs.filter((d) => d.rol === 'cierre').length} de cierre`}>
        <TablaDocumentos docs={c.docs} vacio="No hay documentos subidos para este contrato." />
      </Tarjeta>

      {tareas.length > 0 && (
        <Tarjeta titulo="Tareas sobre este contrato">
          <Tabla columnas={['Tipo', 'Qué hay que resolver', 'Responsable', 'Estado']}>
            {tareas.map((t) => (
              <Fila key={t.id}><Td><Badge>{t.tipo}</Badge></Td><Td>{t.texto}{t.respuesta && <Sec>Respuesta: {t.respuesta}</Sec>}</Td><Td>{t.responsable || <Pendiente>Sin asignar</Pendiente>}</Td><Td>{t.estado}</Td></Fila>
            ))}
          </Tabla>
        </Tarjeta>
      )}
      {!equipos.length && !c.obligacionesPropias.length && c.vista === 'compras_fabrica' && <Vacio>Este contrato no está enlazado a ningún equipo ni tiene obligaciones propias.</Vacio>}

      {form === 'editar' && <FormContrato contrato={c} onClose={() => setForm(null)} />}
      {form === 'obligacion' && <FormObligacion nueva={{ contrato_id: c.id, proveedor_nombre: c.proveedor_nombre }} onClose={() => setForm(null)} />}
      {form === 'documento' && <FormDocumento destino={{ contrato: c }} onClose={() => setForm(null)} />}
      {form === 'decision' && <FormDecision contrato={c} onClose={() => setForm(null)} />}
    </div>
  )
}
