// ============================================
// CONTRATOS - Ficha única del equipo (US-002)
// ============================================

import React, { useState } from 'react'
import { ArrowLeft, Pencil, Plus, Upload } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { textoFecha, textoDia } from '../../utils/contratosVista'
import { Tarjeta, Campo, Tabla, Fila, Td, Sec, Vacio, Aviso, Badge, Pendiente, Boton, eur, valor, EST_CONTRATO } from './ui'
import BloqueObligacion from './BloqueObligacion'
import FormEquipo from './FormEquipo'
import FormObligacion from './FormObligacion'
import FormDocumento from './FormDocumento'
import TablaDocumentos from './TablaDocumentos'

export default function FichaEquipo({ id }) {
  const { modelo, cerrarFicha, abrir } = useContratos()
  const [form, setForm] = useState(null)
  const e = modelo.equipo(id)
  if (!e) return <Aviso>Equipo no encontrado. <button className="underline" onClick={cerrarFicha}>Volver</button></Aviso>

  const contratos = e.contratosIds.map((cid) => modelo.contrato(cid)).filter(Boolean)
  const propias = e.obligaciones.filter((o) => o.equipo_id === e.id)
  const delGrupo = e.obligaciones.filter((o) => o.equipo_id !== e.id)
  const tareas = modelo.tareas.filter((t) => t.equipo_id === e.id)

  return (
    <div className="space-y-4">
      <Cabecera
        onVolver={cerrarFicha}
        titulo={e.nombre}
        subtitulo={[e.tipo, e.modelo, e.nave].filter(Boolean).join(' · ')}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setForm('editar')}><Pencil size={14} /> Editar equipo</Boton>
            <Boton variante="secundario" onClick={() => setForm('documento')}><Upload size={14} /> Subir documento</Boton>
            {e.estado !== 'baja' && <Boton onClick={() => setForm('obligacion')}><Plus size={14} /> Nueva obligación</Boton>}
          </>
        }
      />

      {e.estado !== 'activo' && <Aviso color={e.estado === 'baja' ? 'gris' : 'ambar'}>Estado del equipo: <strong>{e.estado}</strong>.{e.estado === 'baja' ? ' No genera obligaciones ni aparece como pendiente.' : ' Sus obligaciones siguen vivas.'}</Aviso>}
      {e.noApto && <Aviso color="rojo"><strong>Resultado no apto</strong> en la última revisión. Queda señalado hasta que se registre la reparación (una realizada apta) o la baja o sustitución del equipo.</Aviso>}
      {e.sin_plan && <Aviso>Sin plan de mantenimiento: decidir si se contrata una revisión{e.regimen !== 'propio' ? ' o si la cubre el arrendador' : ''}.</Aviso>}

      <Tarjeta titulo="El equipo">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo etiqueta="Tipo">{e.tipo}</Campo>
          <Campo etiqueta="Régimen">{e.regimen}</Campo>
          <Campo etiqueta="Código de activo fijo BC">{e.regimen === 'propio' ? valor(e.activo_fijo_bc, 'Pendiente: sin código en BC') : e.activo_fijo_bc || <span className="text-gray-500">No aplica ({e.regimen})</span>}</Campo>
          <Campo etiqueta="Nº interno">{valor(e.num_interno, 'Sin número')}</Campo>
          <Campo etiqueta="Modelo">{valor(e.modelo, 'No consta')}</Campo>
          <Campo etiqueta="Nº de serie">{valor(e.num_serie, 'No consta')}</Campo>
          <Campo etiqueta="Identificación">{valor(e.identificacion, 'No consta')}</Campo>
          <Campo etiqueta="Grupo">{e.grupo ? <button className="text-fmv-700 hover:underline" onClick={() => abrir('grupo', e.grupo.id)}>{e.grupo.nombre}</button> : '—'}</Campo>
          <Campo etiqueta="Nave">{valor(e.nave, 'No consta')}</Campo>
          <Campo etiqueta="Asignado a">{valor(e.asignado_a, 'Sin asignar')}</Campo>
          <Campo etiqueta="Estado">{e.estado}</Campo>
          <Campo etiqueta="Plan de mantenimiento">{e.sin_plan ? 'Sin plan' : 'Sí'}</Campo>
        </div>
        {e.observaciones && <p className="px-4 pb-4 text-sm"><strong>Observaciones:</strong> {e.observaciones}</p>}
      </Tarjeta>

      <Tarjeta titulo="Obligaciones" nota="La próxima fecha se calcula; al registrar una realizada nace la siguiente">
        <div className="p-4 space-y-3">
          {propias.map((o) => <BloqueObligacion key={o.id} o={o} />)}
          {delGrupo.map((o) => (
            <div key={o.id}>
              <p className="text-xs text-gray-500 mb-1">Del grupo <button className="text-fmv-700 hover:underline" onClick={() => abrir('grupo', o.grupo_id)}>{o.sujeto.nombre}</button> (se registra en el grupo, con resultado por unidad)</p>
              <BloqueObligacion o={o} editable={false} />
            </div>
          ))}
          {!e.obligaciones.length && <Vacio>{e.estado === 'baja' ? 'Equipo de baja: no genera obligaciones.' : 'Sin obligaciones definidas.'}</Vacio>}
        </div>
      </Tarjeta>

      {contratos.length > 0 && (
        <Tarjeta titulo="Contrato que lo cubre" nota={contratos.some((c) => c.vista === 'administracion') ? 'El alquiler o renting lo lleva Servicios y arrendamientos' : ''}>
          <TablaContratosCortos contratos={contratos} onAbrir={(c) => abrir('contrato', c.id)} />
        </Tarjeta>
      )}

      <Tarjeta titulo="Documentos del equipo">
        <TablaDocumentos docs={e.docs} vacio="Sin documentos propios (los de cada obligación están en su bloque)." />
      </Tarjeta>

      {tareas.length > 0 && (
        <Tarjeta titulo="Tareas sobre este equipo">
          <Tabla columnas={['Tipo', 'Qué hay que resolver', 'Responsable', 'Estado']}>
            {tareas.map((t) => (
              <Fila key={t.id}><Td><Badge>{t.tipo}</Badge></Td><Td>{t.texto}</Td><Td>{t.responsable || <Pendiente>Sin asignar</Pendiente>}</Td><Td>{t.estado}</Td></Fila>
            ))}
          </Tabla>
        </Tarjeta>
      )}

      {form === 'editar' && <FormEquipo equipo={e} onClose={() => setForm(null)} />}
      {form === 'obligacion' && <FormObligacion nueva={{ equipo_id: e.id }} onClose={() => setForm(null)} />}
      {form === 'documento' && <FormDocumento destino={{ equipo: e }} onClose={() => setForm(null)} />}
    </div>
  )
}

