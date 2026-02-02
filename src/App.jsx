// ============================================
// APP - Componente principal FMV Dashboard v2.0
// ============================================

import React, { useState, useEffect } from 'react'
import { useData } from './context/DataContext'
import { auth } from './lib/supabase'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import PyGTab from './components/PyG/PyGTab'
import ServiciosTab from './components/ServiciosExt/ServiciosTab'
import FinanciacionTab from './components/Financiacion/FinanciacionTab'
import ProveedoresTab from './components/Proveedores/ProveedoresTab'
import CashFlowTab from './components/CashFlow/CashFlowTab'
import PresupuestoTab from './components/Presupuesto/PresupuestoTab'
import PresupuestoComprasTab from './components/PresupuestoCompras/PresupuestoComprasTab'
import GestionUsuarios from './components/Admin/GestionUsuarios'
import UploadTab from './components/Upload/UploadTab'
import LoginScreen from './components/Auth/LoginScreen'

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error capturado:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 rounded-lg m-4">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error en la aplicacion</h2>
          <pre className="text-sm text-red-600 bg-red-100 p-4 rounded overflow-auto">
            {this.state.error?.message || 'Error desconocido'}
          </pre>
          <button
            onClick={() => {
              localStorage.removeItem('fmv-dashboard-data')
              window.location.reload()
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Limpiar datos y recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const { tabActiva, movimientos, loading, loadingMessage } = useData()
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Verificar sesion al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { session } = await auth.getSession()
        setUser(session?.user || null)
      } catch (error) {
        console.error('Error checking session:', error)
        setUser(null)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkSession()

    // Escuchar cambios de autenticacion
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      setUser(session?.user || null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Funcion de logout (exportada via contexto si es necesario)
  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
  }

  // Pantalla de carga inicial
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl mb-4 shadow-lg animate-pulse">
            <span className="text-2xl font-bold text-white tracking-tight">FMV</span>
          </div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no esta autenticado, mostrar login
  if (!user) {
    return <LoginScreen onLogin={(u) => setUser(u)} />
  }

  // Renderizar pestana activa
  const renderTab = () => {
    // Si no hay datos, mostrar siempre la pestana de carga
    if (movimientos.length === 0 && tabActiva !== 'cargar') {
      return <UploadTab />
    }

    switch (tabActiva) {
      case 'pyg':
        return <PyGTab />
      case 'servicios':
        return <ServiciosTab />
      case 'financiacion':
        return <FinanciacionTab />
      case 'proveedores':
        return <ProveedoresTab />
      case 'cashflow':
        return <CashFlowTab />
      case 'presupuesto':
        return <PresupuestoTab />
      case 'presupuestoCompras':
        return <PresupuestoComprasTab />
      case 'cargar':
        return <UploadTab />
      case 'usuarios':
        return <GestionUsuarios />
      default:
        return <PyGTab />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center shadow-2xl min-w-[280px]">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p className="font-medium text-gray-700">
              {loadingMessage || 'Procesando...'}
            </p>
          </div>
        </div>
      )}

      {/* Header con navegacion */}
      <Header user={user} onLogout={handleLogout} />

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <ErrorBoundary>
          {renderTab()}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default App
