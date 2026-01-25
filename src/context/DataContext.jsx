// ============================================
// DATA CONTEXT - FMV Dashboard v2.0
// ============================================

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { EXCEL_COLUMN_PATTERNS, findColumn } from '../utils/constants'
import {
  calcularPyG,
  calcularTotalesPyG,
  calcularServiciosExt,
  calcularSaldosBalance,
  calcularFinanciacion,
  calcularPagosProveedores,
  calcularCashFlow
} from '../utils/calculations'

const DataContext = createContext(null)

// Estado inicial
const initialState = {
  // Datos crudos
  movimientos: [],
  proveedores: {},

  // Años disponibles y archivos cargados
  años: [],
  añoActual: new Date().getFullYear(),
  archivosCargados: {}, // { 2024: { nombre, movimientos, fecha }, 2025: {...} }

  // Datos calculados (se regeneran al cambiar año)
  pyg: [],
  totalesPyG: {},
  serviciosExt: { porMes: [], subcuentas: [] },
  financiacion: { meses: [], kpis: {}, ratios: {} },
  pagosProveedores: { top15: [], totalPagos: 0, datosMensuales: [] },
  cashFlow: { meses: [], kpis: {} },

  // Validación
  validacion: {
    cuadrado: true,
    diferencia: 0,
    cuentasDesconocidas: []
  },

  // UI
  loading: false,
  error: null,
  tabActiva: 'pyg',
  datosGuardados: null
}

// Reducer
function dataReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'SET_TAB':
      return { ...state, tabActiva: action.payload }

    case 'SET_AÑO':
      return { ...state, añoActual: action.payload }

    case 'LOAD_MOVIMIENTOS': {
      // Combinar años existentes con nuevos
      const todosAños = [...new Set([...state.años, ...action.payload.años])].sort((a, b) => b - a)
      // Mantener año actual si sigue disponible, sino usar el más reciente
      const nuevoAñoActual = todosAños.includes(state.añoActual)
        ? state.añoActual
        : todosAños[0] || state.añoActual
      return {
        ...state,
        movimientos: action.payload.movimientos,
        años: todosAños,
        añoActual: nuevoAñoActual,
        archivosCargados: action.payload.archivosCargados || state.archivosCargados,
        validacion: action.payload.validacion,
        loading: false,
        error: null
      }
    }

    case 'LOAD_PROVEEDORES':
      return { ...state, proveedores: action.payload }

    case 'SET_DATOS_CALCULADOS':
      return {
        ...state,
        pyg: action.payload.pyg,
        totalesPyG: action.payload.totalesPyG,
        serviciosExt: action.payload.serviciosExt,
        financiacion: action.payload.financiacion,
        pagosProveedores: action.payload.pagosProveedores,
        cashFlow: action.payload.cashFlow
      }

    case 'CLEAR_DATA':
      return { ...initialState }

    default:
      return state
  }
}

