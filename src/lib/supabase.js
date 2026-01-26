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

  // Cerrar sesion
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Obtener usuario actual
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Obtener sesion actual
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Escuchar cambios de autenticacion
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
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

    // Obtener movimientos por año
    getByYear: async (año) => {
      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .eq('año', año)
        .order('fecha', { ascending: true })
      return { data, error }
    },

    // Obtener todos los años disponibles
    getYears: async () => {
      const { data, error } = await supabase
        .from('movimientos')
        .select('año')
        .order('año', { ascending: false })

      if (error) return { data: [], error }
      const años = [...new Set(data.map(d => d.año))]
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
    upsert: async (proveedores) => {
      const rows = Object.entries(proveedores).map(([codigo, nombre]) => ({
        codigo,
        nombre
      }))
      const { data, error } = await supabase
        .from('proveedores')
        .upsert(rows, { onConflict: 'codigo' })
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
