// ============================================
// GESTION USUARIOS - Centralizada para todas las apps
// Solo para rol direccion
// ============================================

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase, auth } from '../../lib/supabase'

// Cliente secundario sin persistencia de sesión (para crear usuarios sin perder la sesión admin)
const supabaseSignup = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

// Configuración de apps y roles
const APPS = {
  dashboard: {
    label: 'Dashboard',
    // URL de la app: a dónde debe redirigir el correo de confirmación de signup
    url: 'https://fmv-dashboard-v2.vercel.app',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'compras', label: 'Compras' }
    ],
    color: 'blue'
  },
  produccion: {
    label: 'Producción',
    url: 'https://fmv-produccion.vercel.app',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'planificacion', label: 'Planificación' },
      { value: 'taller', label: 'Taller' },
      { value: 'seccion', label: 'Sección' }
    ],
    color: 'emerald'
  },
  web: {
    label: 'Web',
    roles: [
      { value: 'editor', label: 'Editor' }
    ],
    color: 'cyan'
  }
}

const APP_BADGE_STYLES = {
  dashboard: 'bg-blue-50 text-blue-700 border-blue-200',
  produccion: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  web: 'bg-cyan-50 text-cyan-700 border-cyan-200'
}

// Botón de filtro activo por app (Tailwind necesita las clases completas para no purgarlas)
const APP_FILTER_ACTIVE_STYLES = {
  dashboard: 'bg-blue-600 text-white',
  produccion: 'bg-emerald-600 text-white',
  web: 'bg-cyan-600 text-white'
}

const ROLE_BADGE_STYLES = {
  direccion: 'bg-blue-50 text-blue-700 border-blue-200',
  compras: 'bg-orange-50 text-orange-700 border-orange-200',
  planificacion: 'bg-purple-50 text-purple-700 border-purple-200',
  taller: 'bg-amber-50 text-amber-700 border-amber-200',
  seccion: 'bg-teal-50 text-teal-700 border-teal-200',
  editor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
}

