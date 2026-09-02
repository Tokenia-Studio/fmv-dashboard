// ============================================
// GESTION USUARIOS - Centralizada para todas las apps
// Solo para rol direccion
//
// Alta por INVITACIÓN: dirección pone email, app, rol (y centros o taller) y
// pulsa "Invitar". La Edge Function admin-users crea la cuenta e invita por
// correo; el usuario pulsa el enlace, cae en su app y establece su contraseña.
// Ese clic confirma el email. Cambios de rol/centros/taller se hacen aquí
// directamente sobre app_user_roles (RLS: solo dirección escribe).
// ============================================

import React, { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, MailPlus, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// Configuración de apps y roles.
// Para añadir una app nueva (p.ej. Comercial): una entrada más con su URL y roles.
// `url` es a donde lleva el enlace de invitación (debe estar en Supabase →
// Auth → URL Configuration → Redirect URLs).
const APPS = {
  dashboard: {
    label: 'Dashboard',
    url: 'https://fmv-dashboard-v2.vercel.app',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'compras', label: 'Compras' }
    ]
  },
  produccion: {
    label: 'Producción',
    url: 'https://fmv-produccion.vercel.app',
    roles: [
      { value: 'direccion', label: 'Dirección' },
      { value: 'planificacion', label: 'Planificación' },
      { value: 'taller', label: 'Taller' },
      { value: 'seccion', label: 'Sección' }
    ]
  },
  web: {
    // La web (Astro + Decap CMS) no usa Supabase: se mantiene solo para mostrar
    // filas antiguas; no se puede invitar a ella.
    label: 'Web',
    url: null,
    roles: [
      { value: 'editor', label: 'Editor' }
    ]
  }
}

const APPS_INVITABLES = Object.entries(APPS).filter(([, cfg]) => cfg.url)

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
// Mismo código que el centro de trabajo de Business Central / Producción y su
// fase genérica (constants.js de Producción). Multi-selección.
const CENTROS_SECCION = [
  { cod: '015', label: 'Láser', fase: 'Láser' },
  { cod: '054', label: 'Láser 054', fase: 'Láser' },
  { cod: '055', label: 'Láser 055', fase: 'Láser' },
  { cod: '026', label: 'Sierra 026', fase: 'Corte sierra' },
  { cod: '041', label: 'Sierra 041', fase: 'Corte sierra' },
  { cod: '016', label: 'Corte por agua', fase: 'Corte sierra' },
  { cod: '012', label: 'Plegadora', fase: 'Plegado' },
  { cod: '008', label: 'Plegadora 008', fase: 'Plegado' },
  { cod: '052', label: 'Plegadora 052', fase: 'Plegado' },
  { cod: '101', label: 'Plegadora 101', fase: 'Plegado' },
  { cod: '003', label: 'Soldadura', fase: 'Soldadura' },
  { cod: '022', label: 'Soldadura 022', fase: 'Soldadura' },
  { cod: '023', label: 'Soldadura 023', fase: 'Soldadura' },
  { cod: '049', label: 'Soldadura 049', fase: 'Soldadura' },
  { cod: '025', label: 'Banco de esmerilar', fase: 'Repasado' },
  { cod: '030', label: 'Rebarbar', fase: 'Repasado' },
  { cod: '098', label: 'Verificación', fase: 'Verificación' },
  { cod: '024', label: 'Montaje final', fase: 'Montaje' },
  { cod: '028', label: 'Pintura', fase: 'Pintura' },
  { cod: '099', label: 'Diseño / OT', fase: 'Diseño' }
]

const FASES_SECCION = [...new Set(CENTROS_SECCION.map(c => c.fase))]

function etiquetaCentros(cods) {
  const lista = cods || []
  if (!lista.length) return null
  return lista
    .map(cod => CENTROS_SECCION.find(c => c.cod === cod)?.label || cod)
    .join(', ')
}

