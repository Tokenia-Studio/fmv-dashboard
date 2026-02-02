// ============================================
// GESTION USUARIOS - Solo para rol direccion
// ============================================

import React, { useState, useEffect } from 'react'
import { supabase, auth } from '../../lib/supabase'

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState(null)

  // Formulario nuevo usuario
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoRol, setNuevoRol] = useState('compras')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsuarios(data || [])
    } catch (e) {
      console.error('Error cargando usuarios:', e)
      setMensaje({ tipo: 'error', texto: 'Error cargando usuarios: ' + e.message })
    }
    setLoading(false)
  }

  const cambiarRol = async (userId, nuevoRol) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: nuevoRol })
        .eq('user_id', userId)

      if (error) throw error

      setUsuarios(prev => prev.map(u =>
        u.user_id === userId ? { ...u, role: nuevoRol } : u
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
      // 1. Crear usuario en Supabase Auth
      const { data, error } = await auth.signUp(nuevoEmail, nuevoPassword)
      if (error) throw error

      if (!data.user) throw new Error('No se pudo crear el usuario')

      // 2. Insertar rol en user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: data.user.id,
          email: nuevoEmail,
          role: nuevoRol
        })

      if (roleError) throw roleError

      setMensaje({ tipo: 'success', texto: `Usuario ${nuevoEmail} creado con rol ${nuevoRol}` })
      setNuevoEmail('')
      setNuevoPassword('')
      setNuevoRol('compras')
      cargarUsuarios()
    } catch (e) {
      const msg = e.message === 'User already registered'
        ? 'Este email ya esta registrado'
        : e.message
      setMensaje({ tipo: 'error', texto: msg })
    }
    setCreando(false)
    setTimeout(() => setMensaje(null), 5000)
  }

  const eliminarUsuario = async (userId, email) => {
    if (!confirm(`¿Eliminar completamente al usuario ${email}? Se eliminará la cuenta y su rol.`)) return

    try {
      const { error } = await supabase.rpc('delete_user', { target_user_id: userId })

      if (error) throw error
      setUsuarios(prev => prev.filter(u => u.user_id !== userId))
      setMensaje({ tipo: 'success', texto: `Usuario ${email} eliminado completamente` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + e.message })
    }
    setTimeout(() => setMensaje(null), 3000)
  }

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
          <div className="grid md:grid-cols-4 gap-3 items-end">
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
              <label className="block text-xs text-gray-500 mb-1">Contrasena temporal</label>
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
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="direccion">Direccion</option>
                <option value="compras">Compras</option>
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
          <span className="text-white/70 text-sm">{usuarios.length} usuarios</span>
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
                  <th className="p-3 text-left">Rol</th>
                  <th className="p-3 text-left">Fecha alta</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.user_id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{u.email || u.user_id.substring(0, 8) + '...'}</td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        onChange={(e) => cambiarRol(u.user_id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium border
                          ${u.role === 'direccion'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'}`}
                      >
                        <option value="direccion">Direccion</option>
                        <option value="compras">Compras</option>
                      </select>
                    </td>
                    <td className="p-3 text-gray-500">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => eliminarUsuario(u.user_id, u.email)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar rol"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
