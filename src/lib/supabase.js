// ============================================
// SUPABASE CLIENT - FMV Dashboard
// ============================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// AUTH HELPERS
// ============================================

export const auth = {
  // Registro con email y password
  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  },

  // Login con email y password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  // Cerrar sesión
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtener usuario actual
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Obtener sesión actual
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Escuchar cambios de autenticación
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Enviar email para resetear contraseña
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    })
    return { data, error }
  },

  // Actualizar contraseña (después de invitación o reset)
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { data, error }
  }
}

// ============================================
// DATABASE HELPERS
// ============================================

export const db = {
  // --- MOVIMIENTOS ---
  movimientos: {
    // Insertar movimientos en batch
    insertBatch: async (movimientos, año) => {
      const { data, error } = await supabase
        .from('movimientos')
        .insert(movimientos.map(m => ({
          fecha: m.fecha,
          cuenta: m.cuenta,
          grupo: m.grupo,
          subcuenta: m.subcuenta,
          debe: m.debe,
          haber: m.haber,
          neto: m.neto,
          cod_procedencia: m.codProcedencia,
          descripcion: m.descripcion,
          documento: m.documento,
          mes: m.mes,
          año: año
        })))
      return { data, error }
    },

    // Obtener movimientos por año (con paginación para cargar todos)
    getByYear: async (año) => {
      const PAGE_SIZE = 5000
      let allData = []
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('movimientos')
          .select('*')
          .eq('año', año)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (error) return { data: null, error }

        if (data && data.length > 0) {
          allData = [...allData, ...data]
          from += PAGE_SIZE
          hasMore = data.length === PAGE_SIZE
        } else {
          hasMore = false
        }
      }

      return { data: allData, error: null }
    },

    // Obtener todos los años disponibles (desde archivos_cargados que es más eficiente)
    getYears: async () => {
      const { data, error } = await supabase
        .from('archivos_cargados')
        .select('año')
        .order('año', { ascending: false })

      if (error) return { data: [], error }
      const años = data.map(d => d.año)
      return { data: años, error: null }
    },

    // Eliminar movimientos de un año
    deleteByYear: async (año) => {
      const { error } = await supabase
        .from('movimientos')
        .delete()
        .eq('año', año)
      return { error }
    },

    // Contar movimientos por año
    countByYear: async (año) => {
      const { count, error } = await supabase
        .from('movimientos')
        .select('*', { count: 'exact', head: true })
        .eq('año', año)
      return { count, error }
    }
  },

  // --- PROVEEDORES ---
  proveedores: {
    // Insertar o actualizar proveedores
    // Acepta {codigo: nombre} o {codigo: {nombre, cuenta_habitual}}
    upsert: async (proveedores) => {
      const rows = Object.entries(proveedores).map(([codigo, val]) => {
        if (typeof val === 'string') {
          return { codigo, nombre: val }
        }
        const row = { codigo, nombre: val.nombre }
        if (val.cuenta_habitual !== undefined) row.cuenta_habitual = val.cuenta_habitual
        return row
      })
      const { data, error } = await supabase
        .from('proveedores')
        .upsert(rows, { onConflict: 'codigo', ignoreDuplicates: false })
      return { data, error }
    },

    // Obtener todos los proveedores
    getAll: async () => {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true })
      return { data, error }
    }
  },

  // --- CONFIGURACION ---
  config: {
    // Guardar configuracion
    set: async (key, value) => {
      const { data, error } = await supabase
        .from('configuracion')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      return { data, error }
    },

    // Obtener configuracion
    get: async (key) => {
      const { data, error } = await supabase
        .from('configuracion')
        .select('value')
        .eq('key', key)
        .single()
      return { data: data?.value, error }
    }
  },

  // --- ARCHIVOS CARGADOS ---
  archivosCargados: {
    // Registrar archivo cargado
    register: async (año, archivo) => {
      const { data, error } = await supabase
        .from('archivos_cargados')
        .upsert({
          año,
          nombre: archivo.nombre,
          movimientos: archivo.movimientos,
          total_debe: archivo.totalDebe,
          total_haber: archivo.totalHaber,
          fecha_carga: new Date().toISOString()
        }, { onConflict: 'año' })
      return { data, error }
    },

    // Obtener archivos cargados
    getAll: async () => {
      const { data, error } = await supabase
        .from('archivos_cargados')
        .select('*')
        .order('año', { ascending: false })
      return { data, error }
    }
  },

  // --- PRESUPUESTOS ---
  presupuestos: {
    // Insertar o actualizar presupuestos
    upsert: async (presupuestos) => {
      const { data, error } = await supabase
        .from('presupuestos')
        .upsert(presupuestos, { onConflict: 'año,mes,cuenta' })
      return { data, error }
    },

    // Obtener presupuestos por año
    getByYear: async (año) => {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('año', año)
        .order('cuenta', { ascending: true })
        .order('mes', { ascending: true })
      return { data, error }
    },

    // Eliminar presupuestos de un año
    deleteByYear: async (año) => {
      const { error } = await supabase
        .from('presupuestos')
        .delete()
        .eq('año', año)
      return { error }
    },

    // Obtener años con presupuesto
    getYears: async () => {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('año')
        .order('año', { ascending: false })

      if (error) return { data: [], error }
      const años = [...new Set(data.map(d => d.año))]
      return { data: años, error: null }
    }
  },

  // --- USER ROLES ---
  userRoles: {
    getByUserId: async (userId) => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      return { data: data?.role || 'direccion', error }
    }
  },

  // --- ALBARANES Y FACTURAS ---
  albaranesFacturas: {
    upsert: async (rows, año, mes) => {
      // Delete existing for this year/month first
      await supabase.from('albaranes_facturas').delete().eq('año', año).eq('mes', mes)
      if (rows.length === 0) return { data: null, error: null }
      const BATCH = 500
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('albaranes_facturas').insert(rows.slice(i, i + BATCH))
        if (error) return { data: null, error }
      }
      return { data: true, error: null }
    },
    getByYear: async (año) => {
      const { data, error } = await supabase
        .from('albaranes_facturas')
        .select('*')
        .eq('año', año)
      return { data, error }
    }
  },

  // --- PEDIDOS DE COMPRA ---
  pedidosCompra: {
    upsert: async (rows, año, mes) => {
      await supabase.from('pedidos_compra').delete().eq('año', año).eq('mes', mes)
      if (rows.length === 0) return { data: null, error: null }
      const BATCH = 500
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await supabase.from('pedidos_compra').insert(rows.slice(i, i + BATCH))
        if (error) return { data: null, error }
      }
      return { data: true, error: null }
    },
    getByYear: async (año) => {
      const { data, error } = await supabase
        .from('pedidos_compra')
        .select('*')
        .eq('año', año)
      return { data, error }
    }
  },

  // --- MAPEO GRUPO CONTABLE -> CUENTA ---
  mapeoGrupoCuenta: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('mapeo_grupo_cuenta')
        .select('*')
        .order('grupo_contable', { ascending: true })
      return { data, error }
    },
    upsert: async (rows) => {
      const { data, error } = await supabase
        .from('mapeo_grupo_cuenta')
        .upsert(rows, { onConflict: 'grupo_contable' })
      return { data, error }
    }
  },

  // --- SERIES ESTRUCTURAS ---
  seriesEstructuras: {
    // Guardar lote de series procesadas
    upsert: async (series, metadata) => {
      // Delete existing data first
      await supabase.from('series_estructuras').delete().neq('id', 0)
      const row = {
        data: JSON.stringify(series),
        total_series: series.length,
        fecha_carga: new Date().toISOString(),
        usuario: metadata?.usuario || null
      }
      const { data, error } = await supabase
        .from('series_estructuras')
        .insert([row])
      return { data, error }
    },

    // Obtener datos procesados
    get: async () => {
      const { data, error } = await supabase
        .from('series_estructuras')
        .select('*')
        .order('fecha_carga', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code === 'PGRST116') return { data: null, error: null } // no rows
      if (data) {
        try { data.data = JSON.parse(data.data) } catch { data.data = [] }
      }
      return { data, error }
    },

    // Eliminar datos
    clear: async () => {
      const { error } = await supabase
        .from('series_estructuras')
        .delete()
        .neq('id', 0)
      return { error }
    }
  },

  // --- TIEMPOS ESTANDAR ---
  tiemposEstandar: {
    // Guardar tiempos estándar
    upsert: async (tiempos) => {
      await supabase.from('tiempos_estandar').delete().neq('id', 0)
      const { data, error } = await supabase
        .from('tiempos_estandar')
        .insert([{
          data: JSON.stringify(tiempos),
          updated_at: new Date().toISOString()
        }])
      return { data, error }
    },

    // Obtener tiempos estándar
    get: async () => {
      const { data, error } = await supabase
        .from('tiempos_estandar')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      if (error && error.code === 'PGRST116') return { data: null, error: null }
      if (data) {
        try { data.data = JSON.parse(data.data) } catch { data.data = null }
      }
      return { data, error }
    }
  },

  // --- PLAN DE CUENTAS ---
  planCuentas: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('plan_cuentas')
        .select('*')
        .order('cuenta', { ascending: true })
      return { data, error }
    },
    upsert: async (rows) => {
      const { data, error } = await supabase
        .from('plan_cuentas')
        .upsert(rows, { onConflict: 'cuenta' })
      return { data, error }
    },
    deleteAll: async () => {
      const { error } = await supabase
        .from('plan_cuentas')
        .delete()
        .neq('cuenta', '')
      return { error }
    }
  }
}