export function Cabecera({ onVolver, titulo, subtitulo, acciones, children }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <button onClick={onVolver} className="text-sm text-fmv-700 hover:underline inline-flex items-center gap-1"><ArrowLeft size={14} /> Volver</button>
        <h2 className="text-lg font-bold text-slate-800">{titulo}</h2>
        {subtitulo && <p className="text-sm text-gray-500">{subtitulo}</p>}
        {children}
      </div>
      <div className="flex flex-wrap gap-2">{acciones}</div>
    </div>
  )
}

export function TablaContratosCortos({ contratos, onAbrir }) {
  return (
    <Tabla columnas={['Contrato', 'Vista', { t: 'Importe anual', num: true }, 'Vence', '']}>
      {contratos.map((c) => {
        const [color, texto] = EST_CONTRATO[c.calc.estado]
        return (
          <Fila key={c.id} onClick={() => onAbrir(c)}>
            <Td><span className="font-medium">{c.codigo ? `${c.codigo} · ` : ''}{c.proveedor_nombre}</span><Sec>{c.objeto}</Sec></Td>
            <Td>{c.vista === 'administracion' ? 'Servicios y arrendamientos' : 'Equipos y mantenimiento'}</Td>
            <Td num>{c.importe_anual != null ? eur(c.importe_anual) : <Pendiente>Sin importe</Pendiente>}</Td>
            <Td className="whitespace-nowrap">{c.calc.vence ? textoFecha(c.calc.vence) : <Pendiente>No consta</Pendiente>}{c.calc.avisar && <Sec>Avisar antes del {textoDia(c.calc.avisar)}</Sec>}</Td>
            <Td><Badge color={color}>{texto}</Badge></Td>
          </Fila>
        )
      })}
    </Tabla>
  )
}
