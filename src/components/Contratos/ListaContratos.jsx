// ============================================
// CONTRATOS - Lista de contratos de la vista (US-005, US-006)
// ============================================

import React, { useState } from 'react'
import { Plus, FileSearch, Download } from 'lucide-react'
import { useContratos } from '../../context/ContratosContext'
import { sumaEnTotales, textoFecha, textoDia } from '../../utils/contratosVista'
import { Tarjeta, Tabla, Fila, Td, Sec, Vacio, Badge, Pendiente, Boton, eur, EST_CONTRATO, EST_DOCUMENTAL } from './ui'
import FormContrato from './FormContrato'
import { filasExcelContratos, descargarLibro } from '../../utils/contratosExport'
import LectorDocumento from './LectorDocumento'

export default function ListaContratos() {
  const { modelo, vista, nav, abrir, lectorActivo } = useContratos()
  const inicial = nav.filtro || {}
  const [f, setF] = useState({ q: '', categoria: '', estadoDoc: inicial.estadoDoc || '', vivos: true })
  const [nuevo, setNuevo] = useState(false)
  const [lector, setLector] = useState(false)
  const [desdePdf, setDesdePdf] = useState(null) // { propuesta, documento } del lector
  const extra = inicial // filtros que solo llegan desde un KPI del panel
  const [conExtra, setConExtra] = useState(Object.keys(extra).some((k) => k !== 'estadoDoc'))

  const base = modelo.contratos.filter((c) => c.vista === vista)
  const categorias = [...new Set(base.map((c) => c.categoria))].sort()
  const estados = [...new Set(base.map((c) => c.estado_documental))].sort()

  const filtroExtra = (c) => {
    if (!conExtra) return true
    if (extra.sinVigente && (c.estado_documental === 'Vigente' || !sumaEnTotales(c))) return false
    if (extra.sinImporte && (c.importe_anual != null || !sumaEnTotales(c))) return false
    if (extra.sinCuenta && (c.cuenta_gasto || !sumaEnTotales(c))) return false
    if (extra.calendario === 'vencido' && (c.calc.estado !== 'vencido' || !sumaEnTotales(c))) return false
    if (extra.calendario === 'decidir' && (!['avisar', 'proximo'].includes(c.calc.estado) || !sumaEnTotales(c))) return false
    return true
  }
  const filas = base.filter(
    (c) =>
      (!f.vivos || sumaEnTotales(c)) &&
      (!f.categoria || c.categoria === f.categoria) &&
      (!f.estadoDoc || c.estado_documental === f.estadoDoc) &&
      filtroExtra(c) &&
      (!f.q || [c.codigo, c.proveedor_nombre, c.objeto, c.referencia, c.proveedor_codigo].join(' ').toLowerCase().includes(f.q.toLowerCase())),
  )
  const total = filas.filter(sumaEnTotales).reduce((s, c) => s + (c.importe_anual != null ? Number(c.importe_anual) : 0), 0)
  const cambia = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const descripcionExtra = extra.sinVigente ? 'estado distinto de vigente' : extra.sinImporte ? 'sin importe' : extra.sinCuenta ? 'sin cuenta de gasto' : extra.calendario === 'vencido' ? 'vencidos sin cerrar' : extra.calendario === 'decidir' ? 'hay que decidir en 90 días' : ''

  return (
    <div className="space-y-4">
      <Tarjeta titulo="Contratos" nota={`${filas.length} contratos · ${eur(total)} al año`} acciones={
          <>
            {lectorActivo && <Boton variante="claro" onClick={() => setLector(true)} title="Sube el PDF y la app propone la ficha"><FileSearch size={14} /> Leer PDF</Boton>}
            <Boton variante="claro" onClick={() => setNuevo(true)}><Plus size={14} /> Nuevo contrato</Boton>
            <Boton variante="claro" onClick={() => descargarLibro(vista === 'administracion' ? 'Contratos_Administracion_FMV' : 'Contratos_Compras_FMV', [{ nombre: 'Contratos', filas: filasExcelContratos(filas) }])} disabled={!filas.length} title="Descarga en Excel los contratos filtrados"><Download size={14} /> Excel</Boton>
          </>
        }>
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-gray-100">
          <input className="input text-sm !w-64" placeholder="Buscar proveedor, objeto, referencia…" value={f.q} onChange={cambia('q')} />
          <select className="input text-sm !w-auto" value={f.categoria} onChange={cambia('categoria')}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input text-sm !w-auto" value={f.estadoDoc} onChange={cambia('estadoDoc')}>
            <option value="">Todos los estados</option>
            {estados.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={f.vivos} onChange={cambia('vivos')} /> Solo los que suman (sin históricos ni puntuales)</label>
          {conExtra && descripcionExtra && (
            <button className="text-xs rounded-full bg-fmv-100 text-fmv-800 px-2 py-1" onClick={() => setConExtra(false)} title="Quitar este filtro">
              Filtro del panel: {descripcionExtra} ✕
            </button>
          )}
        </div>
        {filas.length ? (
          <Tabla columnas={['Código', 'Proveedor y objeto', 'Categoría', 'Estado', { t: 'Importe anual', num: true }, 'Vence', 'Calendario', 'Documento']}>
            {filas.map((c) => {
              const [color, texto] = EST_CONTRATO[c.calc.estado]
              return (
                <Fila key={c.id} onClick={() => abrir('contrato', c.id)}>
                  <Td className="font-medium whitespace-nowrap">{c.codigo}</Td>
                  <Td>{c.proveedor_nombre}<Sec>{c.objeto}</Sec></Td>
                  <Td>{c.categoria}{!c.vista_confirmada && <Sec>vista propuesta</Sec>}</Td>
                  <Td><Badge color={EST_DOCUMENTAL[c.estado_documental] || 'gris'}>{c.estado_documental}</Badge></Td>
                  <Td num>{c.importe_anual != null ? eur(c.importe_anual) : <Pendiente>Sin importe</Pendiente>}</Td>
                  <Td className="whitespace-nowrap">
                    {c.calc.vence ? textoFecha(c.calc.vence) : <Pendiente>No consta</Pendiente>}
                    {c.calc.avisar && <Sec>Avisar antes del {textoDia(c.calc.avisar)}</Sec>}
                  </Td>
                  <Td><Badge color={color}>{texto}</Badge></Td>
                  <Td>{c.origenOk ? <Badge color="verde">PDF</Badge> : <Badge color="rojo">Falta</Badge>}</Td>
                </Fila>
              )
            })}
          </Tabla>
        ) : (
          <Vacio>{base.length ? 'Ningún contrato con esos filtros.' : 'Todavía no hay contratos en esta vista.'}</Vacio>
        )}
      </Tarjeta>
      {nuevo && <FormContrato onClose={() => setNuevo(false)} onGuardado={(c) => { setNuevo(false); abrir('contrato', c.id) }} />}
      {lector && <LectorDocumento onClose={() => setLector(false)} onFicha={(propuesta, documento) => { setLector(false); setDesdePdf({ propuesta, documento }) }} />}
      {desdePdf && (
        <FormContrato
          propuesta={desdePdf.propuesta}
          documento={desdePdf.documento}
          onClose={() => setDesdePdf(null)}
          onGuardado={(c) => { setDesdePdf(null); abrir('contrato', c.id) }}
        />
      )}
    </div>
  )
}
