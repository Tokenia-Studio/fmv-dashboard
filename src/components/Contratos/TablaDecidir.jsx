// ============================================
// CONTRATOS - Tabla de contratos sobre los que hay que decidir (US-005)
// ============================================

import React from 'react'
import { useContratos } from '../../context/ContratosContext'
import { textoFecha, textoDia } from '../../utils/contratosVista'
import { Tabla, Fila, Td, Sec, Vacio, Badge, Pendiente, eur, EST_CONTRATO } from './ui'

export default function TablaDecidir({ contratos, vacio = 'Nada en los próximos 90 días.' }) {
  const { abrir } = useContratos()
  if (!contratos.length) return <Vacio>{vacio}</Vacio>
  const orden = [...contratos].sort((a, b) => (a.calc.avisar || a.calc.vence?.d || 0) - (b.calc.avisar || b.calc.vence?.d || 0))
  return (
    <Tabla columnas={['Contrato', 'Vence', 'Avisar antes del', { t: 'Importe anual', num: true }, '']}>
      {orden.map((c) => (
        <Fila key={c.id} onClick={() => abrir('contrato', c.id)}>
          <Td>
            <span className="font-medium">{c.codigo ? `${c.codigo} · ` : ''}{c.proveedor_nombre}</span>
            <Sec>{c.objeto}</Sec>
          </Td>
          <Td className="whitespace-nowrap">{textoFecha(c.calc.vence)}</Td>
          <Td className="whitespace-nowrap">{c.calc.avisar ? textoDia(c.calc.avisar) : <Pendiente>Sin preaviso conocido</Pendiente>}</Td>
          <Td num>{c.importe_anual != null ? eur(c.importe_anual) : <Pendiente>—</Pendiente>}</Td>
          <Td><Badge color={EST_CONTRATO[c.calc.estado][0]}>{EST_CONTRATO[c.calc.estado][1]}</Badge></Td>
        </Fila>
      ))}
    </Tabla>
  )
}
