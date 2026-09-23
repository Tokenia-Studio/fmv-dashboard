// ============================================
// CONTRATOS - Proveedores (US-011)
// ============================================
// Reutiliza el maestro `proveedores` del Dashboard (nº BC); no crea uno paralelo.

import React, { useMemo, useState } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { resumenProveedores } from '../../utils/contratosVista'
import { Tarjeta, Tabla, Fila, Td, Sec, Vacio, Pendiente, Badge, eur } from './ui'

export default function Proveedores() {
  const { modelo, vista, maestroProveedores, abrir } = useContratos()
  const [q, setQ] = useState('')
  const filas = useMemo(
    () => resumenProveedores(modelo.contratos.filter((c) => c.vista === vista), maestroProveedores),
    [modelo, vista, maestroProveedores],
  )
  const visibles = filas.filter((p) => !q || [p.nombre, p.codigo, ...p.contratos.map((c) => c.proveedor_nombre)].join(' ').toLowerCase().includes(q.toLowerCase()))

  return (
    <Tarjeta titulo="Proveedores" nota={`${visibles.length} proveedores`}>
      <div className="p-3 border-b border-gray-100">
        <input className="input text-sm !w-64" placeholder="Buscar proveedor o nº BC…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {visibles.length ? (
        <Tabla columnas={['Proveedor', 'Nº proveedor BC', 'Contratos', { t: 'Importe anual vivo', num: true }]}>
          {visibles.map((p) => (
            <Fila key={p.clave}>
              <Td className="font-medium">
                {p.nombre}
                {p.contratos.some((c) => c.proveedor_nombre !== p.nombre) && <Sec>{[...new Set(p.contratos.map((c) => c.proveedor_nombre))].filter((n) => n !== p.nombre).join(' · ')}</Sec>}
              </Td>
              <Td>
                {p.codigo ? <>{p.codigo}{!p.enMaestro && <> <Badge color="ambar" title="El nº no está en el maestro de proveedores cargado desde BC">No está en el maestro</Badge></>}</> : <Pendiente>Sin nº BC</Pendiente>}
              </Td>
              <Td>
                {p.contratos.map((c) => (
                  <button key={c.id} className="mr-2 text-fmv-700 hover:underline" onClick={() => abrir('contrato', c.id)} title={c.objeto}>{c.codigo || c.objeto}</button>
                ))}
              </Td>
              <Td num>{p.conImporte ? eur(p.importeAnual) : <Pendiente>Sin importe</Pendiente>}</Td>
            </Fila>
          ))}
        </Tabla>
      ) : (
        <Vacio>Sin proveedores con contratos en esta vista.</Vacio>
      )}
    </Tarjeta>
  )
}
