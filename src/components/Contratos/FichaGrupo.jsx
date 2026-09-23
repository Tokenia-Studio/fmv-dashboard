// ============================================
// CONTRATOS - Ficha de un grupo de equipos (US-004: extintores, eslingas)
// ============================================
// La obligación se define y se registra una vez para el grupo; el resultado
// puede marcarse unidad a unidad. Dar de baja una unidad no toca al resto.

import React, { useState } from 'react'
import { Pencil, Plus, ListPlus } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { Tarjeta, Campo, Tabla, Fila, Td, Sec, Vacio, Aviso, Badge, Pendiente, Boton, valor } from './ui'
import { Cabecera } from './FichaEquipo'
import BloqueObligacion from './BloqueObligacion'
import FormGrupo from './FormGrupo'
import FormObligacion from './FormObligacion'
import FormUnidades from './FormUnidades'

export default function FichaGrupo({ id }) {
  const { modelo, cerrarFicha, abrir } = useContratos()
  const [form, setForm] = useState(null)
  const g = modelo.grupo(id)
  if (!g) return <Aviso>Grupo no encontrado. <button className="underline" onClick={cerrarFicha}>Volver</button></Aviso>

  const unidades = g.unidades.map((u) => modelo.equipo(u.id)).filter(Boolean)
  const enServicio = unidades.filter((u) => u.estado !== 'baja')
  const noAptas = enServicio.filter((u) => u.noApto)

  return (
    <div className="space-y-4">
      <Cabecera
        onVolver={cerrarFicha}
        titulo={g.nombre}
        subtitulo={[g.tipo, g.nave, `${enServicio.length} unidades en servicio`].filter(Boolean).join(' · ')}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setForm('editar')}><Pencil size={14} /> Editar grupo</Boton>
            <Boton variante="secundario" onClick={() => setForm('unidades')}><ListPlus size={14} /> Añadir unidades</Boton>
            <Boton onClick={() => setForm('obligacion')}><Plus size={14} /> Nueva obligación</Boton>
          </>
        }
      />

      {noAptas.length > 0 && <Aviso color="rojo"><strong>{noAptas.length} de {enServicio.length} unidades no apta{noAptas.length > 1 ? 's' : ''}</strong> en la última revisión. Se retiran del aviso al dar de baja o sustituir la unidad, o con una revisión posterior apta.</Aviso>}

      <Tarjeta titulo="El grupo">
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Campo etiqueta="Tipo">{g.tipo}</Campo>
          <Campo etiqueta="Nave">{valor(g.nave, 'No consta')}</Campo>
          <Campo etiqueta="Unidades en servicio">{enServicio.length}</Campo>
          <Campo etiqueta="De baja">{unidades.length - enServicio.length}</Campo>
        </div>
        {g.observaciones && <p className="px-4 pb-4 text-sm"><strong>Observaciones:</strong> {g.observaciones}</p>}
      </Tarjeta>

      <Tarjeta titulo="Obligaciones del grupo" nota="Se registran una vez; el resultado, unidad a unidad">
        <div className="p-4 space-y-3">
          {g.obligaciones.map((o) => <BloqueObligacion key={o.id} o={o} />)}
          {!g.obligaciones.length && <Vacio>Sin obligaciones definidas.</Vacio>}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Unidades" nota="La identificación de cada una se completa desde la app">
        {unidades.length ? (
          <Tabla columnas={['Unidad', 'Identificación', 'Nº de serie', 'Asignado / nave', 'Estado']}>
            {unidades.map((u) => (
              <Fila key={u.id} onClick={() => abrir('equipo', u.id)} className={u.estado === 'baja' ? 'text-gray-400' : ''}>
                <Td className="font-medium">{u.nombre}<Sec>{u.modelo}</Sec></Td>
                <Td>{valor(u.identificacion, 'Pendiente')}</Td>
                <Td>{u.num_serie || '—'}</Td>
                <Td>{u.asignado_a || u.nave || g.nave}</Td>
                <Td>
                  {u.estado === 'activo' ? 'Activo' : <Badge color={u.estado === 'baja' ? 'gris' : 'ambar'}>{u.estado}</Badge>}
                  {u.noApto && <> <Badge color="rojo">No apta</Badge></>}
                </Td>
              </Fila>
            ))}
          </Tabla>
        ) : (
          <Vacio>El grupo aún no tiene unidades. <Pendiente>Añadirlas con «Añadir unidades».</Pendiente></Vacio>
        )}
      </Tarjeta>

      {form === 'editar' && <FormGrupo grupo={g} onClose={() => setForm(null)} />}
      {form === 'unidades' && <FormUnidades grupo={g} onClose={() => setForm(null)} />}
      {form === 'obligacion' && <FormObligacion nueva={{ grupo_id: g.id }} onClose={() => setForm(null)} />}
    </div>
  )
}
