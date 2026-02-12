// ============================================
// APP - Componente principal FMV Dashboard v2.0
// ============================================

import React, { useState, useEffect } from 'react'
import { useData } from './context/DataContext'
import { auth } from './lib/supabase'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import Sidebar from './components/Layout/Sidebar'
import PyGTab from './components/PyG/PyGTab'
import ServiciosTab from './components/ServiciosExt/ServiciosTab'
import FinanciacionTab from './components/Financiacion/FinanciacionTab'
import ProveedoresTab from './components/Proveedores/ProveedoresTab'
import CashFlowTab from './components/CashFlow/CashFlowTab'
import PresupuestoTab from './components/Presupuesto/PresupuestoTab'
import PresupuestoComprasTab from './components/PresupuestoCompras/PresupuestoComprasTab'
import SeguimientoEstructurasTab from './components/SeguimientoEstructuras/SeguimientoEstructurasTab'
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
  const { tabActiva, movimientos, loading, loadingMessage, userRole } = useData()
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [forcePasswordReset, setForcePasswordReset] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Verificar sesión al cargar
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

    // Escuchar cambios de autenticación
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event)
      if (event === 'PASSWORD_RECOVERY') {
        setForcePasswordReset(true)
        return
      }
      setUser(session?.user || null)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Auto-expand sidebar on large screens for direccion
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && userRole === 'direccion') {
        setSidebarCollapsed(false)
      } else if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [userRole])

  const handleLogout = async () => {
    await auth.signOut()
    setUser(null)
  }

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed)

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

  // Si no esta autenticado o forzar cambio de contraseña, mostrar login
  if (!user || forcePasswordReset) {
    return <LoginScreen onLogin={(u) => { setForcePasswordReset(false); setUser(u) }} forceMode={forcePasswordReset ? 'setPassword' : null} />
  }

  // Renderizar pestaña activa
  const renderTab = () => {
    // Si no hay datos financieros, mostrar carga (excepto seg. estructuras y usuarios)
    if (movimientos.length === 0 && tabActiva !== 'cargar' && tabActiva !== 'seguimientoEstructuras' && tabActiva !== 'usuarios') {
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
      case 'seguimientoEstructuras':
        return (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-5xl mb-4">🏗️</span>
            <h2 className="text-xl font-semibold text-gray-600 mb-2">Módulo en desarrollo</h2>
            <p className="text-sm">El seguimiento de estructuras estará disponible próximamente.</p>
          </div>
        )
      case 'cargar':
        return <UploadTab />
      case 'usuarios':
        return <GestionUsuarios />
      default:
        return <PyGTab />
    }
  }

  const useSidebar = userRole === 'direccion'

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
      <Header
        user={user}
        onLogout={handleLogout}
        onToggleSidebar={useSidebar ? toggleSidebar : undefined}
      />

      {/* Body: Sidebar + Main (direccion) or just Main (compras) */}
      {useSidebar ? (
        <div className="flex flex-1">
          <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
            <ErrorBoundary>
              {renderTab()}
            </ErrorBoundary>
          </main>
        </div>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <ErrorBoundary>
            {renderTab()}
          </ErrorBoundary>
        </main>
      )}

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default App
