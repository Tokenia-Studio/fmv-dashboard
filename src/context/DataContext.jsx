// ============================================
// DATA CONTEXT - FMV Dashboard v2.0
// Con integracion Supabase
// ============================================

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { EXCEL_COLUMN_PATTERNS, findColumn } from '../utils/constants'
import { supabase, db, storage } from '../lib/supabase'
import {
  calcularPyG,
  calcularTotalesPyG,
  calcularServiciosExt,
  calcularSaldosBalance,
  calcularFinanciacion,
  calcularPagosProveedores,
  calcularCashFlow,
  calcularPyG3Digitos,
  calcularPresupuestoVsReal
} from '../utils/calculations'
import { ACCOUNT_GROUPS_3, MAPEO_GRUPO_CUENTA_DEFAULT } from '../utils/constants'

const DataContext = createContext(null)

// Estado inicial
const initialState = {
  // Datos crudos
  movimientos: [],
  proveedores: {},

  // Anos disponibles y archivos cargados
  años: [],
  añoActual: new Date().getFullYear(),
  archivosCargados: {},

  // Datos calculados (se regeneran al cambiar ano)
  pyg: [],
  totalesPyG: {},
  serviciosExt: { porMes: [], subcuentas: [] },
  financiacion: { meses: [], kpis: {}, ratios: {} },
  pagosProveedores: { top15: [], totalPagos: 0, datosMensuales: [] },
  cashFlow: { meses: [], kpis: {} },
  presupuestos: [],
  pyg3Digitos: {},
  presupuestoVsReal: [],

  // Presupuesto Compras
  albaranesFacturas: [],
  pedidosCompra: [],
  mapeoGrupoCuenta: [],

  // Rol de usuario
  userRole: 'direccion',

  // Validacion
  validacion: {
    cuadrado: true,
    diferencia: 0,
    cuentasDesconocidas: []
  },

  // UI
  loading: false,
  loadingMessage: '',
  error: null,
  tabActiva: 'pyg',
  supabaseSync: false // indica si los datos estan sincronizados con Supabase
}

// Reducer
function dataReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        loadingMessage: action.message || ''
      }

    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }

    case 'SET_TAB':
      return { ...state, tabActiva: action.payload }

    case 'SET_AÑO':
      return { ...state, añoActual: action.payload }

    case 'LOAD_MOVIMIENTOS': {
      const todosAños = [...new Set([...state.años, ...action.payload.años])].sort((a, b) => b - a)
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
        supabaseSync: action.payload.supabaseSync || false,
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
        cashFlow: action.payload.cashFlow,
        pyg3Digitos: action.payload.pyg3Digitos || state.pyg3Digitos,
        presupuestoVsReal: action.payload.presupuestoVsReal || state.presupuestoVsReal
      }

    case 'LOAD_PRESUPUESTOS':
      return { ...state, presupuestos: action.payload }

    case 'SET_ARCHIVOS_CARGADOS':
      return { ...state, archivosCargados: action.payload }

    case 'SET_USER_ROLE':
      return { ...state, userRole: action.payload }

    case 'LOAD_ALBARANES_FACTURAS':
      return { ...state, albaranesFacturas: action.payload }

    case 'LOAD_PEDIDOS_COMPRA':
      return { ...state, pedidosCompra: action.payload }

    case 'LOAD_MAPEO_GRUPO_CUENTA':
      return { ...state, mapeoGrupoCuenta: action.payload }

    case 'CLEAR_DATA':
      return { ...initialState }

    default:
      return state
  }
}