// ============================================
// STORAGE HELPERS
// ============================================

export const storage = {
  // Subir archivo Excel
  uploadExcel: async (file, path) => {
    const { data, error } = await supabase.storage
      .from('excels')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      })
    return { data, error }
  },

  // Descargar archivo
  downloadExcel: async (path) => {
    const { data, error } = await supabase.storage
      .from('excels')
      .download(path)
    return { data, error }
  },

  // Listar archivos
  listExcels: async (folder = '') => {
    const { data, error } = await supabase.storage
      .from('excels')
      .list(folder)
    return { data, error }
  },

  // Obtener URL publica
  getPublicUrl: (path) => {
    const { data } = supabase.storage
      .from('excels')
      .getPublicUrl(path)
    return data.publicUrl
  },

  // Eliminar archivo
  deleteExcel: async (path) => {
    const { error } = await supabase.storage
      .from('excels')
      .remove([path])
    return { error }
  }
}

// ============================================
// GESTION DOCUMENTAL HELPERS
// ============================================

export const documental = {
  // Lista de lotes (más recientes primero)
  getBatches: async () => {
    const { data, error } = await supabase
      .from('doc_batches')
      .select('*')
      .order('created_at', { ascending: false })
    return { data, error }
  },

  // Detalle de un lote con sus documentos
  getBatch: async (id) => {
    const { data, error } = await supabase
      .from('doc_batches')
      .select('*, doc_documents(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Actualizar estado de un lote
  updateBatchStatus: async (id, estado) => {
    const { data, error } = await supabase
      .from('doc_batches')
      .update({ estado })
      .eq('id', id)
    return { data, error }
  },

  // Actualizar datos de un documento (corrección manual)
  updateDocument: async (id, updates) => {
    const { data, error } = await supabase
      .from('doc_documents')
      .update({ ...updates, estado: 'corregido' })
      .eq('id', id)
    return { data, error }
  },

  // Confirmar y archivar un lote completo
  archiveBatch: async (id) => {
    // Marcar documentos OK/corregidos como archivados
    await supabase
      .from('doc_documents')
      .update({ estado: 'archivado' })
      .eq('batch_id', id)
      .in('estado', ['ok', 'corregido'])
    // Marcar lote como archivado
    const { data, error } = await supabase
      .from('doc_batches')
      .update({ estado: 'archivado' })
      .eq('id', id)
    return { data, error }
  },

  // URL de preview de una página
  getPreviewUrl: (batchId, pageNumber) => {
    const { data } = supabase.storage
      .from('doc-previews')
      .getPublicUrl(`${batchId}/page_${String(pageNumber).padStart(3, '0')}.png`)
    return data.publicUrl
  },

  // Estadísticas generales
  getStats: async () => {
    const { data } = await supabase.from('doc_batches').select('estado, total_documentos, created_at')
    if (!data) return { procesados: 0, pendientes: 0, total: 0, docsTotal: 0 }
    return {
      procesados: data.filter(b => b.estado === 'archivado').length,
      pendientes: data.filter(b => b.estado === 'pendiente_revision').length,
      total: data.length,
      docsTotal: data.reduce((sum, b) => sum + (b.total_documentos || 0), 0)
    }
  }
}