// Centros de trabajo (secciones de producción) que un usuario "Sección" puede ver.
// El código coincide con el centro de trabajo de Producción (→ su fase). Multi-selección.
const CENTROS_SECCION = [
  { cod: '015', label: 'Láser' },
  { cod: '012', label: 'Plegado' },
  { cod: '003', label: 'Soldadura' },
  { cod: '025', label: 'Repasado' },
  { cod: '024', label: 'Montaje' },
  { cod: '028', label: 'Pintura' }
]

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [openCentros, setOpenCentros] = useState(null) // user_id con el desplegable de centros abierto

  // Filtros
  const [filtroEmail, setFiltroEmail] = useState('')
  const [filtroApp, setFiltroApp] = useState('')
  const [filtroRol, setFiltroRol] = useState('')

  // Formulario nuevo usuario
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoApp, setNuevoApp] = useState('dashboard')
  const [nuevoRol, setNuevoRol] = useState('compras')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  // Al cambiar app, resetear rol al primero disponible
  useEffect(() => {
    const roles = APPS[nuevoApp]?.roles
    if (roles && !roles.find(r => r.value === nuevoRol)) {
      setNuevoRol(roles[0].value)
    }
  }, [nuevoApp])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      // Cargar roles y auth users en paralelo
      const [rolesRes, authRes] = await Promise.all([
        supabase.from('app_user_roles').select('*'),
        supabase.rpc('app_list_auth_users')
      ])

      if (rolesRes.error) throw rolesRes.error
      if (authRes.error) throw authRes.error

      // Mapa de emails desde auth.users
      const emailMap = {}
      ;(authRes.data || []).forEach(au => { emailMap[au.id] = au.email })

      // Enriquecer roles con email real y filtrar los que no tienen email
      const enriquecidos = (rolesRes.data || [])
        .map(r => ({ ...r, email: r.email || emailMap[r.user_id] || null }))
        .filter(r => r.email)
        .sort((a, b) => (a.email || '').localeCompare(b.email || ''))

      setUsuarios(enriquecidos)
    } catch (e) {
      console.error('Error cargando usuarios:', e)
      setMensaje({ tipo: 'error', texto: 'Error cargando usuarios: ' + e.message })
    }
    setLoading(false)
  }

  const cambiarRol = async (userId, app, nuevoRol) => {
    try {
      const updates = { role: nuevoRol }
      // Si cambia a no-taller, limpiar taller_asignado
      if (nuevoRol !== 'taller') updates.taller_asignado = null
      // Si cambia a no-seccion, limpiar centros_asignados
      if (nuevoRol !== 'seccion') updates.centros_asignados = null

      const { error } = await supabase
        .from('app_user_roles')
        .update(updates)
        .eq('user_id', userId)
        .eq('app', app)

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId && u.app === app ? { ...u, ...updates } : u
      ))
      setMensaje({ tipo: 'success', texto: 'Rol actualizado' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  // Multi-selección de centros de trabajo (rol Sección)
  const toggleCentro = async (userId, cod) => {
    const fila = usuarios.find(u => u.user_id === userId && u.app === 'produccion')
    const actuales = fila?.centros_asignados || []
    const nuevos = actuales.includes(cod)
      ? actuales.filter(c => c !== cod)
      : [...actuales, cod]
    try {
      const { error } = await supabase
        .from('app_user_roles')
        .update({ centros_asignados: nuevos.length ? nuevos : null })
        .eq('user_id', userId)
        .eq('app', 'produccion')

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId && u.app === 'produccion' ? { ...u, centros_asignados: nuevos } : u
      ))
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
      setTimeout(() => setMensaje(null), 3000)
    }
  }

  const cambiarTaller = async (userId, taller) => {
    try {
      const { error } = await supabase
        .from('app_user_roles')
        .update({ taller_asignado: taller || null })
        .eq('user_id', userId)
        .eq('app', 'produccion')

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId && u.app === 'produccion' ? { ...u, taller_asignado: taller || null } : u
      ))
      setMensaje({ tipo: 'success', texto: 'Taller actualizado' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  const crearUsuario = async (e) => {
    e.preventDefault()
    if (!nuevoEmail) return

    setCreando(true)
    setMensaje(null)

    try {
      const emailLower = nuevoEmail.toLowerCase().trim()

      // 1. ¿El email ya existe en app_user_roles? (acceso a otra app)
      //    Reusamos su user_id en vez de hacer signUp — evita FK violation
      //    cuando Supabase devuelve un id falso por email duplicado.
      const { data: existing, error: existingError } = await supabase
        .from('app_user_roles')
        .select('user_id')
        .eq('email', emailLower)
        .limit(1)
        .maybeSingle()
      if (existingError) throw existingError

      let userId
      let yaExistia = false

      if (existing?.user_id) {
        userId = existing.user_id
        yaExistia = true
      } else {
        if (!nuevoPassword) {
          throw new Error('Password obligatoria para usuarios nuevos')
        }
        // Redirige el correo de confirmación a la app del rol elegido (Producción → app
        // de producción), no al Site URL por defecto de Supabase (Dashboard). La URL debe
        // estar en Auth → URL Configuration → Redirect URLs de Supabase o Supabase la ignora.
        const redirectBase = APPS[nuevoApp]?.url
        const { data: signUpData, error: signUpError } = await supabaseSignup.auth.signUp({
          email: emailLower,
          password: nuevoPassword,
          options: redirectBase ? { emailRedirectTo: redirectBase } : undefined
        })
        if (signUpError) throw signUpError
        if (!signUpData.user) throw new Error('No se pudo crear el usuario')
        userId = signUpData.user.id
      }

      // 2. Asignar rol en app_user_roles (alta o ampliación de acceso)
      const { error: roleError } = await supabase
        .from('app_user_roles')
        .upsert({
          user_id: userId,
          app: nuevoApp,
          role: nuevoRol,
          email: emailLower
        }, { onConflict: 'user_id,app' })
      if (roleError) throw roleError

      const appLabel = APPS[nuevoApp]?.label || nuevoApp
      const rolLabel = APPS[nuevoApp]?.roles.find(r => r.value === nuevoRol)?.label || nuevoRol
      const accion = yaExistia ? 'Acceso añadido a' : `Usuario ${nuevoEmail} creado en`
      setMensaje({ tipo: 'success', texto: `${accion} ${appLabel} con rol ${rolLabel}` })
      setNuevoEmail('')
      setNuevoPassword('')
      cargarUsuarios()
    } catch (e) {
      const msg = e.message === 'User already registered'
        ? 'Este email ya está registrado en Auth pero no en ninguna app — pide al usuario que vuelva a registrarse o resetea su password desde Supabase'
        : e.message
      setMensaje({ tipo: 'error', texto: msg })
    }
    setCreando(false)
    setTimeout(() => setMensaje(null), 5000)
  }

  const eliminarAcceso = async (userId, app, email) => {
    // Contar cuántos accesos tiene este usuario
    const accesosUsuario = usuarios.filter(u => u.user_id === userId)

    if (accesosUsuario.length === 1) {
      // Último acceso: eliminar usuario completo
      if (!confirm(`${email} solo tiene acceso a ${APPS[app]?.label || app}.\n\n¿Eliminar completamente la cuenta?`)) return
      try {
        const { error } = await supabase.rpc('app_delete_user', { target_user_id: userId })
        if (error) throw error
        setUsuarios(prev => prev.filter(u => u.user_id !== userId))
        setMensaje({ tipo: 'success', texto: `Usuario ${email} eliminado completamente` })
      } catch (e) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
      }
    } else {
      // Tiene más accesos: solo quitar este rol
      if (!confirm(`¿Quitar acceso de ${email} a ${APPS[app]?.label || app}?`)) return
      try {
        const { error } = await supabase
          .from('app_user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('app', app)
        if (error) throw error
        setUsuarios(prev => prev.filter(u => !(u.user_id === userId && u.app === app)))
        setMensaje({ tipo: 'success', texto: `Acceso de ${email} a ${APPS[app]?.label || app} eliminado` })
      } catch (e) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
      }
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(u => {
    if (filtroEmail && !u.email?.toLowerCase().includes(filtroEmail.toLowerCase())) return false
    if (filtroApp && u.app !== filtroApp) return false
    if (filtroRol && u.role !== filtroRol) return false
    return true
  })

  // Agrupar por email para mostrar cuántas apps tiene cada uno
  const emailCount = {}
  usuarios.forEach(u => {
    emailCount[u.user_id] = (emailCount[u.user_id] || 0) + 1
  })

  // Roles únicos disponibles en la lista filtrada (para el filtro de rol)
  const rolesUnicos = [...new Set(usuarios.map(u => u.role))].sort()

  const rolesApp = APPS[nuevoApp]?.roles || []

  // Email del formulario coincide con un usuario ya existente en otra app → no pedir password
  const emailLowerForm = nuevoEmail.toLowerCase().trim()
  const usuarioExistente = emailLowerForm
    ? usuarios.find(u => (u.email || '').toLowerCase() === emailLowerForm)
    : null

  return (
    <div className="space-y-6">
      {/* Crear nuevo usuario */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>&#128100;+</span>
            <span>Crear nuevo usuario</span>
          </h3>
        </div>

        <form onSubmit={crearUsuario} className="p-4">
          <div className="grid md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input
                type="email"
                value={nuevoEmail}
                onChange={(e) => setNuevoEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="usuario@empresa.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Contraseña temporal
                {usuarioExistente && <span className="ml-1 text-emerald-600 font-medium">(no necesaria — usuario existente)</span>}
              </label>
              <input
                type="text"
                value={usuarioExistente ? '' : nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                disabled={!!usuarioExistente}
                className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                placeholder={usuarioExistente ? 'Mantiene su password actual' : 'Min. 6 caracteres'}
                minLength={6}
                required={!usuarioExistente}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Aplicación</label>
              <select
                value={nuevoApp}
                onChange={(e) => setNuevoApp(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {Object.entries(APPS).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {rolesApp.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creando}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
                usuarioExistente ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {creando
                ? (usuarioExistente ? 'Añadiendo acceso...' : 'Creando...')
                : (usuarioExistente ? 'Añadir acceso' : 'Crear usuario')}
            </button>
          </div>
        </form>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2
          ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <span>{mensaje.tipo === 'success' ? '\u2705' : '\u274C'}</span>
          {mensaje.texto}
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>&#128101;</span>
            <span>Usuarios registrados</span>
          </h3>
          <span className="text-white/70 text-sm">
            {usuariosFiltrados.length === usuarios.length
              ? `${usuarios.length} accesos`
              : `${usuariosFiltrados.length} de ${usuarios.length} accesos`}
          </span>
        </div>

        {/* Filtros: botones app + buscar email */}
        {!loading && usuarios.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setFiltroApp('')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${filtroApp === '' ? 'bg-gray-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                Todas
              </button>
              {Object.entries(APPS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setFiltroApp(filtroApp === key ? '' : key)}
                  className={`px-3 py-1.5 text-xs font-medium border-l transition-colors ${filtroApp === key
                    ? (APP_FILTER_ACTIVE_STYLES[key] || 'bg-gray-700 text-white')
                    : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={filtroEmail}
              onChange={e => setFiltroEmail(e.target.value)}
              placeholder="Buscar email..."
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 w-48"
            />
            {filtroRol && (
              <button
                onClick={() => setFiltroRol('')}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg bg-white"
              >
                Rol: {Object.values(APPS).flatMap(a => a.roles).find(r => r.value === filtroRol)?.label || filtroRol} &times;
              </button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : usuarios.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No hay usuarios con rol asignado</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left">Aplicación</th>
                  <th className="p-3 text-left">Rol</th>
                  <th className="p-3 text-center">Taller / Centros</th>
                  <th className="p-3 text-left">Fecha alta</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map(u => {
                  const appCfg = APPS[u.app]
                  const rolesDisponibles = appCfg?.roles || []
                  return (
                    <tr key={`${u.user_id}-${u.app}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{u.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${APP_BADGE_STYLES[u.app] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {appCfg?.label || u.app}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => cambiarRol(u.user_id, u.app, e.target.value)}
                          className={`px-2 py-1 rounded text-xs font-medium border ${ROLE_BADGE_STYLES[u.role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                        >
                          {rolesDisponibles.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        {u.app === 'produccion' && u.role === 'taller' ? (
                          <select
                            value={u.taller_asignado || ''}
                            onChange={(e) => cambiarTaller(u.user_id, e.target.value)}
                            className="px-2 py-1 rounded text-xs font-medium border bg-gray-50 text-gray-700 border-gray-200"
                          >
                            <option value="">Todos</option>
                            <option value="1">Taller 1</option>
                            <option value="2">Taller 2</option>
                          </select>
                        ) : u.app === 'produccion' && u.role === 'seccion' ? (
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setOpenCentros(openCentros === u.user_id ? null : u.user_id)}
                              className="px-2 py-1 rounded text-xs font-medium border bg-white text-gray-700 border-gray-300 hover:border-teal-400 min-w-[150px] flex items-center justify-between gap-1"
                            >
                              <span className="truncate max-w-[180px]">
                                {(u.centros_asignados || []).length
                                  ? CENTROS_SECCION.filter(c => u.centros_asignados.includes(c.cod)).map(c => c.label).join(', ')
                                  : <span className="text-gray-400">Seleccionar centros…</span>}
                              </span>
                              <span className="text-gray-400">▾</span>
                            </button>
                            {openCentros === u.user_id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenCentros(null)} />
                                <div className="absolute z-20 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg p-1 text-left">
                                  {CENTROS_SECCION.map(c => {
                                    const marcado = (u.centros_asignados || []).includes(c.cod)
                                    return (
                                      <button
                                        key={c.cod}
                                        onClick={() => toggleCentro(u.user_id, c.cod)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-xs"
                                      >
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${marcado ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                                          {marcado && '✓'}
                                        </span>
                                        <span className="text-gray-700">{c.label}</span>
                                        <span className="text-gray-300 ml-auto">{c.cod}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => eliminarAcceso(u.user_id, u.app, u.email)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          title={emailCount[u.user_id] > 1 ? 'Quitar acceso a esta app' : 'Eliminar usuario'}
                        >
                          {emailCount[u.user_id] > 1 ? 'Quitar acceso' : 'Eliminar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {usuariosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No hay resultados con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
