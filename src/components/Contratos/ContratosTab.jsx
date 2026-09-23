// ============================================
// CONTRATOS TAB - Módulo de contratos y mantenimiento
// ============================================
// Una pestaña por vista (funcional D7 y arquitectura D7):
//   · 'compras_fabrica' → «Equipos y mantenimiento» (compras y direccion)
//   · 'administracion'  → «Servicios y arrendamientos» (solo direccion)
// Mismas piezas en las dos; cambia qué se cuenta y qué pantallas hay.

import React from 'react'
import { RefreshCw } from 'lucide-react'
import { ContratosProvider, useContratos } from '../../context/ContratosContext'
import { VISTAS } from '../../utils/contratosVista'
import { Aviso, Boton } from './ui'
import PanelEquipos from './PanelEquipos'
import PanelContratos from './PanelContratos'
import ListaEquipos from './ListaEquipos'
import ListaContratos from './ListaContratos'
import FichaEquipo from './FichaEquipo'
import FichaGrupo from './FichaGrupo'
import FichaContrato from './FichaContrato'
import Calendario from './Calendario'
import Tareas from './Tareas'
import Documentos from './Documentos'
import Proveedores from './Proveedores'

const PANTALLAS = {
  compras_fabrica: [
    ['panel', 'Panel'],
    ['equipos', 'Equipos'],
    ['contratos', 'Contratos'],
    ['calendario', 'Calendario'],
    ['tareas', 'Tareas'],
    ['documentos', 'Documentos'],
    ['proveedores', 'Proveedores'],
  ],
  administracion: [
    ['panel', 'Panel'],
    ['contratos', 'Contratos'],
    ['calendario', 'Calendario'],
    ['tareas', 'Tareas'],
    ['documentos', 'Documentos'],
    ['proveedores', 'Proveedores'],
  ],
}

export default function ContratosTab({ vista }) {
  return (
    <ContratosProvider vista={vista}>
      <Contenido />
    </ContratosProvider>
  )
}

function Contenido() {
  const { vista, modelo, cargando, error, recargar, nav, ir } = useContratos()

  const pantallas = PANTALLAS[vista]
  const tareasAbiertas = modelo
    ? modelo.tareas.filter((t) => t.vista === vista && t.estado !== 'Resuelta').length +
      modelo.tareasAutomaticas.filter((t) => t.vista === vista && !t.pospuesta).length
    : 0

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{VISTAS[vista]}</h2>
          <p className="text-sm text-gray-500">
            {vista === 'compras_fabrica'
              ? '¿Está cada equipo en regla, cuándo toca y qué contrato lo cubre?'
              : '¿Qué servicios indirectos pagamos, hasta cuándo y cuándo hay que decidir?'}
          </p>
        </div>
        <Boton variante="secundario" onClick={recargar} title="Volver a leer los datos">
          <RefreshCw size={14} /> Actualizar
        </Boton>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-gray-200 print:hidden">
        {pantallas.map(([id, etiqueta]) => {
          const activa = nav.pantalla === id && !nav.ficha
          return (
            <button
              key={id}
              onClick={() => ir(id)}
              className={`px-3 py-2 text-sm -mb-px border-b-2 transition-colors ${
                activa ? 'border-fmv-700 text-fmv-800 font-semibold' : 'border-transparent text-gray-500 hover:text-slate-800'
              }`}
            >
              {etiqueta}
              {id === 'tareas' && tareasAbiertas > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[11px] text-amber-800">{tareasAbiertas}</span>
              )}
            </button>
          )
        })}
      </nav>

      {error && (
        <Aviso color="rojo">
          {error} <button className="underline ml-2" onClick={recargar}>Reintentar</button>
        </Aviso>
      )}

      {cargando && !modelo ? (
        <div className="py-16 text-center text-sm text-gray-400">Cargando contratos y equipos…</div>
      ) : modelo ? (
        <Pantalla />
      ) : null}
    </div>
  )
}

function Pantalla() {
  const { vista, nav } = useContratos()
  if (nav.ficha) {
    const { tipo, id } = nav.ficha
    if (tipo === 'equipo') return <FichaEquipo id={id} />
    if (tipo === 'grupo') return <FichaGrupo id={id} />
    if (tipo === 'contrato') return <FichaContrato id={id} />
  }
  switch (nav.pantalla) {
    case 'equipos':
      return <ListaEquipos />
    case 'contratos':
      return <ListaContratos />
    case 'calendario':
      return <Calendario />
    case 'tareas':
      return <Tareas />
    case 'documentos':
      return <Documentos />
    case 'proveedores':
      return <Proveedores />
    default:
      return vista === 'compras_fabrica' ? <PanelEquipos /> : <PanelContratos />
  }
}
