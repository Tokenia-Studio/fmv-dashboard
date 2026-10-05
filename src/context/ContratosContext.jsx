// ============================================
// CONTRATOS CONTEXT - datos del módulo de contratos y mantenimiento
// ============================================
// Carga al abrir la pestaña, no en el arranque del Dashboard (arquitectura D8):
// DataContext ya recarga el diario entero en cada refresco de sesión y aquí no
// se le añade peso. Tras cada cambio se recarga todo (son cientos de filas),
// así pantallas, calendario y tareas automáticas salen siempre del mismo estado.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useData } from './DataContext'
import { contratosDb } from '../lib/contratosDb'
import { construirModelo, hoyLocal } from '../utils/contratosVista'

const ContratosContext = createContext(null)

// Las dos vistas son pestañas distintas del menú. Para ir desde una a una lista de la
// otra (el Mapa enseña las dos a dirección) se deja aquí el destino y se cambia de
// pestaña: la vista que entra lo recoge en vez de abrir su panel.
const PESTANA_DE_VISTA = { compras_fabrica: 'contratosEquipos', administracion: 'contratosServicios' }
let destinoPendiente = null

export function ContratosProvider({ vista, children }) {
  const { userRole, proveedores, setTab } = useData()
  // `setTab` se crea de nuevo en cada pintado del Dashboard: se guarda aparte para no
  // repintar todo el módulo cada vez
  const cambiarPestana = useRef(setTab)
  cambiarPestana.current = setTab
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // Navegación interna: pantalla + ficha abierta + filtros que llegan desde un KPI
  const [nav, setNav] = useState({ pantalla: 'panel', ficha: null, filtro: null })
  // Lector asistido de PDF: apagado hasta que dirección lo encienda en configuracion (P9)
  const [lectorActivo, setLectorActivo] = useState(false)

  const recargar = useCallback(async () => {
    setError(null)
    try {
      setDatos(await contratosDb.cargarTodo())
    } catch (err) {
      setError(err.message)
    }
    setCargando(false)
  }, [])

  useEffect(() => {
    recargar()
    contratosDb.lectorActivo().then(setLectorActivo)
  }, [recargar])

  // Al cambiar de vista (menú) se vuelve al panel, salvo que se venga con un destino
  useEffect(() => {
    const destino = destinoPendiente?.vista === vista ? destinoPendiente : null
    destinoPendiente = null
    setNav({ pantalla: destino?.pantalla || 'panel', ficha: null, filtro: destino?.filtro || null })
  }, [vista])

  const modelo = useMemo(() => (datos ? construirModelo(datos, hoyLocal()) : null), [datos])

  const value = useMemo(() => {
    const esDireccion = userRole === 'direccion'
    return {
      vista,
      rol: userRole,
      esDireccion,
      datos,
      modelo,
      cargando,
      error,
      recargar,
      maestroProveedores: proveedores || {},
      lectorActivo,
      nav,
      ir: (pantalla, filtro = null) => {
        setNav({ pantalla, ficha: null, filtro })
        window.scrollTo(0, 0)
      },
      // Como `ir`, pero a una pantalla de la otra vista si hace falta (solo dirección tiene las dos)
      irAVista: (vistaDestino, pantalla, filtro = null) => {
        if (vistaDestino !== vista && esDireccion && PESTANA_DE_VISTA[vistaDestino]) {
          destinoPendiente = { vista: vistaDestino, pantalla, filtro }
          cambiarPestana.current(PESTANA_DE_VISTA[vistaDestino])
        } else {
          setNav({ pantalla, ficha: null, filtro })
        }
        window.scrollTo(0, 0)
      },
      abrir: (tipo, id) => {
        setNav((n) => ({ ...n, ficha: { tipo, id } }))
        window.scrollTo(0, 0)
      },
      cerrarFicha: () => setNav((n) => ({ ...n, ficha: null })),
      // Solo para no ofrecer botones que van a fallar: quien decide es la RLS
      puedeEditarContrato: (c) => esDireccion || c?.vista === 'compras_fabrica',
      puedeCambiarVista: esDireccion,
    }
  }, [vista, userRole, datos, modelo, cargando, error, recargar, proveedores, nav, lectorActivo])

  return <ContratosContext.Provider value={value}>{children}</ContratosContext.Provider>
}

export function useContratos() {
  const ctx = useContext(ContratosContext)
  if (!ctx) throw new Error('useContratos debe usarse dentro de ContratosProvider')
  return ctx
}
