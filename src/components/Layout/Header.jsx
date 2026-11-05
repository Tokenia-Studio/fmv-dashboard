// ============================================
// HEADER - Cabecera del dashboard
// ============================================

import React, { useState } from 'react'
import { Menu, RefreshCw, LogOut, HelpCircle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { TABS, TABS_POR_ROL } from '../../utils/constants'
import { TAB_ICONS } from '../../utils/tabIcons'
import HelpModal from '../UI/HelpModal'

export default function Header({ user, onLogout, onToggleSidebar }) {
  const { tabActiva, setTab, años, añoActual, setAño, validacion, userRole, cargarDatosDesdeSupabase, loading } = useData()
  const [showHelp, setShowHelp] = useState(false)

  const getEstadoCuadre = () => {
    if (!validacion) return { Icon: Clock, color: 'gray', text: 'Sin datos' }
    if (validacion.cuadrado) return { Icon: CheckCircle2, color: 'green', text: 'Cuadrado' }
    return { Icon: XCircle, color: 'red', text: 'Descuadre' }
  }

  const estado = getEstadoCuadre()
  const showHorizontalTabs = userRole !== 'direccion'

  return (
    <header className="sticky top-0 z-50 shadow-md bg-fmv-900 print:hidden">
      <div className="max-w-7xl mx-auto px-4 py-3 max-lg:pt-[max(0.75rem,env(safe-area-inset-top))] max-lg:pl-[max(1rem,env(safe-area-inset-left))] max-lg:pr-[max(1rem,env(safe-area-inset-right))]">
        {/* Fila superior */}
        <div className="flex items-center justify-between flex-wrap gap-3 max-lg:gap-2">
          {/* Título */}
          <div className="flex items-center gap-4 max-lg:gap-3 max-lg:min-w-0">
            {/* Sidebar toggle (solo direccion) */}
            {userRole === 'direccion' && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="w-10 h-10 max-lg:w-11 max-lg:h-11 max-lg:shrink-0 rounded-lg bg-fmv-800 hover:bg-fmv-700 flex items-center justify-center text-white transition-colors lg:hidden"
                title="Menu"
              >
                <Menu size={20} />
              </button>
            )}
            <h1 className="text-2xl max-lg:text-lg max-lg:truncate font-bold text-white tracking-tight">
              Dashboard Financiero
            </h1>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3 max-lg:gap-1.5 max-lg:flex-wrap max-lg:w-full">
            {/* Estado de cuadre */}
            <div className={`px-3 py-1.5 max-lg:px-2.5 max-lg:min-h-[44px] rounded-full text-sm max-lg:text-xs font-medium flex items-center gap-1.5
                            ${estado.color === 'green' ? 'bg-green-100 text-green-700' :
                              estado.color === 'red' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}`}>
              <estado.Icon size={15} />
              <span>{estado.text}</span>
            </div>

            {/* Botón actualizar datos */}
            <button
              onClick={cargarDatosDesdeSupabase}
              disabled={loading}
              className="px-3 py-1.5 max-lg:min-h-[44px] max-lg:min-w-[44px] max-lg:justify-center rounded-full text-sm font-medium flex items-center gap-1.5
                         bg-fmv-600 text-white hover:bg-fmv-500 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
              title="Actualizar datos"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span className="max-lg:sr-only">{loading ? 'Cargando...' : 'Actualizar'}</span>
            </button>

            {/* Selector de año */}
            {años.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 max-lg:sr-only">Año:</span>
                <select
                  value={añoActual}
                  onChange={(e) => {
                    const nuevoAño = parseInt(e.target.value)
                    if (!isNaN(nuevoAño)) {
                      setAño(nuevoAño)
                    }
                  }}
                  className="px-3 py-1.5 max-lg:px-2 rounded-lg bg-white text-fmv-800 font-medium text-sm
                             border-0 focus:ring-2 focus:ring-fmv-500 cursor-pointer"
                >
                  {años.map(año => (
                    <option key={año} value={año}>{año}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Botón de ayuda */}
            <button
              onClick={() => setShowHelp(true)}
              className="text-gray-400 hover:text-white transition-colors max-lg:w-11 max-lg:h-11 max-lg:flex max-lg:items-center max-lg:justify-center max-lg:ml-auto"
              title="Ayuda sobre esta pestaña"
            >
              <HelpCircle size={19} />
            </button>

            {/* Usuario y cerrar sesión */}
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="text-gray-400 hover:text-white transition-colors max-lg:w-11 max-lg:h-11 max-lg:flex max-lg:items-center max-lg:justify-center"
                  title="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de navegación - solo para roles sin sidebar */}
        {showHorizontalTabs && (
          <nav className="flex gap-1 mt-4 -mb-px overflow-x-auto max-lg:mt-3 max-lg:[scrollbar-width:none]">
            {TABS.filter(tab => {
              const allowedTabs = TABS_POR_ROL[userRole] || TABS_POR_ROL.direccion
              return allowedTabs.includes(tab.id)
            }).map(tab => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-2 max-lg:min-h-[44px] rounded-t-lg font-medium text-sm whitespace-nowrap
                           transition-all duration-200 flex items-center gap-1.5
                           ${tabActiva === tab.id ? 'tab-active' : 'tab-inactive'}`}
              >
                {(() => {
                  const TabIcon = TAB_ICONS[tab.id]
                  return TabIcon
                    ? <TabIcon size={15} className="shrink-0" />
                    : <span>{tab.icon}</span>
                })()}
                {tab.label}
              </button>
            ))}
          </nav>
        )}
      </div>
      {/* Modal de ayuda */}
      {showHelp && (
        <HelpModal tabActiva={tabActiva} onClose={() => setShowHelp(false)} />
      )}
    </header>
  )
}