// Provider
export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(dataReducer, initialState)

  // Cargar datos desde Supabase al inicio
  useEffect(() => {
    cargarDatosDesdeSupabase()
  }, [])

  // Funcion para cargar datos desde Supabase
  const cargarDatosDesdeSupabase = async () => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Cargando datos...' })

    try {
      // Obtener anos disponibles
      const { data: años, error: errorAños } = await db.movimientos.getYears()
      if (errorAños) throw errorAños

      if (años.length === 0) {
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      // Cargar archivos cargados
      const { data: archivosData } = await db.archivosCargados.getAll()
      const archivosCargados = {}
      if (archivosData) {
        archivosData.forEach(a => {
          archivosCargados[a.año] = {
            nombre: a.nombre,
            fecha: a.fecha_carga,
            movimientos: a.movimientos,
            totalDebe: a.total_debe,
            totalHaber: a.total_haber
          }
        })
      }

      // Cargar movimientos de todos los anos
      const todosMovimientos = []
      for (const año of años) {
        const { data: movs, error } = await db.movimientos.getByYear(año)
        if (error) {
          console.error(`Error cargando movimientos de ${año}:`, error)
          continue
        }
        // Mapear de formato Supabase a formato interno
        movs.forEach(m => {
          todosMovimientos.push({
            fecha: new Date(m.fecha),
            cuenta: m.cuenta,
            grupo: m.grupo,
            subcuenta: m.subcuenta,
            debe: parseFloat(m.debe) || 0,
            haber: parseFloat(m.haber) || 0,
            neto: parseFloat(m.neto) || 0,
            codProcedencia: m.cod_procedencia || '',
            descripcion: m.descripcion || '',
            documento: m.documento || '',
            mes: m.mes
          })
        })
      }

      // Cargar proveedores
      const { data: proveedoresData } = await db.proveedores.getAll()
      const proveedores = {}
      if (proveedoresData) {
        proveedoresData.forEach(p => {
          proveedores[p.codigo] = p.nombre
        })
      }
      dispatch({ type: 'LOAD_PROVEEDORES', payload: proveedores })

      // Calcular validacion
      const totalDebe = todosMovimientos.reduce((sum, m) => sum + m.debe, 0)
      const totalHaber = todosMovimientos.reduce((sum, m) => sum + m.haber, 0)
      const diferencia = totalDebe - totalHaber
      const cuadrado = Math.abs(diferencia) < 0.01

      dispatch({
        type: 'LOAD_MOVIMIENTOS',
        payload: {
          movimientos: todosMovimientos,
          años,
          archivosCargados,
          validacion: {
            cuadrado,
            diferencia,
            totalDebe,
            totalHaber,
            numMovimientos: todosMovimientos.length
          },
          supabaseSync: true
        }
      })

      console.log(`Cargados ${todosMovimientos.length} movimientos desde Supabase`)

      // Cargar presupuestos del año actual
      const añoActual = años[0] || new Date().getFullYear()
      const { data: presupuestosData } = await db.presupuestos.getByYear(añoActual)
      if (presupuestosData) {
        dispatch({ type: 'LOAD_PRESUPUESTOS', payload: presupuestosData })
      }

      // Cargar rol de usuario
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: role } = await db.userRoles.getByUserId(user.id)
          dispatch({ type: 'SET_USER_ROLE', payload: role || 'direccion' })
        }
      } catch (e) {
        console.warn('No se pudo cargar rol de usuario:', e)
      }

      // Cargar albaranes, pedidos, mapeo
      try {
        const { data: albData } = await db.albaranesFacturas.getByYear(añoActual)
        if (albData) dispatch({ type: 'LOAD_ALBARANES_FACTURAS', payload: albData })

        const { data: pedData } = await db.pedidosCompra.getByYear(añoActual)
        if (pedData) dispatch({ type: 'LOAD_PEDIDOS_COMPRA', payload: pedData })

        const { data: mapeoData } = await db.mapeoGrupoCuenta.getAll()
        if (mapeoData && mapeoData.length > 0) {
          dispatch({ type: 'LOAD_MAPEO_GRUPO_CUENTA', payload: mapeoData })
        } else {
          // Inicializar con datos por defecto
          const defaultRows = Object.entries(MAPEO_GRUPO_CUENTA_DEFAULT).map(([grupo, cuenta]) => ({
            grupo_contable: grupo,
            cuenta,
            descripcion: ''
          }))
          dispatch({ type: 'LOAD_MAPEO_GRUPO_CUENTA', payload: defaultRows })
        }
      } catch (e) {
        console.warn('Error cargando datos compras:', e)
      }
    } catch (error) {
      console.error('Error cargando datos desde Supabase:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }

  // Cargar presupuestos, albaranes y pedidos cuando cambia el año
  useEffect(() => {
    if (state.añoActual && state.supabaseSync) {
      db.presupuestos.getByYear(state.añoActual).then(({ data }) => {
        if (data) dispatch({ type: 'LOAD_PRESUPUESTOS', payload: data })
      }).catch(err => console.error('Error cargando presupuestos:', err))

      db.albaranesFacturas.getByYear(state.añoActual).then(({ data }) => {
        if (data) dispatch({ type: 'LOAD_ALBARANES_FACTURAS', payload: data })
      }).catch(err => console.error('Error cargando albaranes:', err))

      db.pedidosCompra.getByYear(state.añoActual).then(({ data }) => {
        if (data) dispatch({ type: 'LOAD_PEDIDOS_COMPRA', payload: data })
      }).catch(err => console.error('Error cargando pedidos:', err))
    }
  }, [state.añoActual, state.supabaseSync])

  // Recalcular datos cuando cambia el ano o los movimientos
  useEffect(() => {
    if (state.movimientos.length === 0) return

    try {
      console.log('Calculando datos para', state.añoActual, 'con', state.movimientos.length, 'movimientos')
      const saldos = calcularSaldosBalance(state.movimientos, state.añoActual)
      const pyg = calcularPyG(state.movimientos, state.añoActual)
      const totalesPyG = calcularTotalesPyG(pyg)
      const serviciosExt = calcularServiciosExt(state.movimientos, state.añoActual)
      const financiacion = calcularFinanciacion(state.movimientos, saldos, state.añoActual)
      const pagosProveedores = calcularPagosProveedores(state.movimientos, state.proveedores, state.añoActual)
      const cashFlow = calcularCashFlow(state.movimientos, saldos, state.añoActual)

      // Calcular PyG a 3 dígitos y comparativa presupuesto vs real
      const pyg3Digitos = calcularPyG3Digitos(state.movimientos, state.añoActual)
      const mesActual = new Date().getMonth() + 1
      const presupuestoVsReal = calcularPresupuestoVsReal(pyg3Digitos, state.presupuestos, mesActual)

      dispatch({
        type: 'SET_DATOS_CALCULADOS',
        payload: { pyg, totalesPyG, serviciosExt, financiacion, pagosProveedores, cashFlow, pyg3Digitos, presupuestoVsReal }
      })
    } catch (error) {
      console.error('Error en calculos:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
    }
  }, [state.movimientos, state.añoActual, state.proveedores, state.presupuestos])

  // Funcion para parsear Excel del diario y guardar en Supabase
  const cargarDiario = async (file) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Leyendo archivo...' })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { raw: true })

      if (json.length === 0) {
        throw new Error('El archivo esta vacio')
      }

      // Encontrar columnas
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

      if (!COL.fecha) throw new Error('No se encontro columna de Fecha')
      if (!COL.cuenta) throw new Error('No se encontro columna de Cuenta')
      if (!COL.debe) throw new Error('No se encontro columna de Debe')
      if (!COL.haber) throw new Error('No se encontro columna de Haber')

      dispatch({ type: 'SET_LOADING', payload: true, message: 'Procesando movimientos...' })

      // Parsear movimientos
      const movimientos = []
      let totalDebe = 0
      let totalHaber = 0
      const añosSet = new Set()

      const parseImporte = (val) => {
        if (typeof val === 'number') return val
        if (!val) return 0
        const str = String(val).trim().replace(/,/g, '')
        return parseFloat(str) || 0
      }

      json.forEach((row) => {
        let fecha = null
        const fechaRaw = row[COL.fecha]

        if (fechaRaw instanceof Date) {
          fecha = fechaRaw
        } else if (typeof fechaRaw === 'number') {
          fecha = new Date((fechaRaw - 25569) * 86400 * 1000)
        } else if (typeof fechaRaw === 'string') {
          const str = fechaRaw.trim()
          if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
            fecha = new Date(str.substring(0, 10))
          } else if (str.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
            const [m, d, y] = str.split('/')
            const year = parseInt(y) < 100 ? 2000 + parseInt(y) : parseInt(y)
            fecha = new Date(year, parseInt(m) - 1, parseInt(d))
          }
        }

        if (!fecha || isNaN(fecha.getTime())) return

        const año = fecha.getFullYear()
        if (año < 2020 || año > 2030) return
        añosSet.add(año)

        const cuentaRaw = String(row[COL.cuenta] || '').trim()
        if (!cuentaRaw || cuentaRaw.length < 2) return

        const grupo = cuentaRaw.substring(0, 2)
        const subcuenta = cuentaRaw.substring(0, 3)

        const debe = parseImporte(row[COL.debe])
        const haber = parseImporte(row[COL.haber])

        totalDebe += debe
        totalHaber += haber

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
        throw new Error('No se encontraron movimientos validos')
      }

      const añosNuevos = Array.from(añosSet).sort((a, b) => b - a)

      // ========== GUARDAR EN SUPABASE ==========
      dispatch({ type: 'SET_LOADING', payload: true, message: 'Guardando en Supabase...' })

      // Eliminar movimientos existentes de esos anos
      for (const año of añosNuevos) {
        await db.movimientos.deleteByYear(año)
      }

      // Insertar movimientos en batches de 500
      const BATCH_SIZE = 500
      for (let i = 0; i < movimientos.length; i += BATCH_SIZE) {
        const batch = movimientos.slice(i, i + BATCH_SIZE)
        const año = parseInt(batch[0].mes.split('-')[0])

        dispatch({
          type: 'SET_LOADING',
          payload: true,
          message: `Guardando ${i + batch.length} de ${movimientos.length}...`
        })

        const { error } = await db.movimientos.insertBatch(batch, año)
        if (error) {
          console.error('Error insertando batch:', error)
          throw new Error(`Error guardando movimientos: ${error.message}`)
        }
      }

      // Registrar archivos cargados
      for (const año of añosNuevos) {
        const movsAño = movimientos.filter(m => m.mes.startsWith(String(año)))
        await db.archivosCargados.register(año, {
          nombre: file.name,
          movimientos: movsAño.length,
          totalDebe: movsAño.reduce((sum, m) => sum + m.debe, 0),
          totalHaber: movsAño.reduce((sum, m) => sum + m.haber, 0)
        })
      }

      // Subir archivo al Storage (opcional)
      try {
        const filePath = `diarios/${añosNuevos.join('-')}_${Date.now()}_${file.name}`
        await storage.uploadExcel(file, filePath)
        console.log('Archivo subido al Storage:', filePath)
      } catch (storageError) {
        console.warn('No se pudo subir al Storage:', storageError)
        // No es critico, continuamos
      }

      // ========== ACTUALIZAR ESTADO LOCAL ==========
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

      // Combinar con movimientos existentes
      const movimientosExistentes = state.movimientos.filter(m => {
        const añoMov = parseInt(m.mes.split('-')[0])
        return !añosNuevos.includes(añoMov)
      })
      const movimientosCombinados = [...movimientosExistentes, ...movimientos]

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
            numMovimientos: movimientosCombinados.length
          },
          supabaseSync: true
        }
      })

      return { success: true, movimientos: movimientos.length, años: añosNuevos }
    } catch (error) {
      console.error('Error cargando diario:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Funcion para cargar maestro de proveedores
  const cargarProveedores = async (file) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Cargando proveedores...' })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet)

      const proveedores = {}
      json.forEach(row => {
        const codigo = row['Nº'] ?? row['N°'] ?? row['Codigo'] ?? row['codigo'] ?? row['N']
        const nombre = row['Nombre'] ?? row['nombre'] ?? row['NOMBRE']

        if (codigo !== undefined && nombre) {
          proveedores[String(codigo).trim()] = String(nombre).trim()
        }
      })

      // Guardar en Supabase
      const { error } = await db.proveedores.upsert(proveedores)
      if (error) {
        console.error('Error guardando proveedores en Supabase:', error)
      }

      dispatch({ type: 'LOAD_PROVEEDORES', payload: proveedores })
      dispatch({ type: 'SET_LOADING', payload: false })
      return { success: true, count: Object.keys(proveedores).length }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Funcion para formatear numero en formato espanol (sin decimales para Excel)
  const formatoEspañol = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return num
    return Math.round(num).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  // Funcion para exportar a Excel con formato
  const exportarExcel = (datos, nombreArchivo) => {
    const ws = XLSX.utils.json_to_sheet(datos)

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

  // Funcion para exportar movimientos filtrados
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

  // Funcion para cargar presupuesto desde Excel
  const cargarPresupuesto = async (file, año) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Cargando presupuesto...' })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      // Intentar detectar formato GL PPT (con header: 1 para arrays)
      const jsonRaw = XLSX.utils.sheet_to_json(sheet, { header: 1 })

      const presupuestos = []
      const presupuestosPorCuentaMes = {} // Para agrupar por cuenta 3 dígitos

      // Detectar formato GL PPT (fechas Excel en cabecera fila 3)
      let esFormatoGLPPT = false
      let indiceMeses = []

      if (jsonRaw.length > 4) {
        const cabecera = jsonRaw[3] || []
        // Buscar si hay números de fecha Excel (>40000) en las columnas
        const posiblesFechas = cabecera.slice(2).filter(v => typeof v === 'number' && v > 40000 && v < 50000)
        if (posiblesFechas.length >= 12) {
          esFormatoGLPPT = true
          // Convertir fechas Excel a mes (1-12)
          indiceMeses = cabecera.slice(2).map(d => {
            if (typeof d === 'number' && d > 40000) {
              const fecha = new Date((d - 25569) * 86400 * 1000)
              return fecha.getMonth() + 1 // 1-12
            }
            return null
          })
          console.log('Detectado formato GL PPT, meses:', indiceMeses)
        }
      }

      if (esFormatoGLPPT) {
        // Procesar formato GL PPT: guardar cuentas a 9 dígitos (máximo desglose)
        jsonRaw.forEach((row, i) => {
          if (i < 4) return // Saltar cabeceras

          const cuentaLarga = String(row[0] || '').trim()

          // Solo cuentas de 9 dígitos (máximo desglose) - ignorar subtotales
          if (cuentaLarga.length !== 9) return

          const cuenta3 = cuentaLarga.substring(0, 3)

          // Solo procesar cuentas 6XX y 7XX
          if (!cuenta3.match(/^[67]\d{2}$/) || !ACCOUNT_GROUPS_3[cuenta3]) return

          const esIngreso = cuenta3.startsWith('7')
          const valores = row.slice(2)
          indiceMeses.forEach((mes, idx) => {
            if (mes === null || mes < 1 || mes > 12) return
            let importe = parseFloat(valores[idx]) || 0
            if (importe === 0) return

            // Invertir signo de ingresos para normalizar (el archivo tiene ingresos negativos)
            if (esIngreso) importe = -importe

            const key = `${cuentaLarga}-${mes}`
            if (!presupuestosPorCuentaMes[key]) {
              presupuestosPorCuentaMes[key] = { año, mes, cuenta: cuentaLarga, importe: 0 }
            }
            presupuestosPorCuentaMes[key].importe += importe
          })
        })

        // Convertir a array
        Object.values(presupuestosPorCuentaMes).forEach(p => {
          if (p.importe !== 0) {
            presupuestos.push(p)
          }
        })
      } else {
        // Formato estándar: intentar con json normal
        const json = XLSX.utils.sheet_to_json(sheet)

        if (json.length === 0) {
          throw new Error('El archivo está vacío')
        }

        const columns = Object.keys(json[0] || {})
        const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        // Formato horizontal (una fila por cuenta con columnas por mes)
        if (columns.some(c => mesesCortos.includes(c) || c.match(/^(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)$/i))) {
          json.forEach(row => {
            const cuentaRaw = String(row['Cuenta'] || row['cuenta'] || row['CUENTA'] || row['Nº cuenta'] || '').trim()
            const cuenta = cuentaRaw.substring(0, 3)
            if (!cuenta || !ACCOUNT_GROUPS_3[cuenta]) return

            mesesCortos.forEach((mesCorto, idx) => {
              const mesNum = idx + 1
              const valorCol = columns.find(c =>
                c === mesCorto ||
                c.toLowerCase().startsWith(mesCorto.toLowerCase()) ||
                c.match(new RegExp(`^${mesCorto}`, 'i'))
              )
              if (!valorCol) return

              const importe = parseFloat(row[valorCol]) || 0
              if (importe !== 0) {
                const key = `${cuenta}-${mesNum}`
                if (!presupuestosPorCuentaMes[key]) {
                  presupuestosPorCuentaMes[key] = { año, mes: mesNum, cuenta, importe: 0 }
                }
                presupuestosPorCuentaMes[key].importe += importe
              }
            })
          })

          Object.values(presupuestosPorCuentaMes).forEach(p => {
            if (p.importe !== 0) presupuestos.push(p)
          })
        } else {
          // Formato vertical (Cuenta, Mes, Importe)
          json.forEach(row => {
            const cuentaRaw = String(row['Cuenta'] || row['cuenta'] || row['CUENTA'] || '').trim()
            const cuenta = cuentaRaw.substring(0, 3)
            const mes = parseInt(row['Mes'] || row['mes'] || row['MES']) || 0
            const importe = parseFloat(row['Importe'] || row['importe'] || row['IMPORTE']) || 0

            if (cuenta && ACCOUNT_GROUPS_3[cuenta] && mes >= 1 && mes <= 12) {
              presupuestos.push({ año, mes, cuenta, importe })
            }
          })
        }
      }

      if (presupuestos.length === 0) {
        throw new Error('No se encontraron datos de presupuesto válidos. Verifica que el archivo tenga cuentas 6XX o 7XX.')
      }

      // Guardar en Supabase
      dispatch({ type: 'SET_LOADING', payload: true, message: 'Guardando en Supabase...' })

      // Eliminar presupuesto existente del año
      await db.presupuestos.deleteByYear(año)

      // Insertar nuevos presupuestos
      const { error } = await db.presupuestos.upsert(presupuestos)
      if (error) {
        throw new Error(`Error guardando presupuesto: ${error.message}`)
      }

      // Actualizar estado
      dispatch({ type: 'LOAD_PRESUPUESTOS', payload: presupuestos })
      dispatch({ type: 'SET_LOADING', payload: false })

      return { success: true, count: presupuestos.length }
    } catch (error) {
      console.error('Error cargando presupuesto:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Funcion para cargar presupuestos desde Supabase
  const cargarPresupuestosDesdeSupabase = async (año) => {
    try {
      const { data, error } = await db.presupuestos.getByYear(año)
      if (error) {
        console.error('Error cargando presupuestos:', error)
        return
      }
      dispatch({ type: 'LOAD_PRESUPUESTOS', payload: data || [] })
    } catch (error) {
      console.error('Error cargando presupuestos:', error)
    }
  }

  // Cargar albaranes y facturas desde Excel
  const cargarAlbaranes = async (file, año, mes) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Procesando albaranes...' })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { raw: true })

      if (json.length === 0) throw new Error('El archivo esta vacio')

      // Construir mapeo grupo -> cuenta
      const mapeo = {}
      state.mapeoGrupoCuenta.forEach(m => {
        if (m.cuenta) mapeo[m.grupo_contable] = m.cuenta
      })

      const columns = Object.keys(json[0] || {})

      // Find columns flexibly
      const findCol = (patterns) => {
        const colsLower = columns.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        for (const p of patterns) {
          const pNorm = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const idx = colsLower.findIndex(c => c.includes(pNorm))
          if (idx !== -1) return columns[idx]
        }
        return null
      }

      const COL_tipo = findCol(['tipo documento', 'tipo doc'])
      const COL_doc = findCol(['n documento', 'nº documento', 'no documento'])
      const COL_desc = findCol(['descripcion', 'descripción'])
      const COL_grupo = findCol(['grupo contable prod', 'grupo contable', 'gr. contable prod'])
      const COL_codProv = findCol(['proveedor', 'cod proveedor', 'código proveedor'])
      const COL_esperado = findCol(['importe coste (esperado)', 'importe coste esperado', 'coste esperado'])
      const COL_fecha = findCol(['fecha registro', 'fecha'])

      const rows = []
      json.forEach(row => {
        // Solo líneas con Importe coste (Esperado) > 0
        const esperado = parseFloat(row[COL_esperado]) || 0
        if (esperado <= 0) return

        const grupoContable = String(row[COL_grupo] || '').trim()

        // Ignorar ACTV. FIJO
        if (grupoContable === 'ACTV. FIJO' || grupoContable === 'ACTIVO FIJO') return

        const cuentaMapeada = mapeo[grupoContable] || ''

        rows.push({
          año,
          mes,
          fecha: row[COL_fecha] ? new Date(row[COL_fecha]).toISOString().substring(0, 10) : null,
          tipo_documento: row[COL_tipo] || '',
          no_documento: String(row[COL_doc] || ''),
          descripcion: row[COL_desc] || '',
          importe: esperado,
          grupo_contable_prod: grupoContable,
          cuenta_mapeada: cuentaMapeada,
          cod_proveedor: String(row[COL_codProv] || ''),
          es_pendiente: true
        })
      })

      dispatch({ type: 'SET_LOADING', payload: true, message: 'Guardando albaranes...' })
      const { error } = await db.albaranesFacturas.upsert(rows, año, mes)
      if (error) throw new Error(`Error guardando albaranes: ${error.message}`)

      // Reload
      const { data: albData } = await db.albaranesFacturas.getByYear(año)
      dispatch({ type: 'LOAD_ALBARANES_FACTURAS', payload: albData || [] })
      dispatch({ type: 'SET_LOADING', payload: false })
      return { success: true, count: rows.length }
    } catch (error) {
      console.error('Error cargando albaranes:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Cargar pedidos de compra desde Excel
  const cargarPedidos = async (file, año, mes) => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Procesando pedidos...' })

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { raw: true })

      if (json.length === 0) throw new Error('El archivo esta vacio')

      const columns = Object.keys(json[0] || {})
      const findCol = (patterns) => {
        const colsLower = columns.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
        for (const p of patterns) {
          const pNorm = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          const idx = colsLower.findIndex(c => c.includes(pNorm))
          if (idx !== -1) return columns[idx]
        }
        return null
      }

      const COL_doc = findCol(['n documento', 'nº documento', 'no documento'])
      const COL_codProv = findCol(['proveedor', 'cod proveedor'])
      const COL_tipo = findCol(['tipo'])
      const COL_no = findCol(['nº', 'n°', 'no']) // Account or product number
      const COL_desc = findCol(['descripcion', 'descripción'])
      const COL_cant = findCol(['cantidad'])
      const COL_cantPte = findCol(['cantidad pendiente', 'cant. pendiente'])
      const COL_importe = findCol(['importe linea', 'importe línea', 'importe'])
      const COL_fechaRec = findCol(['fecha recepcion', 'fecha recepción', 'fecha recepcion esperada'])

      const rows = []
      json.forEach(row => {
        const tipo = String(row[COL_tipo] || '').trim()
        const no = String(row[COL_no] || '').trim()

        // Ignorar líneas de activo fijo (No empieza por "AF")
        if (no.startsWith('AF')) return

        let cuenta = ''
        if (tipo === 'Cuenta' || tipo === 'cuenta') {
          cuenta = no // Direct 9-digit account
        } else {
          // Tipo "Producto" or other -> assign to 600000000 as estimation
          cuenta = '600000000'
        }

        // Check cuenta starts with 60 or 62, otherwise skip
        const c2 = cuenta.substring(0, 2)
        if (c2 !== '60' && c2 !== '62') return

        const importe = parseFloat(row[COL_importe]) || 0
        if (importe === 0) return

        // Parse fecha recepcion for month filtering
        let fechaRec = null
        const fechaRaw = row[COL_fechaRec]
        if (fechaRaw instanceof Date) {
          fechaRec = fechaRaw
        } else if (typeof fechaRaw === 'number' && fechaRaw > 40000) {
          fechaRec = new Date((fechaRaw - 25569) * 86400 * 1000)
        } else if (typeof fechaRaw === 'string' && fechaRaw.trim()) {
          fechaRec = new Date(fechaRaw)
        }

        // Only include pedidos for specified month
        if (fechaRec && !isNaN(fechaRec.getTime())) {
          const mesRec = fechaRec.getMonth() + 1
          const añoRec = fechaRec.getFullYear()
          if (mesRec !== mes || añoRec !== año) return
        }

        rows.push({
          año,
          mes,
          no_documento: String(row[COL_doc] || ''),
          cod_proveedor: String(row[COL_codProv] || ''),
          tipo,
          cuenta,
          descripcion: row[COL_desc] || '',
          cantidad: parseFloat(row[COL_cant]) || 0,
          cantidad_pendiente: parseFloat(row[COL_cantPte]) || 0,
          importe,
          fecha_recepcion: fechaRec ? fechaRec.toISOString().substring(0, 10) : null
        })
      })

      dispatch({ type: 'SET_LOADING', payload: true, message: 'Guardando pedidos...' })
      const { error } = await db.pedidosCompra.upsert(rows, año, mes)
      if (error) throw new Error(`Error guardando pedidos: ${error.message}`)

      const { data: pedData } = await db.pedidosCompra.getByYear(año)
      dispatch({ type: 'LOAD_PEDIDOS_COMPRA', payload: pedData || [] })
      dispatch({ type: 'SET_LOADING', payload: false })
      return { success: true, count: rows.length }
    } catch (error) {
      console.error('Error cargando pedidos:', error)
      dispatch({ type: 'SET_ERROR', payload: error.message })
      return { success: false, error: error.message }
    }
  }

  // Guardar mapeo grupo contable -> cuenta
  const guardarMapeo = async (filas) => {
    const rows = filas.map(f => ({
      grupo_contable: f.grupo_contable,
      cuenta: f.cuenta || '',
      descripcion: f.descripcion || '',
      updated_at: new Date().toISOString()
    }))
    const { error } = await db.mapeoGrupoCuenta.upsert(rows)
    if (error) throw new Error(error.message)
    dispatch({ type: 'LOAD_MAPEO_GRUPO_CUENTA', payload: filas })
  }

  // Limpiar datos (local y Supabase)
  const limpiarDatos = async () => {
    dispatch({ type: 'SET_LOADING', payload: true, message: 'Eliminando datos...' })

    try {
      // Eliminar de Supabase
      for (const año of state.años) {
        await db.movimientos.deleteByYear(año)
      }
      console.log('Datos eliminados de Supabase')
    } catch (error) {
      console.error('Error eliminando de Supabase:', error)
    }

    dispatch({ type: 'CLEAR_DATA' })
  }

  const value = {
    ...state,
    dispatch,
    cargarDiario,
    cargarProveedores,
    cargarPresupuesto,
    cargarPresupuestosDesdeSupabase,
    cargarDatosDesdeSupabase,
    cargarAlbaranes,
    cargarPedidos,
    guardarMapeo,
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
