// ============================================
// CONTRATOS - Lista de equipos (US-001, US-002)
// ============================================

import React, { useMemo, useState } from 'react'
import { Plus, Layers, ClipboardCheck, FileSearch } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { filasEquipos, textoFecha } from '../../utils/contratosVista'
import { Tarjeta, Tabla, Fila, Td, Sec, Vacio, Badge, Pendiente, Boton, EST_OBLIGACION } from './ui'
import FormEquipo from './FormEquipo'
import FormGrupo from './FormGrupo'
import FormRealizada from './FormRealizada'
import LectorDocumento from './LectorDocumento'
import FormContrato from './FormContrato'

const SITUACIONES = {
  ...Object.fromEntries(Object.entries(EST_OBLIGACION).map(([k, v]) => [k, v[1]])),
  sinplan: 'Sin plan de mantenimiento',
  sinobligaciones: 'Sin obligaciones definidas',
  baja: 'De baja',
}

export default function ListaEquipos() {
  const { modelo, nav, abrir, lectorActivo } = useContratos()
  const inicial = nav.filtro || {}
  const [f, setF] = useState({ q: '', tipo: '', nave: '', situacion: inicial.situacion || '', noApto: !!inicial.noApto, sinCierre: !!inicial.sinCierre, bajas: inicial.situacion === 'baja' })
  const [formulario, setFormulario] = useState(null)

  const todas = useMemo(() => filasEquipos(modelo), [modelo])
  const tipos = [...new Set(todas.map((x) => x.tipoEquipo).filter(Boolean))].sort()
  const naves = [...new Set(todas.map((x) => x.nave).filter(Boolean))].sort()

  const filas = todas.filter(
    (x) =>
      (f.bajas || f.situacion === 'baja' || x.situacion !== 'baja') &&
      (!f.tipo || x.tipoEquipo === f.tipo) &&
      (!f.nave || x.nave === f.nave) &&
      (!f.situacion || x.situacion === f.situacion) &&
      (!f.noApto || x.noApto) &&
      (!f.sinCierre || x.sinCierre) &&
      (!f.q || x.texto.includes(f.q.toLowerCase())),
  )
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  // Registrar varias a la vez: obligaciones vivas de los equipos filtrados (US-003, «16 calibraciones de un mismo pedido»)
  const obligacionesFiltradas = filas.flatMap((x) => (x.tipo === 'grupo' ? modelo.grupo(x.id)?.obligaciones || [] : modelo.equipo(x.id)?.obligaciones.filter((o) => o.equipo_id === x.id) || [])).filter((o) => o.viva)

  return (
    <div className="space-y-4">
      <Tarjeta
        titulo="Equipos"
        nota={`${filas.length} de ${todas.length}`}
        acciones={
          <>
            {lectorActivo && (
              <Boton variante="claro" onClick={() => setFormulario({ tipo: 'lector' })} title="Sube los certificados y la app registra las calibraciones">
                <FileSearch size={14} /> Certificados (IA)
              </Boton>
            )}
            <Boton variante="claro" onClick={() => setFormulario({ tipo: 'varias' })} disabled={!obligacionesFiltradas.length} title="Registrar como realizadas varias obligaciones de los equipos filtrados">
              <ClipboardCheck size={14} /> Registrar varias
            </Boton>
            <Boton variante="claro" onClick={() => setFormulario({ tipo: 'grupo' })}><Layers size={14} /> Nuevo grupo</Boton>
            <Boton variante="claro" onClick={() => setFormulario({ tipo: 'equipo' })}><Plus size={14} /> Nuevo equipo</Boton>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
          <input className="input text-sm !w-64" placeholder="Buscar nº, modelo, serie, operario…" value={f.q} onChange={cambia('q')} />
          <select className="input text-sm !w-auto" value={f.tipo} onChange={cambia('tipo')}>
            <option value="">Todos los tipos</option>
            {tipos.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="input text-sm !w-auto" value={f.nave} onChange={cambia('nave')}>
            <option value="">Todas las naves</option>
            {naves.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="input text-sm !w-auto" value={f.situacion} onChange={cambia('situacion')}>
            <option value="">Cualquier situación</option>
            {Object.entries(SITUACIONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={f.noApto} onChange={cambia('noApto')} /> No aptos</label>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={f.sinCierre} onChange={cambia('sinCierre')} /> Sin documento de cierre</label>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={f.bajas} onChange={cambia('bajas')} /> Incluir bajas</label>
        </div>
        {filas.length ? (
          <Tabla columnas={['Equipo', 'Tipo', 'Activo fijo BC', 'Nave / asignado', 'Estado', 'Próxima obligación', 'Situación', 'Origen', 'Cierre']}>
            {filas.map((x) => {
              const p = x.principal
              const [color, texto] = p ? EST_OBLIGACION[p.calc.estado] : ['gris', SITUACIONES[x.situacion]]
              return (
                <Fila key={x.clave} onClick={() => abrir(x.tipo, x.id)}>
                  <Td>
                    <span className="font-medium">{x.nombre}</span>
                    {x.tipo === 'grupo' && <span className="text-gray-500"> × {x.unidades}</span>}
                    <Sec>{x.detalle}</Sec>
                  </Td>
                  <Td>{x.tipoEquipo}</Td>
                  <Td>{x.tipo === 'grupo' ? '—' : x.regimen !== 'propio' ? <span className="text-gray-500">{x.regimen}</span> : x.activoFijo || <Pendiente>Sin código</Pendiente>}</Td>
                  <Td>{x.nave}<Sec>{x.asignado}</Sec></Td>
                  <Td>{x.estado === 'activo' ? 'Activo' : <Badge color={x.estado === 'baja' ? 'gris' : 'ambar'}>{x.estado}</Badge>}{x.noApto && <> <Badge color="rojo">{x.tipo === 'grupo' ? `${x.noAptas} no aptas` : 'No apto'}</Badge></>}</Td>
                  <Td>{p ? <>{p.tipo}<Sec>{p.calc.proxima ? textoFecha(p.calc.proxima) : 'sin fecha'}</Sec></> : '—'}</Td>
                  <Td><Badge color={color}>{texto}</Badge></Td>
                  <Td>{p ? <Badge color={x.sinOrigen ? 'ambar' : 'verde'}>{x.sinOrigen ? 'Falta' : 'Sí'}</Badge> : ''}</Td>
                  <Td>{p ? <Badge color={x.sinCierre ? 'ambar' : 'verde'}>{x.sinCierre ? 'Falta' : 'Sí'}</Badge> : ''}</Td>
                </Fila>
              )
            })}
          </Tabla>
        ) : (
          <Vacio>{todas.length ? 'Ningún equipo con esos filtros.' : 'Todavía no hay equipos. La carga inicial del inventario es el bloque 1.3.'}</Vacio>
        )}
      </Tarjeta>

      {formulario?.tipo === 'equipo' && <FormEquipo onClose={() => setFormulario(null)} onGuardado={(e) => { setFormulario(null); abrir('equipo', e.id) }} />}
      {formulario?.tipo === 'grupo' && <FormGrupo onClose={() => setFormulario(null)} onGuardado={(g) => { setFormulario(null); abrir('grupo', g.id) }} />}
      {formulario?.tipo === 'varias' && <FormRealizada obligaciones={obligacionesFiltradas} onClose={() => setFormulario(null)} />}
      {formulario?.tipo === 'lector' && (
        <LectorDocumento
          tipoInicial="certificado"
          onClose={() => setFormulario(null)}
          onFicha={(propuesta, documento) => setFormulario({ tipo: 'contratoPdf', propuesta, documento })}
        />
      )}
      {formulario?.tipo === 'contratoPdf' && (
        <FormContrato propuesta={formulario.propuesta} documento={formulario.documento} onClose={() => setFormulario(null)} onGuardado={(c) => { setFormulario(null); abrir('contrato', c.id) }} />
      )}
    </div>
  )
}
