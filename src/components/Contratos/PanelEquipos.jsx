// ============================================
// CONTRATOS - Panel de «Equipos y mantenimiento» (US-001)
// ============================================
// Cada cifra abre la lista de equipos que la compone (mismo cálculo: filasEquipos).

import React, { useMemo } from 'react'
import { useContratos } from '../../context/ContratosContext'
import { filasEquipos, textoFecha, sumaEnTotales } from '../../utils/contratosVista'
import { Kpi, Tarjeta, Tabla, Fila, Td, Sec, Vacio, Badge, Pendiente, EST_OBLIGACION } from './ui'
import TablaDecidir from './TablaDecidir'

export default function PanelEquipos() {
  const { modelo, ir, abrir } = useContratos()

  const filas = useMemo(() => filasEquipos(modelo), [modelo])
  const enServicio = filas.filter((f) => f.situacion !== 'baja')
  const de = (s) => enServicio.filter((f) => f.situacion === s)
  const noAptos = enServicio.filter((f) => f.noApto)
  const sinCierre = enServicio.filter((f) => f.sinCierre)
  const unidades = enServicio.reduce((s, f) => s + f.unidades, 0)

  const porTipo = {}
  enServicio.forEach((f) => {
    const t = (porTipo[f.tipoEquipo] = porTipo[f.tipoEquipo] || { fuera: 0, proxima: 0, ok: 0, sinfecha: 0, otros: 0 })
    if (t[f.situacion] != null) t[f.situacion]++
    else t.otros++
  })

  const contratos = modelo.contratos.filter((c) => c.vista === 'compras_fabrica' && sumaEnTotales(c))
  const decidir = contratos.filter((c) => ['vencido', 'avisar', 'proximo'].includes(c.calc.estado))

  const porFecha = (a, b) => (a.principal?.calc.proxima?.d || 0) - (b.principal?.calc.proxima?.d || 0)
  const filaEquipo = (f) => (
    <Fila key={f.clave} onClick={() => abrir(f.tipo, f.id)}>
      <Td>
        <span className="font-medium">{f.nombre}</span>
        {f.tipo === 'grupo' && <span className="text-gray-500"> × {f.unidades}</span>}
        <Sec>{f.detalle}</Sec>
      </Td>
      <Td>{f.principal?.tipo}</Td>
      <Td className="whitespace-nowrap">{f.principal?.calc.proxima ? textoFecha(f.principal.calc.proxima) : <Pendiente>Sin fecha</Pendiente>}</Td>
      <Td>{f.asignado || f.nave}</Td>
    </Fila>
  )
  const columnas = ['Equipo', 'Qué toca', 'Cuándo', 'Asignado / nave']

  if (!filas.length) {
    return (
      <Tarjeta titulo="Todavía no hay equipos">
        <Vacio>
          La carga inicial del inventario (bloque 1.3) está pendiente.
          Mientras tanto se pueden dar de alta equipos a mano desde <button className="text-fmv-700 underline" onClick={() => ir('equipos')}>Equipos</button>.
        </Vacio>
      </Tarjeta>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Kpi etiqueta="En servicio" valor={enServicio.length} pie={`${unidades} unidades · ${filas.length - enServicio.length} de baja`} onClick={() => ir('equipos')} />
        <Kpi etiqueta="Fuera de plazo" valor={de('fuera').length} pie="Ya tocaba" color={de('fuera').length ? 'rojo' : 'verde'} onClick={() => ir('equipos', { situacion: 'fuera' })} />
        <Kpi etiqueta="Tocan en 60 días" valor={de('proxima').length} pie="Pedir con margen" color={de('proxima').length ? 'ambar' : 'gris'} onClick={() => ir('equipos', { situacion: 'proxima' })} />
        <Kpi etiqueta="Sin fecha fijada" valor={de('sinfecha').length} pie="Solo hay periodicidad" color={de('sinfecha').length ? 'ambar' : 'gris'} onClick={() => ir('equipos', { situacion: 'sinfecha' })} />
        <Kpi etiqueta="Sin documento de cierre" valor={sinCierre.length} pie="Sin prueba de que se hizo" color={sinCierre.length ? 'ambar' : 'verde'} onClick={() => ir('equipos', { sinCierre: true })} />
        <Kpi etiqueta="No aptos" valor={noAptos.length} pie={noAptos.length ? noAptos.map((f) => (f.tipo === 'grupo' ? `${f.nombre}: ${f.noAptas}` : f.nombre)).slice(0, 3).join(' · ') : 'Ninguno'} color={noAptos.length ? 'rojo' : 'verde'} onClick={() => ir('equipos', { noApto: true })} />
        <Kpi etiqueta="Sin plan" valor={de('sinplan').length} pie="Decidir si se contrata" color={de('sinplan').length ? 'ambar' : 'gris'} onClick={() => ir('equipos', { situacion: 'sinplan' })} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Tarjeta titulo="Fuera de plazo" nota="Lo primero que mira una auditoría">
          {de('fuera').length ? <Tabla columnas={columnas} max={340}>{de('fuera').sort(porFecha).map(filaEquipo)}</Tabla> : <Vacio>Todo en plazo.</Vacio>}
        </Tarjeta>
        <Tarjeta titulo="Tocan en los próximos 60 días">
          {de('proxima').length ? <Tabla columnas={columnas} max={340}>{de('proxima').sort(porFecha).map(filaEquipo)}</Tabla> : <Vacio>Nada próximo.</Vacio>}
        </Tarjeta>
        <Tarjeta titulo="Contratos de mantenimiento: hay que decidir" nota="Ordenado por fecha límite de aviso">
          <TablaDecidir contratos={decidir} />
        </Tarjeta>
        <Tarjeta titulo="Estado por tipo de equipo">
          <Tabla columnas={['Tipo', { t: 'Fuera', num: true }, { t: '60 días', num: true }, { t: 'En plazo', num: true }, { t: 'Sin fecha', num: true }, { t: 'Otros', num: true }]}>
            {Object.entries(porTipo)
              .sort(([a], [b]) => a.localeCompare(b, 'es'))
              .map(([tipo, v]) => (
                <Fila key={tipo}>
                  <Td>{tipo}</Td>
                  <Td num>{v.fuera ? <Badge color={EST_OBLIGACION.fuera[0]}>{v.fuera}</Badge> : '—'}</Td>
                  <Td num>{v.proxima ? <Badge color="ambar">{v.proxima}</Badge> : '—'}</Td>
                  <Td num>{v.ok || '—'}</Td>
                  <Td num>{v.sinfecha ? <Badge>{v.sinfecha}</Badge> : '—'}</Td>
                  <Td num title="Sin plan o sin obligaciones definidas">{v.otros || '—'}</Td>
                </Fila>
              ))}
          </Tabla>
        </Tarjeta>
        <Tarjeta titulo="Sin plan de mantenimiento" nota="Decidir si se contrata" className="lg:col-span-2">
          {de('sinplan').length ? (
            <Tabla columnas={['Equipo', 'Tipo', 'Régimen', 'Nave']}>
              {de('sinplan').map((f) => (
                <Fila key={f.clave} onClick={() => abrir(f.tipo, f.id)}>
                  <Td className="font-medium">{f.nombre}</Td>
                  <Td>{f.tipoEquipo}</Td>
                  <Td>{f.regimen}</Td>
                  <Td>{f.nave}</Td>
                </Fila>
              ))}
            </Tabla>
          ) : (
            <Vacio>Todos los equipos tienen plan.</Vacio>
          )}
        </Tarjeta>
      </div>
    </div>
  )
}
