// ============================================
// HEADER - Cabecera del dashboard
// ============================================

import React from 'react'
import { useData } from '../../context/DataContext'
import { TABS, TABS_POR_ROL, BRAND } from '../../utils/constants'

export default function Header({ user, onLogout }) {
  const { tabActiva, setTab, años, añoActual, setAño, validacion, userRole } = useData()

  const getEstadoCuadre = () => {
    if (!validacion) return { icon: '⏳', color: 'gray', text: 'Sin datos' }
    if (validacion.cuadrado) return { icon: '✅', color: 'green', text: 'Cuadrado' }
    return { icon: '❌', color: 'red', text: 'Descuadre' }
  }

  const estado = getEstadoCuadre()

  return (
    <header className="sticky top-0 z-50 shadow-lg bg-gradient-to-r from-slate-800 to-slate-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Fila superior */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Logo y título */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-xl font-bold text-slate-800">{BRAND.name}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {BRAND.fullName.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-300">Dashboard Financiero v2.0</p>
            </div>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3">
            {/* Estado de cuadre */}
            <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5
                            ${estado.color === 'green' ? 'bg-green-100 text-green-700' :
                              estado.color === 'red' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'}`}>
              <span>{estado.icon}</span>
              <span>{estado.text}</span>
            </div>

            {/* Selector de año */}
            {años.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300">Año:</span>
                <select
                  value={añoActual}
                  onChange={(e) => {
                    const nuevoAño = parseInt(e.target.value)
                    if (!isNaN(nuevoAño)) {
                      setAño(nuevoAño)
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white text-slate-800 font-medium text-sm
                             border-0 focus:ring-2 focus:ring-slate-400 cursor-pointer"
                >
                  {años.map(año => (
                    <option key={año} value={año}>{año}</option>
                  ))}
                </select>
                {años.length > 1 && (
                  <span className="text-xs text-green-300">
                    ({años.length} años)
                  </span>
                )}
              </div>
            )}

            {/* Usuario y cerrar sesión */}
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-300 hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm
                             transition-colors flex items-center gap-1.5"
                  title="Cerrar sesion"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de navegación */}
        <nav className="flex gap-1 mt-4 -mb-px overflow-x-auto">
          {TABS.filter(tab => {
            const allowedTabs = TABS_POR_ROL[userRole] || TABS_POR_ROL.direccion
            return allowedTabs.includes(tab.id)
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap
                         transition-all duration-200
                         ${tabActiva === tab.id ? 'tab-active' : 'tab-inactive'}`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
