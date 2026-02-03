// ============================================
// LOGIN SCREEN - Autenticacion con Supabase
// Maneja: login, registro, invitación, reset password
// ============================================

import React, { useState, useEffect } from 'react'
import { auth, supabase } from '../../lib/supabase'

export default function LoginScreen({ onLogin, forceMode }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Modos: 'login', 'register', 'setPassword', 'forgotPassword'
  const [mode, setMode] = useState(forceMode || 'login')
  const [checkingToken, setCheckingToken] = useState(!forceMode)

  // Detectar tokens de invitación o recovery en la URL
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Obtener hash de la URL
        const hash = window.location.hash

        if (hash && hash.includes('access_token')) {
          // Hay un token en la URL (invitación o recovery)
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          const type = params.get('type')

          if (accessToken && refreshToken) {
            // Establecer la sesión con los tokens
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (error) {
              console.error('Error setting session:', error)
              setError('El enlace ha expirado o es inválido. Solicita uno nuevo.')
              setMode('login')
            } else if (data.user) {
              // Usuario autenticado, mostrar formulario para establecer contraseña
              setEmail(data.user.email || '')
              setMode('setPassword')
              // Limpiar la URL
              window.history.replaceState(null, '', window.location.pathname)
            }
          }
        } else if (hash && hash.includes('error')) {
          // Hay un error en la URL
          const params = new URLSearchParams(hash.substring(1))
          const errorDesc = params.get('error_description')
          setError(errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : 'Error de autenticación')
          window.history.replaceState(null, '', window.location.pathname)
        }
      } catch (err) {
        console.error('Auth callback error:', err)
      } finally {
        setCheckingToken(false)
      }
    }

    handleAuthCallback()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        const { data, error } = await auth.signIn(email, password)
        if (error) throw error
        if (data.user) onLogin(data.user)

      } else if (mode === 'register') {
        const { data, error } = await auth.signUp(email, password)
        if (error) throw error
        if (data.user) {
          setSuccess('Usuario creado. Ya puedes iniciar sesión.')
          setMode('login')
          setPassword('')
        }

      } else if (mode === 'setPassword') {
        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden')
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres')
        }

        const { data, error } = await auth.updatePassword(password)
        if (error) throw error

        // Contraseña establecida, hacer login automático
        if (data.user) {
          setSuccess('Contraseña establecida correctamente')
          onLogin(data.user)
        }

      } else if (mode === 'forgotPassword') {
        const { error } = await auth.resetPassword(email)
        if (error) throw error
        setSuccess('Te hemos enviado un email para restablecer tu contraseña')
        setMode('login')
      }

    } catch (err) {
      console.error('Auth error:', err)
      setError(getErrorMessage(err.message))
    } finally {
      setLoading(false)
    }
  }

  const getErrorMessage = (msg) => {
    const messages = {
      'Invalid login credentials': 'Email o contraseña incorrectos',
      'Email not confirmed': 'Confirma tu email antes de acceder',
      'User already registered': 'Este email ya está registrado',
      'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
      'Unable to validate email address: invalid format': 'Formato de email inválido',
      'New password should be different from the old password': 'La nueva contraseña debe ser diferente a la anterior',
      'Auth session missing': 'Sesión expirada. Solicita un nuevo enlace.',
      'Las contraseñas no coinciden': 'Las contraseñas no coinciden'
    }
    return messages[msg] || msg || 'Error de autenticación'
  }

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Iniciar sesión'
      case 'register': return 'Crear cuenta'
      case 'setPassword': return 'Establece tu contraseña'
      case 'forgotPassword': return 'Recuperar contraseña'
      default: return 'FMV Dashboard'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Introduce tus credenciales'
      case 'register': return 'Crea una nueva cuenta'
      case 'setPassword': return 'Crea una contraseña para tu cuenta'
      case 'forgotPassword': return 'Te enviaremos un email de recuperación'
      default: return ''
    }
  }

  const getButtonText = () => {
    if (loading) return 'Procesando...'
    switch (mode) {
      case 'login': return 'Acceder'
      case 'register': return 'Crear cuenta'
      case 'setPassword': return 'Guardar contraseña'
      case 'forgotPassword': return 'Enviar email'
      default: return 'Continuar'
    }
  }

  // Pantalla de carga mientras verifica token
  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl mb-4 shadow-lg animate-pulse">
            <span className="text-2xl font-bold text-white tracking-tight">FMV</span>
          </div>
          <p className="text-gray-400">Verificando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white tracking-tight">FMV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{getTitle()}</h1>
          <p className="text-gray-500 text-sm mt-1">{getSubtitle()}</p>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{success}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Email - solo en login, register y forgotPassword */}
          {(mode === 'login' || mode === 'register' || mode === 'forgotPassword') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="tu@email.com"
                autoFocus
                disabled={loading}
                required
              />
            </div>
          )}

          {/* Email solo lectura en setPassword */}
          {mode === 'setPassword' && email && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                disabled
              />
            </div>
          )}

          {/* Password - en login, register y setPassword */}
          {(mode === 'login' || mode === 'register' || mode === 'setPassword') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {mode === 'setPassword' ? 'Nueva contraseña' : 'Contraseña'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                             ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                  placeholder={mode === 'setPassword' ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  disabled={loading}
                  required
                  minLength={6}
                  autoFocus={mode === 'setPassword'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Confirmar Password - solo en setPassword */}
          {mode === 'setPassword' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all
                           ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                placeholder="Repite la contraseña"
                disabled={loading}
                required
                minLength={6}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (
              mode === 'forgotPassword' ? !email :
              mode === 'setPassword' ? (!password || !confirmPassword || password.length < 6) :
              (!email || !password)
            )}
            className={`w-full py-3 rounded-lg font-semibold text-white transition-all
                       ${loading || (
                         mode === 'forgotPassword' ? !email :
                         mode === 'setPassword' ? (!password || !confirmPassword || password.length < 6) :
                         (!email || !password)
                       )
                         ? 'bg-gray-300 cursor-not-allowed'
                         : 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-lg hover:shadow-xl'}`}
          >
            {getButtonText()}
          </button>
        </form>

        {/* Olvidé mi contraseña - solo en login */}
        {mode === 'login' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('forgotPassword')
                setError('')
                setSuccess('')
                setPassword('')
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {/* Toggle entre login y register */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setError('')
                setSuccess('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              {mode === 'login'
                ? '¿No tienes cuenta? Crear una'
                : '¿Ya tienes cuenta? Iniciar sesión'}
            </button>
          </div>
        )}

        {/* Volver al login - en forgotPassword */}
        {mode === 'forgotPassword' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setSuccess('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Fabricaciones Metálicas Valdepinto
        </p>
      </div>
    </div>
  )
}
