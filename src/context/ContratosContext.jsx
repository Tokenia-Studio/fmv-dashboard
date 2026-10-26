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
import { estadoHistorial, entradaDelHistorial, mismaNav, entradaAlEntrar } from '../utils/contratosHistorial'

const ContratosContext = createContext(null)

// Las dos vistas son pestañas distintas del menú. Para ir desde una a una lista de la
// otra (el Mapa enseña las dos a dirección) se deja aquí el destino y se cambia de
// pestaña: la vista que entra lo recoge en vez de abrir su panel.
const PESTANA_DE_VISTA = { compras_fabrica: 'contratosEquipos', administracion: 'contratosServicios' }
let destinoPendiente = null

// «Atrás» del navegador (Sachi, 20/10/2026). Si la entrada a la que se vuelve es de una
// vista que no está en pantalla (se pasó a otra pestaña del Dashboard, o a la otra vista),
// se cambia de pestaña y la vista que entra recoge la navegación guardada.
let vistaMontada = null
let cambiarPestanaGlobal = null
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    const entrada = entradaDelHistorial(e.state)
    if (!entrada || entrada.vista === vistaMontada || !cambiarPestanaGlobal || !PESTANA_DE_VISTA[entrada.vista]) return
    destinoPendiente = { vista: entrada.vista, ...entrada.nav, paso: entrada.paso, desdeHistorial: true }
    cambiarPestanaGlobal(PESTANA_DE_VISTA[entrada.vista])
  })
}

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
  const navActual = useRef(nav)
  navActual.current = nav
  // Pantallas del módulo que hay detrás de la actual en el historial (botón «Atrás»)
  const [paso, setPaso] = useState(0)
  const pasoActual = useRef(paso)
  pasoActual.current = paso
  // Lector asistido de PDF: apagado hasta que dirección lo encienda en configuracion (P9)
  const [lectorActivo, setLectorActivo] = useState(false)
  // Responsable que se enseña en las tareas automáticas sin uno asignado (configuracion, P2)
  const [responsablesPorDefecto, setResponsablesPorDefecto] = useState({})

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
    contratosDb.responsablesPorDefecto().then(setResponsablesPorDefecto)
  }, [recargar])

  // Ir a otra pantalla deja una entrada en el historial; volver la restaura sin apilar otra
  const navegar = useCallback((nueva) => {
    if (!mismaNav(nueva, navActual.current)) {
      const siguiente = pasoActual.current + 1
      window.history.pushState(estadoHistorial(window.history.state, vista, nueva, siguiente), '')
      setPaso(siguiente)
    }
    setNav(nueva)
    window.scrollTo(0, 0)
  }, [vista])

  useEffect(() => {
    vistaMontada = vista
    cambiarPestanaGlobal = (pestana) => cambiarPestana.current(pestana)
    const alVolver = (e) => {
      const entrada = entradaDelHistorial(e.state)
      if (entrada?.vista === vista) {
        setNav(entrada.nav)
        setPaso(entrada.paso)
      }
    }
    window.addEventListener('popstate', alVolver)
    return () => {
      window.removeEventListener('popstate', alVolver)
      if (vistaMontada === vista) vistaMontada = null
    }
  }, [vista])

  // Al cambiar de vista (menú) se vuelve al panel, salvo que se venga con un destino
  useEffect(() => {
    const destino = destinoPendiente?.vista === vista ? destinoPendiente : null
    destinoPendiente = null
    // Un salto desde la otra vista es un paso adelante (se apila); entrar por el menú o volver
    // con «atrás» reutiliza la entrada en la que ya se está
    const { apilar, nav: inicial, paso: pasoInicial } = entradaAlEntrar(destino, window.history.state)
    const estado = estadoHistorial(window.history.state, vista, inicial, pasoInicial)
    if (apilar) window.history.pushState(estado, '')
    else window.history.replaceState(estado, '')
    setNav(inicial)
    setPaso(pasoInicial)
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
      responsablePorDefecto: responsablesPorDefecto[vista] || null,
      nav,
      ir: (pantalla, filtro = null) => navegar({ pantalla, ficha: null, filtro }),
      // Como `ir`, pero a una pantalla de la otra vista si hace falta (solo dirección tiene las dos)
      irAVista: (vistaDestino, pantalla, filtro = null) => {
        if (vistaDestino !== vista && esDireccion && PESTANA_DE_VISTA[vistaDestino]) {
          destinoPendiente = { vista: vistaDestino, pantalla, filtro }
          cambiarPestana.current(PESTANA_DE_VISTA[vistaDestino])
          window.scrollTo(0, 0)
        } else {
          navegar({ pantalla, ficha: null, filtro })
        }
      },
      abrir: (tipo, id) => navegar({ ...navActual.current, ficha: { tipo, id } }),
      cerrarFicha: () => navegar({ ...navActual.current, ficha: null }),
      // «Atrás» dentro de la sección: solo si la entrada anterior es del módulo; la restaura
      // el mismo `popstate` que el botón del navegador
      puedeIrAtras: paso > 0,
      atras: () => {
        if (pasoActual.current > 0) window.history.back()
      },
      // Solo para no ofrecer botones que van a fallar: quien decide es la RLS
      puedeEditarContrato: (c) => esDireccion || c?.vista === 'compras_fabrica',
      puedeCambiarVista: esDireccion,
    }
  }, [vista, userRole, datos, modelo, cargando, error, recargar, proveedores, nav, paso, lectorActivo, responsablesPorDefecto, navegar])

  return <ContratosContext.Provider value={value}>{children}</ContratosContext.Provider>
}

export function useContratos() {
  const ctx = useContext(ContratosContext)
  if (!ctx) throw new Error('useContratos debe usarse dentro de ContratosProvider')
  return ctx
}
