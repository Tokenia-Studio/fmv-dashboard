// ============================================
// APP - Componente principal FMV Dashboard v2.0
// ============================================

import React, { useState } from 'react'
import { useData } from './context/DataContext'
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import PyGTab from './components/PyG/PyGTab'
import ServiciosTab from './components/ServiciosExt/ServiciosTab'
import FinanciacionTab from './components/Financiacion/FinanciacionTab'
import ProveedoresTab from './components/Proveedores/ProveedoresTab'
import CashFlowTab from './components/CashFlow/CashFlowTab'
import UploadTab from './components/Upload/UploadTab'
import LoginScreen, { useAuth } from './components/Auth/LoginScreen'

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
          <h2 className="text-xl font-bold text-red-700 mb-2">Error en la aplicación</h2>
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
  const { tabActiva, movimientos, loading } = useData()
  const { isAuthenticated } = useAuth()
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  // Si no está autenticado, mostrar login
  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />
  }

  // Renderizar pestaña activa
  const renderTab = () => {
    // Si no hay datos, mostrar siempre la pestaña de carga
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
      case 'cargar':
        return <UploadTab />
      default:
        return <PyGTab />
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
            <div className="text-4xl mb-4 animate-spin">⚙️</div>
            <p className="font-medium text-gray-700">Procesando...</p>
          </div>
        </div>
      )}

      {/* Header con navegación */}
      <Header />

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
