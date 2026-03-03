// ============================================
// PLANIFICACION CONTEXT - Órdenes Producción
// ============================================

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { db } from '../lib/supabase'
import { parseOrdenesExcel, parseRutasExcel, parseVinculosExcel, cruzarPlanificacion } from '../utils/etlPlanificacion'

const PlanificacionContext = createContext(null)

const initialState = {
  ordenes: [],
  loading: false,
  loadingMessage: '',
  error: null,
  dataLoaded: false,
  fechaCarga: null,
  stats: { totalOrdenes: 0, totalRutas: 0, totalVinculos: 0 }
}

function planificacionReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, loadingMessage: action.message || '' }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'LOAD_DATA':
      return {
        ...state,
        ordenes: action.payload.ordenes,
        stats: action.payload.stats,
        fechaCarga: action.payload.fechaCarga || new Date().toISOString(),
        dataLoaded: true,
        loading: false,
        error: null
      }

    case 'CLEAR_DATA':
      return { ...initialState }

    default:
      return state
  }
}

export function PlanificacionProvider({ children }) {
  const [state, dispatch] = useReducer(planificacionReducer, initialState)

  useEffect(() => {
    cargarDesdeSupabase()
  }, [])

  const cargarDesdeSupabase = async () => {
    try {
      const { data: row } = await db.planificacionOrdenes.get()
      if (row?.data && Array.isArray(row.data) && row.data.length > 0) {
        // Restore Date objects from serialized strings
        const ordenes = row.data.map(o => ({
          ...o,
          fechaVencimiento: o.fechaVencimiento ? new Date(o.fechaVencimiento) : null,
          fechaCreacion: o.fechaCreacion ? new Date(o.fechaCreacion) : null,
          rutas: (o.rutas || []).map(r => ({
            ...r,
            fechaInicial: r.fechaInicial ? new Date(r.fechaInicial) : null,
            fechaFinal: r.fechaFinal ? new Date(r.fechaFinal) : null,
          }))
        }))
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            ordenes,
            stats: {
              totalOrdenes: row.total_ordenes || ordenes.length,
              totalRutas: row.total_rutas || 0,
              totalVinculos: row.total_vinculos || 0
            },
            fechaCarga: row.fecha_carga
          }
        })
      }
    } catch (e) {
      console.warn('Error cargando datos planificación:', e)
    }
  }

  const cargarDatosPlanificacion = async (ordenesFile, rutasFile, vinculosFile) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Leyendo Órdenes de Producción...' })

    try {
      // Parse Órdenes
      const ordBuf = await ordenesFile.arrayBuffer()
      const ordWb = XLSX.read(ordBuf, { type: 'array', cellDates: true })
      const ordenes = parseOrdenesExcel(ordWb)

      dispatch({ type: 'SET_LOADING', payload: true, message: `${ordenes.length} órdenes. Leyendo Rutas...` })

      // Parse Rutas
      const rutBuf = await rutasFile.arrayBuffer()
      const rutWb = XLSX.read(rutBuf, { type: 'array', cellDates: true })
      const rutasByOrden = parseRutasExcel(rutWb)

      dispatch({ type: 'SET_LOADING', payload: true, message: `${rutasByOrden.size} órdenes con rutas. Leyendo Vínculos...` })

      // Parse Vínculos
      const vincBuf = await vinculosFile.arrayBuffer()
      const vincWb = XLSX.read(vincBuf, { type: 'array', cellDates: true })
      const vinculosByItem = parseVinculosExcel(vincWb)

      dispatch({ type: 'SET_LOADING', payload: true, message: `${vinculosByItem.size} vínculos. Cruzando datos...` })

      // Cross-reference
      const enriched = cruzarPlanificacion(ordenes, rutasByOrden, vinculosByItem)

      const stats = {
        totalOrdenes: enriched.length,
        totalRutas: rutasByOrden.size,
        totalVinculos: vinculosByItem.size
      }

      dispatch({ type: 'SET_LOADING', payload: true, message: `${enriched.length} órdenes procesadas. Guardando...` })

      // Save to Supabase
      try {
        await db.planificacionOrdenes.upsert(enriched, stats)
      } catch (e) {
        console.warn('No se pudo guardar en Supabase:', e)
      }

      dispatch({
        type: 'LOAD_DATA',
        payload: { ordenes: enriched, stats, fechaCarga: new Date().toISOString() }
      })

      return { success: true, ...stats }
    } catch (error) {
      console.error('Error procesando planificación:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  const limpiarDatos = async () => {
    try {
      await db.planificacionOrdenes.clear()
    } catch (e) {
      console.warn('Error limpiando Supabase:', e)
    }
    dispatch({ type: 'CLEAR_DATA' })
  }

  const value = {
    ...state,
    cargarDatosPlanificacion,
    cargarDesdeSupabase,
    limpiarDatos
  }

  return (
    <PlanificacionContext.Provider value={value}>
      {children}
    </PlanificacionContext.Provider>
  )
}

export function usePlanificacion() {
  const context = useContext(PlanificacionContext)
  if (!context) {
    throw new Error('usePlanificacion debe usarse dentro de PlanificacionProvider')
  }
  return context
}