// Llama a la Edge Function admin-users con la sesión del admin.
// supabase.functions.invoke devuelve el cuerpo de error dentro de error.context.
async function llamarAdminUsers(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    let msg = error.message
    try {
      const j = await error.context?.json?.()
      if (j?.error) msg = j.error
    } catch { /* sin cuerpo JSON */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

// Selector multi-centro agrupado por fase (reutilizado en formulario y tabla)
function SelectorCentros({ seleccionados, onToggle, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute z-20 mt-1 w-56 max-h-80 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg p-1 text-left left-0">
        {FASES_SECCION.map(fase => (
          <div key={fase}>
            <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{fase}</div>
            {CENTROS_SECCION.filter(c => c.fase === fase).map(c => {
              const marcado = seleccionados.includes(c.cod)
              return (
                <button
                  key={c.cod}
                  type="button"
                  onClick={() => onToggle(c.cod)}
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
        ))}
      </div>
    </>
  )
}

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)
  const [openCentros, setOpenCentros] = useState(null) // user_id con el desplegable de centros abierto, o 'nuevo'
  const [reenviando, setReenviando] = useState(null)

  // Filtros
  const [filtroEmail, setFiltroEmail] = useState('')
  const [filtroApp, setFiltroApp] = useState('')
  const [filtroRol, setFiltroRol] = useState('')

  // Formulario nueva invitación
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoApp, setNuevoApp] = useState('dashboard')
  const [nuevoRol, setNuevoRol] = useState('compras')
  const [nuevoCentros, setNuevoCentros] = useState([])
  const [nuevoTaller, setNuevoTaller] = useState('')
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

  const avisar = (tipo, texto, ms = 4000) => {
    setMensaje({ tipo, texto })
    setTimeout(() => setMensaje(null), ms)
  }

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

      // Estado de cada cuenta desde auth.users
      const authMap = {}
      ;(authRes.data || []).forEach(au => { authMap[au.id] = au })

      // Enriquecer roles con email real y estado de la invitación
      const enriquecidos = (rolesRes.data || [])
        .map(r => {
          const au = authMap[r.user_id]
          return {
            ...r,
            email: r.email || au?.email || null,
            // Pendiente = aún no ha establecido contraseña / nunca ha entrado
            pendiente: au ? (!au.email_confirmed_at || !au.last_sign_in_at) : false
          }
        })
        .filter(r => r.email)
        .sort((a, b) => (a.email || '').localeCompare(b.email || ''))

      setUsuarios(enriquecidos)
    } catch (e) {
      console.error('Error cargando usuarios:', e)
      setMensaje({ tipo: 'error', texto: 'Error cargando usuarios: ' + e.message })
    }
    setLoading(false)
  }

  const cambiarRol = async (userId, app, rol) => {
    try {
      const updates = { role: rol }
      // Si cambia a no-taller, limpiar taller_asignado
      if (rol !== 'taller') updates.taller_asignado = null
      // Si cambia a no-seccion, limpiar centros_asignados
      if (rol !== 'seccion') updates.centros_asignados = null

      const { error } = await supabase
        .from('app_user_roles')
        .update(updates)
        .eq('user_id', userId)
        .eq('app', app)

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId && u.app === app ? { ...u, ...updates } : u
      ))
      avisar('success', 'Rol actualizado', 3000)
    } catch (e) {
      avisar('error', 'Error: ' + e.message, 3000)
    }
  }

  // Multi-selección de centros de trabajo (rol Sección) en la tabla
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
      avisar('error', 'Error: ' + e.message, 3000)
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
      avisar('success', 'Taller actualizado', 3000)
    } catch (e) {
      avisar('error', 'Error: ' + e.message, 3000)
    }
  }

  const invitar = async (e) => {
    e.preventDefault()
    if (!nuevoEmail) return
    const cfg = APPS[nuevoApp]
    if (!cfg?.url) { avisar('error', 'Esta aplicación no admite invitaciones'); return }

    setCreando(true)
    setMensaje(null)
    try {
      const data = await llamarAdminUsers({
        action: 'invite',
        email: nuevoEmail.trim().toLowerCase(),
        app: nuevoApp,
        role: nuevoRol,
        redirectTo: cfg.url,
        centros: nuevoRol === 'seccion' ? nuevoCentros : undefined,
        taller: nuevoRol === 'taller' ? (nuevoTaller || null) : undefined
      })
      avisar('success', data?.mensaje || 'Invitación enviada', 6000)
      setNuevoEmail('')
      setNuevoCentros([])
      setNuevoTaller('')
      cargarUsuarios()
    } catch (err) {
      avisar('error', err.message, 8000)
    }
    setCreando(false)
  }

  const reenviarInvitacion = async (u) => {
    const cfg = APPS[u.app]
    if (!cfg?.url) { avisar('error', 'Esta aplicación no admite invitaciones'); return }
    setReenviando(u.user_id)
    try {
      const data = await llamarAdminUsers({ action: 'resend', user_id: u.user_id, redirectTo: cfg.url })
      avisar('success', data?.mensaje || 'Invitación reenviada', 6000)
    } catch (err) {
      avisar('error', err.message, 8000)
    }
    setReenviando(null)
  }

  const eliminarAcceso = async (userId, app, email) => {
    // Contar cuántos accesos tiene este usuario
    const accesosUsuario = usuarios.filter(u => u.user_id === userId)

    if (accesosUsuario.length === 1) {
      // Último acceso: eliminar usuario completo
      if (!confirm(`${email} solo tiene acceso a ${APPS[app]?.label || app}.\n\n¿Eliminar completamente la cuenta?`)) return
      try {
        await llamarAdminUsers({ action: 'delete', user_id: userId })
        setUsuarios(prev => prev.filter(u => u.user_id !== userId))
        avisar('success', `Usuario ${email} eliminado completamente`, 3000)
      } catch (e) {
        avisar('error', 'Error: ' + e.message, 6000)
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
        avisar('success', `Acceso de ${email} a ${APPS[app]?.label || app} eliminado`, 3000)
      } catch (e) {
        avisar('error', 'Error: ' + e.message, 3000)
      }
    }
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

  const rolesApp = APPS[nuevoApp]?.roles || []

  // Email del formulario coincide con un usuario ya existente en otra app → solo se añade acceso
  const emailLowerForm = nuevoEmail.toLowerCase().trim()
  const usuarioExistente = emailLowerForm
    ? usuarios.find(u => (u.email || '').toLowerCase() === emailLowerForm)
    : null
  const esSeccionNuevo = nuevoApp === 'produccion' && nuevoRol === 'seccion'
  const esTallerNuevo = nuevoApp === 'produccion' && nuevoRol === 'taller'

  return (
    <div className="space-y-6">
      {/* Invitar usuario */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white">Invitar usuario</h3>
        </div>

        <form onSubmit={invitar} className="p-4">
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
              <label className="block text-xs text-gray-500 mb-1">Aplicación</label>
              <select
                value={nuevoApp}
                onChange={(e) => setNuevoApp(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {APPS_INVITABLES.map(([key, cfg]) => (
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
            <div>
              {esSeccionNuevo ? (
                <>
                  <label className="block text-xs text-gray-500 mb-1">Centros</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenCentros(openCentros === 'nuevo' ? null : 'nuevo')}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-white text-left flex items-center justify-between gap-1 hover:border-teal-400"
                    >
                      <span className="truncate">
                        {etiquetaCentros(nuevoCentros) || <span className="text-gray-400">Seleccionar centros…</span>}
                      </span>
                      <span className="text-gray-400">▾</span>
                    </button>
                    {openCentros === 'nuevo' && (
                      <SelectorCentros
                        seleccionados={nuevoCentros}
                        onToggle={(cod) => setNuevoCentros(prev => prev.includes(cod) ? prev.filter(c => c !== cod) : [...prev, cod])}
                        onClose={() => setOpenCentros(null)}
                      />
                    )}
                  </div>
                </>
              ) : esTallerNuevo ? (
                <>
                  <label className="block text-xs text-gray-500 mb-1">Taller</label>
                  <select
                    value={nuevoTaller}
                    onChange={(e) => setNuevoTaller(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="1">Taller 1</option>
                    <option value="2">Taller 2</option>
                  </select>
                </>
              ) : (
                <p className="text-xs text-gray-400 pb-2">
                  {usuarioExistente
                    ? 'Usuario existente: se le añade el acceso sin enviar correo.'
                    : 'Recibirá un correo con un enlace para establecer su contraseña.'}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={creando}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                usuarioExistente ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <MailPlus size={16} />
              {creando
                ? (usuarioExistente ? 'Añadiendo acceso...' : 'Invitando...')
                : (usuarioExistente ? 'Añadir acceso' : 'Invitar')}
            </button>
          </div>
        </form>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2
          ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.tipo === 'success'
            ? <CheckCircle2 size={16} className="shrink-0 text-green-600" />
            : <XCircle size={16} className="shrink-0 text-red-600" />}
          {mensaje.texto}
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-bold text-white">Usuarios registrados</h3>
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
                      <td className="p-3 font-medium">
                        {u.email}
                        {u.pendiente && (
                          <span
                            className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 align-middle"
                            title="Aún no ha establecido contraseña ni ha entrado"
                          >
                            <Clock size={11} /> Pendiente de aceptar
                          </span>
                        )}
                      </td>
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
                              <span className="truncate max-w-[220px]">
                                {etiquetaCentros(u.centros_asignados) || <span className="text-gray-400">Seleccionar centros…</span>}
                              </span>
                              <span className="text-gray-400">▾</span>
                            </button>
                            {openCentros === u.user_id && (
                              <SelectorCentros
                                seleccionados={u.centros_asignados || []}
                                onToggle={(cod) => toggleCentro(u.user_id, cod)}
                                onClose={() => setOpenCentros(null)}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '-'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {u.pendiente && appCfg?.url && (
                          <button
                            onClick={() => reenviarInvitacion(u)}
                            disabled={reenviando === u.user_id}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 mr-1"
                            title="Volver a enviar el correo con el enlace para establecer contraseña"
                          >
                            {reenviando === u.user_id ? 'Enviando…' : 'Reenviar invitación'}
                          </button>
                        )}
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
