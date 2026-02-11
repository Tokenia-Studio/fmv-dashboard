// ============================================
// PRODUCCION CONTEXT - Seguimiento Estructuras
// ============================================

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { db } from '../lib/supabase'
import { parsePlanningExcel, parseFichajesExcel, cruzarDatos, DEFAULT_TIEMPOS_ESTANDAR } from '../utils/etlEstructuras'

const ProduccionContext = createContext(null)

const initialState = {
  seriesData: [],
  tiemposEstandar: null,
  loading: false,
  loadingMessage: '',
  error: null,
  dataLoaded: false,
  fechaCarga: null
}

function produccionReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload, loadingMessage: action.message || '' }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'LOAD_SERIES_DATA':
      return {
        ...state,
        seriesData: action.payload.series,
        fechaCarga: action.payload.fechaCarga || new Date().toISOString(),
        dataLoaded: true,
        loading: false,
        error: null
      }

    case 'LOAD_TIEMPOS_ESTANDAR':
      return { ...state, tiemposEstandar: action.payload }

    case 'CLEAR_DATA':
      return { ...initialState }

    default:
      return state
  }
}

export function ProduccionProvider({ children }) {
  const [state, dispatch] = useReducer(produccionReducer, initialState)

  // Cargar datos de Supabase al inicio
  useEffect(() => {
    cargarDesdeSupabase()
  }, [])

  // Cargar datos ya procesados desde Supabase
  const cargarDesdeSupabase = async () => {
    try {
      // Cargar tiempos estándar
      const { data: teoData } = await db.tiemposEstandar.get()
      if (teoData?.data) {
        dispatch({ type: 'LOAD_TIEMPOS_ESTANDAR', payload: teoData.data })
      } else {
        // Usar defaults y guardar
        dispatch({ type: 'LOAD_TIEMPOS_ESTANDAR', payload: DEFAULT_TIEMPOS_ESTANDAR })
        try {
          await db.tiemposEstandar.upsert(DEFAULT_TIEMPOS_ESTANDAR)
        } catch (e) {
          console.warn('No se pudo guardar tiempos estándar por defecto:', e)
        }
      }

      // Cargar series procesadas
      const { data: seriesRow } = await db.seriesEstructuras.get()
      if (seriesRow?.data && Array.isArray(seriesRow.data) && seriesRow.data.length > 0) {
        dispatch({
          type: 'LOAD_SERIES_DATA',
          payload: { series: seriesRow.data, fechaCarga: seriesRow.fecha_carga }
        })
      }
    } catch (e) {
      console.warn('Error cargando datos producción:', e)
    }
  }

  // Procesar ficheros Planning + Fichajes y guardar
  const cargarDatosEstructuras = async (planningFile, fichajesFile) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Leyendo Planning...' })

    try {
      // Parse Planning
      const planBuffer = await planningFile.arrayBuffer()
      const planWb = XLSX.read(planBuffer, { type: 'array', cellDates: true })
      const planning = parsePlanningExcel(planWb)

      dispatch({ type: 'SET_LOADING', payload: true, message: `Planning: ${planning.seriesData.length} series. Leyendo Fichajes...` })

      // Parse Fichajes
      const fichBuffer = await fichajesFile.arrayBuffer()
      const fichWb = XLSX.read(fichBuffer, { type: 'array', cellDates: true })
      const fichajesByOF = parseFichajesExcel(fichWb)

      dispatch({ type: 'SET_LOADING', payload: true, message: `Fichajes: ${Object.keys(fichajesByOF).length} OFs. Procesando...` })

      // Use stored or default tiempos estándar
      const teo = state.tiemposEstandar || DEFAULT_TIEMPOS_ESTANDAR

      // ETL
      const { results, skipped, totalPlanning } = cruzarDatos(
        planning, fichajesByOF, teo,
        (msg) => dispatch({ type: 'SET_LOADING', payload: true, message: msg })
      )

      dispatch({ type: 'SET_LOADING', payload: true, message: `${results.length} series procesadas. Guardando...` })

      // Guardar en Supabase
      try {
        await db.seriesEstructuras.upsert(results, { usuario: null })
      } catch (e) {
        console.warn('No se pudo guardar en Supabase:', e)
      }

      dispatch({
        type: 'LOAD_SERIES_DATA',
        payload: { series: results, fechaCarga: new Date().toISOString() }
      })

      return {
        success: true,
        totalPlanning,
        processed: results.length,
        skipped
      }
    } catch (error) {
      console.error('Error procesando estructuras:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Guardar tiempos estándar actualizados
  const guardarTiemposEstandar = async (tiempos) => {
    try {
      await db.tiemposEstandar.upsert(tiempos)
      dispatch({ type: 'LOAD_TIEMPOS_ESTANDAR', payload: tiempos })
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  // Limpiar datos de estructuras
  const limpiarDatosEstructuras = async () => {
    try {
      await db.seriesEstructuras.clear()
    } catch (e) {
      console.warn('Error limpiando Supabase:', e)
    }
    dispatch({ type: 'CLEAR_DATA' })
  }

  const value = {
    ...state,
    cargarDatosEstructuras,
    cargarDesdeSupabase,
    guardarTiemposEstandar,
    limpiarDatosEstructuras
  }

  return (
    <ProduccionContext.Provider value={value}>
      {children}
    </ProduccionContext.Provider>
  )
}

export function useProduccion() {
  const context = useContext(ProduccionContext)
  if (!context) {
    throw new Error('useProduccion debe usarse dentro de ProduccionProvider')
  }
  return context
}