// Provider
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState)

  // Cargar datos de LocalStorage al inicio
  // NOTA: Deshabilitado - archivos muy grandes causan problemas
  useEffect(() => {
    // Limpiar cualquier dato antiguo que pueda causar problemas
    localStorage.removeItem('fmv-dashboard-data')
  }, [])

  // Recalcular datos cuando cambia el año o los movimientos
  useEffect(() => {
    if (state.movimientos.length === 0) return

    try {
      console.log('Calculando datos para', state.añoActual, 'con', state.movimientos.length, 'movimientos')
      const saldos = calcularSaldosBalance(state.movimientos, state.añoActual)
      console.log('Saldos calculados')
      const pyg = calcularPyG(state.movimientos, state.añoActual)
      console.log('PyG calculado')
      const totalesPyG = calcularTotalesPyG(pyg)
      console.log('Totales PyG calculados')
      const serviciosExt = calcularServiciosExt(state.movimientos, state.añoActual)
      console.log('Servicios Ext calculados')
      const financiacion = calcularFinanciacion(state.movimientos, saldos, state.añoActual)
      console.log('Financiacion calculada')
      const pagosProveedores = calcularPagosProveedores(state.movimientos, state.proveedores, state.añoActual)
      console.log('Pagos proveedores calculados')
      const cashFlow = calcularCashFlow(state.movimientos, saldos, state.añoActual)
      console.log('Cash Flow calculado')

      dispatch({
        type: 'SET_DATOS_CALCULADOS',
        payload: { pyg, totalesPyG, serviciosExt, financiacion, pagosProveedores, cashFlow }
      })
      console.log('Datos despachados correctamente')
    } catch (error) {
      console.error('Error en cálculos:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }, [state.movimientos, state.añoActual, state.proveedores])

  // Guardar en LocalStorage cuando cambian los datos
  // NOTA: Deshabilitado temporalmente - archivos muy grandes exceden el límite de localStorage
  /*
  useEffect(() => {
    if (state.movimientos.length > 0) {
      localStorage.setItem('fmv-dashboard-data', JSON.stringify({
        movimientos: state.movimientos,
        proveedores: state.proveedores,
        años: state.años,
        validacion: state.validacion
      }))
    }
  }, [state.movimientos, state.proveedores, state.años, state.validacion])
  */

  // Función para parsear Excel del diario
  const cargarDiario = async (file) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      // raw: true para obtener números directamente, no strings formateados
      const json = XLSX.utils.sheet_to_json(sheet, { raw: true })

      if (json.length === 0) {
        throw new Error('El archivo está vacío')
      }

      // Encontrar columnas de forma flexible (maneja encoding)
      const columns = Object.keys(json[0] || {})
      const COL = {
        fecha: findColumn(columns, EXCEL_COLUMN_PATTERNS.fecha),
        cuenta: findColumn(columns, EXCEL_COLUMN_PATTERNS.cuenta),
        debe: findColumn(columns, EXCEL_COLUMN_PATTERNS.debe),
        haber: findColumn(columns, EXCEL_COLUMN_PATTERNS.haber),
        codProcedencia: findColumn(columns, EXCEL_COLUMN_PATTERNS.codProcedencia),
        descripcion: findColumn(columns, EXCEL_COLUMN_PATTERNS.descripcion),
        documento: findColumn(columns, EXCEL_COLUMN_PATTERNS.documento)
      }

      // Validar columnas requeridas
      if (!COL.fecha) throw new Error('No se encontró columna de Fecha')
      if (!COL.cuenta) throw new Error('No se encontró columna de Cuenta')
      if (!COL.debe) throw new Error('No se encontró columna de Debe')
      if (!COL.haber) throw new Error('No se encontró columna de Haber')

      // Mapear columnas
      const movimientos = []
      let totalDebe = 0
      let totalHaber = 0
      const añosSet = new Set()
      const cuentasDesconocidas = new Set()

      // Función para parsear importes (con raw:true ya vienen como números)
      const parseImporte = (val) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        // Fallback por si acaso viene como string
        const str = String(val).trim().replace(/,/g, '')
        return parseFloat(str) || 0
      }

      json.forEach((row, idx) => {
        // Parsear fecha
        let fecha = null
        const fechaRaw = row[COL.fecha]

        if (fechaRaw instanceof Date) {
          fecha = fechaRaw
        } else if (typeof fechaRaw === 'number') {
          // Excel serial date: días desde 1/1/1900 (con bug de 1900)
          fecha = new Date((fechaRaw - 25569) * 86400 * 1000)
        } else if (typeof fechaRaw === 'string') {
          const str = fechaRaw.trim()
          if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
            fecha = new Date(str.substring(0, 10))
          } else if (str.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
            // Formato MM/DD/YY (americano)
            const [m, d, y] = str.split('/')
            const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y)
            fecha = new Date(year, parseInt(m) - 1, parseInt(d))
          }
        }

        if (!fecha || isNaN(fecha.getTime())) return

        const año = fecha.getFullYear()
        if (año < 2020 || año > 2030) return
        añosSet.add(año)

        // Parsear cuenta (puede ser número o string)
        const cuentaRaw = String(row[COL.cuenta] || '').trim()
        if (!cuentaRaw || cuentaRaw.length < 2) return

        const grupo = cuentaRaw.substring(0, 2)
        const subcuenta = cuentaRaw.substring(0, 3)

        const debe = parseImporte(row[COL.debe])
        const haber = parseImporte(row[COL.haber])

        totalDebe += debe
        totalHaber += haber

        // Crear movimiento
        const mes = `${año}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

        movimientos.push({
          fecha,
          cuenta: cuentaRaw,
          grupo,
          subcuenta,
          debe,
          haber,
          neto: debe - haber,
          codProcedencia: COL.codProcedencia ? String(row[COL.codProcedencia] || '').trim() : '',
          descripcion: COL.descripcion ? (row[COL.descripcion] || '') : '',
          documento: COL.documento ? (row[COL.documento] || '') : '',
          mes
        })
      })

      if (movimientos.length === 0) {
        throw new Error('No se encontraron movimientos válidos')
      }

      // Validar cuadre
      const diferencia = totalDebe - totalHaber
      const cuadrado = Math.abs(diferencia) < 0.01

      const añosNuevos = Array.from(añosSet).sort((a, b) => b - a)

      // Crear registro de archivos cargados por año
      const archivosCargados = { ...state.archivosCargados }
      añosNuevos.forEach(año => {
        const movsAño = movimientos.filter(m => m.mes.startsWith(String(año)))
        archivosCargados[año] = {
          nombre: file.name,
          fecha: new Date().toISOString(),
          movimientos: movsAño.length,
          totalDebe: movsAño.reduce((sum, m) => sum + m.debe, 0),
          totalHaber: movsAño.reduce((sum, m) => sum + m.haber, 0)
        }
      })

      // Combinar con movimientos existentes (mantener otros años, reemplazar años del nuevo archivo)
      const movimientosExistentes = state.movimientos.filter(m => {
        const añoMov = parseInt(m.mes.split('-')[0])
        return !añosNuevos.includes(añoMov) // Mantener solo los que NO están en el nuevo archivo
      })
      const movimientosCombinados = [...movimientosExistentes, ...movimientos]

      // Recalcular validación con todos los movimientos
      const totalDebeCombinado = movimientosCombinados.reduce((sum, m) => sum + m.debe, 0)
      const totalHaberCombinado = movimientosCombinados.reduce((sum, m) => sum + m.haber, 0)
      const diferenciaCombinada = totalDebeCombinado - totalHaberCombinado
      const cuadradoCombinado = Math.abs(diferenciaCombinada) < 0.01

      dispatch({
        type: 'LOAD_MOVIMIENTOS',
        payload: {
          movimientos: movimientosCombinados,
          años: añosNuevos,
          archivosCargados,
          validacion: {
            cuadrado: cuadradoCombinado,
            diferencia: diferenciaCombinada,
            totalDebe: totalDebeCombinado,
            totalHaber: totalHaberCombinado,
            numMovimientos: movimientosCombinados.length,
            cuentasDesconocidas: Array.from(cuentasDesconocidas)
          }
        }
      })

      return { success: true, movimientos: movimientos.length, años: añosNuevos }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Función para cargar maestro de proveedores
  const cargarProveedores = async (file) => {
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)

      const proveedores = {}
      json.forEach(row => {
        // Buscar columnas de código y nombre
        const codigo = row['Nº'] ?? row['N°'] ?? row['Codigo'] ?? row['codigo'] ?? row['N']
        const nombre = row['Nombre'] ?? row['nombre'] ?? row['NOMBRE']

        if (codigo !== undefined && nombre) {
          proveedores[String(codigo).trim()] = String(nombre).trim()
        }
      })

      dispatch({ type: 'LOAD_PROVEEDORES', payload: proveedores })
      return { success: true, count: Object.keys(proveedores).length }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Función para formatear número en formato español
  const formatoEspañol = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return num
    return num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Función para exportar a Excel con formato
  const exportarExcel = (datos, nombreArchivo) => {
    const ws = XLSX.utils.json_to_sheet(datos)

    // Ajustar ancho de columnas automáticamente
    const colWidths = {}
    datos.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key] || '')
        const len = Math.max(val.length, key.length)
        colWidths[key] = Math.max(colWidths[key] || 10, Math.min(len + 2, 50))
      })
    })
    ws['!cols'] = Object.values(colWidths).map(w => ({ wch: w }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')
    XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
  }

  // Función para exportar movimientos filtrados
  const exportarMovimientos = (filtro, nombreArchivo) => {
    const movsFiltrados = state.movimientos.filter(filtro).map(m => ({
      Fecha: m.fecha.toLocaleDateString('es-ES'),
      Cuenta: m.cuenta,
      Descripcion: m.descripcion,
      Debe: formatoEspañol(m.debe),
      Haber: formatoEspañol(m.haber),
      Neto: formatoEspañol(m.neto),
      Documento: m.documento,
      Proveedor: state.proveedores[m.codProcedencia] || m.codProcedencia
    }))
    exportarExcel(movsFiltrados, nombreArchivo)
  }

  // Limpiar datos
  const limpiarDatos = () => {
    localStorage.removeItem('fmv-dashboard-data')
    dispatch({ type: 'CLEAR_DATA' })
  }

  const value = {
    ...state,
    dispatch,
    cargarDiario,
    cargarProveedores,
    exportarExcel,
    exportarMovimientos,
    limpiarDatos,
    setTab: (tab) => dispatch({ type: 'SET_TAB', payload: tab }),
    setAño: (año) => dispatch({ type: 'SET_AÑO', payload: año })
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

// Hook para usar el contexto
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData debe usarse dentro de DataProvider')
  }
  return context
}
