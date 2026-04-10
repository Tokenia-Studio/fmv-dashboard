// ============================================
// GESTION USUARIOS - Centralizada para todas las apps
// Solo para rol direccion
// ============================================

import React, { useState, useEffect } from 'react'
import { supabase, auth } from '../../lib/supabase'

// Configuración de apps y roles
const APPS = {
  dashboard: {
    label: 'Dashboard',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'compras', label: 'Compras' }
    ],
    color: 'blue'
  },
  produccion: {
    label: 'Producción',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'planificacion', label: 'Planificación' },
      { value: 'taller', label: 'Taller' }
    ],
    color: 'emerald'
  }
}

const APP_BADGE_STYLES = {
  dashboard: 'bg-blue-50 text-blue-700 border-blue-200',
  produccion: 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

const ROLE_BADGE_STYLES = {
  direccion: 'bg-blue-50 text-blue-700 border-blue-200',
  compras: 'bg-orange-50 text-orange-700 border-orange-200',
  planificacion: 'bg-purple-50 text-purple-700 border-purple-200',
  taller: 'bg-amber-50 text-amber-700 border-amber-200'
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)

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
      const { data, error } = await supabase
        .from('app_user_roles')
        .select('*')
        .order('email', { ascending: true })

      if (error) throw error
      setUsuarios(data || [])
    } catch (e) {
      console.error('Error cargando usuarios:', e)
      setMensaje({ tipo: 'error', texto: 'Error cargando usuarios: ' + e.message })
    }
    setLoading(false)
  }

  const cambiarRol = async (userId, app, nuevoRol) => {
    try {
      const { error } = await supabase
        .from('app_user_roles')
        .update({ role: nuevoRol })
        .eq('user_id', userId)
        .eq('app', app)

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId && u.app === app ? { ...u, role: nuevoRol } : u
      ))
      setMensaje({ tipo: 'success', texto: 'Rol actualizado' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

  const crearUsuario = async (e) => {
    e.preventDefault()
    if (!nuevoEmail || !nuevoPassword) return

    setCreando(true)
    setMensaje(null)

    try {
      const { data, error } = await supabase.rpc('app_create_user', {
        p_email: nuevoEmail,
        p_password: nuevoPassword,
        p_app: nuevoApp,
        p_role: nuevoRol
      })
      if (error) throw error

      const appLabel = APPS[nuevoApp]?.label || nuevoApp
      const rolLabel = APPS[nuevoApp]?.roles.find(r => r.value === nuevoRol)?.label || nuevoRol
      setMensaje({ tipo: 'success', texto: `Usuario ${nuevoEmail} creado en ${appLabel} con rol ${rolLabel}` })
      setNuevoEmail('')
      setNuevoPassword('')
      cargarUsuarios()
    } catch (e) {
      const msg = e.message === 'User already registered'
        ? 'Este email ya está registrado'
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

  // Agrupar por email para mostrar cuántas apps tiene cada uno
  const emailCount = {}
  usuarios.forEach(u => {
    emailCount[u.user_id] = (emailCount[u.user_id] || 0) + 1
  })

  const rolesApp = APPS[nuevoApp]?.roles || []

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
              <label className="block text-xs text-gray-500 mb-1">Contraseña temporal</label>
              <input
                type="text"
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="Min. 6 caracteres"
                minLength={6}
                required
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creando ? 'Creando...' : 'Crear usuario'}
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
          <span className="text-white/70 text-sm">{usuarios.length} accesos</span>
        </div>

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
                  <th className="p-3 text-left">Fecha alta</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const appCfg = APPS[u.app]
                  const rolesDisponibles = appCfg?.roles || []
                  return (
                    <tr key={`${u.user_id}-${u.app}`} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{u.email || u.user_id.substring(0, 8) + '...'}</td>
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
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
