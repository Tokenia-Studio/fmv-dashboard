// ============================================
// CONTRATOS - Panel de «Servicios y arrendamientos» (US-005, US-006)
// ============================================
// ¿Qué pagamos, hasta cuándo y cuándo hay que decidir? Solo contratos de la vista.

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { sumaEnTotales, hayDiscrepancia } from '../../utils/contratosVista'
import { Kpi, Tarjeta, Tabla, Fila, Td, Sec, Vacio, eur } from './ui'
import TablaDecidir from './TablaDecidir'

export default function PanelContratos() {
  const { modelo, vista, ir, abrir } = useContratos()
  const todos = modelo.contratos.filter((c) => c.vista === vista)
  const vivos = todos.filter(sumaEnTotales)
  const suma = (lista) => lista.reduce((s, c) => s + (c.importe_anual != null ? Number(c.importe_anual) : 0), 0)

  const vigentes = vivos.filter((c) => c.estado_documental === 'Vigente')
  const porConfirmar = vivos.filter((c) => c.estado_documental !== 'Vigente')
  const sinImporte = vivos.filter((c) => c.importe_anual == null)
  const vencidos = vivos.filter((c) => c.calc.estado === 'vencido')
  const urgentes = vivos.filter((c) => c.calc.estado === 'avisar' || c.calc.estado === 'proximo')
  const sinCuenta = vivos.filter((c) => !c.cuenta_gasto)
  const discrepancias = vivos.filter(hayDiscrepancia)

  const porCategoria = {}
  vivos.forEach((c) => {
    const x = (porCategoria[c.categoria] = porCategoria[c.categoria] || { vigente: 0, otro: 0 })
    x[c.estado_documental === 'Vigente' ? 'vigente' : 'otro'] += c.importe_anual != null ? Number(c.importe_anual) : 0
  })
  const categorias = Object.entries(porCategoria).filter(([, x]) => x.vigente + x.otro > 0).sort((a, b) => b[1].vigente + b[1].otro - (a[1].vigente + a[1].otro))
  const max = Math.max(1, ...categorias.map(([, x]) => x.vigente + x.otro))

  if (!todos.length) {
    return (
      <Tarjeta titulo="Todavía no hay contratos en esta vista">
        <Vacio>
          La carga inicial del inventario (bloque 1.3) está pendiente. Se pueden dar de alta contratos a mano desde{' '}
          <button className="text-fmv-700 underline" onClick={() => ir('contratos')}>Contratos</button>.
        </Vacio>
      </Tarjeta>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi etiqueta="Gasto anual con contrato vigente" valor={eur(suma(vigentes))} pie="Sin IVA, normalizado a 12 meses" color="verde" onClick={() => ir('contratos', { estadoDoc: 'Vigente' })} />
        <Kpi etiqueta="Gasto por confirmar" valor={eur(suma(porConfirmar))} pie="Se paga, falta el papel que lo respalde" color="ambar" onClick={() => ir('contratos', { sinVigente: true })} />
        <Kpi etiqueta="Vivos sin importe" valor={sinImporte.length} pie="Suministros, seguros, por pedido" onClick={() => ir('contratos', { sinImporte: true })} />
        <Kpi etiqueta="Vencidos sin cerrar" valor={vencidos.length} pie="Sin decisión registrada" color={vencidos.length ? 'rojo' : 'verde'} onClick={() => ir('contratos', { calendario: 'vencido' })} />
        <Kpi etiqueta="Decidir en 90 días" valor={urgentes.length} pie="Desde la fecha límite de aviso" color={urgentes.length ? 'ambar' : 'gris'} onClick={() => ir('contratos', { calendario: 'decidir' })} />
        <Kpi etiqueta="Sin cuenta de gasto" valor={sinCuenta.length} pie={`de ${vivos.length}: necesaria para cruzar con lo contabilizado`} color={sinCuenta.length ? 'ambar' : 'verde'} onClick={() => ir('contratos', { sinCuenta: true })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Tarjeta titulo="Hay que decidir" nota="Ordenado por fecha límite de aviso">
          <TablaDecidir contratos={urgentes} />
        </Tarjeta>
        <Tarjeta titulo="Vencidos sin cerrar" nota="¿Se sigue pagando?">
          <TablaDecidir contratos={vencidos} vacio="Ninguno." />
        </Tarjeta>
        <Tarjeta titulo="Gasto anual por categoría">
          <div className="p-4 space-y-2">
            {categorias.length ? categorias.map(([cat, x]) => (
              <div key={cat} className="grid grid-cols-[9rem_1fr_7rem] items-center gap-2 text-sm">
                <span className="truncate">{cat}</span>
                <div className="h-3 rounded bg-gray-100 flex overflow-hidden">
                  <div className="bg-fmv-600" style={{ width: `${(x.vigente / max) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(x.otro / max) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{eur(x.vigente + x.otro)}</span>
              </div>
            )) : <Vacio>Ningún contrato vivo con importe.</Vacio>}
            <p className="text-xs text-gray-500 pt-1">Azul: contrato vigente · Ámbar: por confirmar u otro estado. Históricos, sustituidos y puntuales no suman.</p>
          </div>
        </Tarjeta>
        <Tarjeta titulo="Discrepancias entre lo declarado y el contrato">
          {discrepancias.length ? (
            <Tabla columnas={['Contrato', { t: 'Declarado', num: true }, { t: 'Contrato (anual)', num: true }]}>
              {discrepancias.map((c) => (
                <Fila key={c.id} onClick={() => abrir('contrato', c.id)}>
                  <Td><span className="font-medium">{c.codigo ? `${c.codigo} · ` : ''}{c.proveedor_nombre}</span><Sec>{c.objeto}</Sec></Td>
                  <Td num>{eur(c.importe_declarado)}</Td>
                  <Td num>{eur(c.importe_anual)}</Td>
                </Fila>
              ))}
            </Tabla>
          ) : (
            <Vacio>Ninguna.</Vacio>
          )}
        </Tarjeta>
      </div>
    </div>
  )
}
