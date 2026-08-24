import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import { TABS, NAVIGATION_SECTIONS, TABS_POR_ROL } from '../../utils/constants'
import { TAB_ICONS, SECTION_ICONS } from '../../utils/tabIcons'
import UltimaActualizacion from '../UI/UltimaActualizacion'

export default function Sidebar({ collapsed, onToggle }) {
  const { tabActiva, setTab, userRole } = useData()
  const [expandedSections, setExpandedSections] = useState({
    finanzas: true,
    produccion: true,
    admin: true
  })

  const allowedTabs = TABS_POR_ROL[userRole] || TABS_POR_ROL.direccion
  const tabsMap = Object.fromEntries(TABS.map(t => [t.id, t]))

  const toggleSection = (section) => {
    if (collapsed) return
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-fmv-900 text-white z-40 print:hidden
          transition-all duration-300 flex flex-col
          ${collapsed ? 'w-16' : 'w-60'}
          ${collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}
        style={{ top: 0 }}
      >
        {/* Logo FMV a todo el ancho + toggle debajo */}
        <div className="border-b border-fmv-800">
          <div className={`${collapsed ? 'px-2 pt-3' : 'px-3 pt-4'}`}>
            <img
              src={collapsed ? '/logo-fmv-icono.png' : '/logo-fmv-blanco.png'}
              alt="Fabricaciones Metálicas Valdepinto"
              className="w-full h-auto object-contain"
            />
          </div>
          <button
            onClick={onToggle}
            className={`flex items-center py-1.5 mt-2 w-full text-gray-400 hover:text-white hover:bg-fmv-800/50 transition-colors text-sm
              ${collapsed ? 'justify-center' : 'justify-end pr-3'}`}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? '»' : '«'}
          </button>
        </div>

        {/* Navigation sections */}
        <nav className="flex-1 overflow-y-auto py-2">
          {Object.entries(NAVIGATION_SECTIONS).map(([key, section]) => {
            const sectionTabs = section.tabs.filter(t => allowedTabs.includes(t))
            if (sectionTabs.length === 0) return null

            const isExpanded = expandedSections[key]

            return (
              <div key={key} className="mb-1">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(key)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider
                    text-gray-400 hover:text-gray-200 transition-colors
                    ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? section.label : ''}
                >
                  {(() => {
                    const SectionIcon = SECTION_ICONS[key]
                    return SectionIcon
                      ? <SectionIcon size={16} className="shrink-0" />
                      : <span className="text-base">{section.icon}</span>
                  })()}
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{section.label}</span>
                      <span className="text-[10px]">{isExpanded ? '▾' : '▸'}</span>
                    </>
                  )}
                </button>

                {/* Section items */}
                {(isExpanded || collapsed) && section.disabled ? (
                  !collapsed && (
                    <div className="pl-8 pr-4 py-2 text-xs text-gray-500 italic">
                      En desarrollo
                    </div>
                  )
                ) : (isExpanded || collapsed) && sectionTabs.map(tabId => {
                  const tab = tabsMap[tabId]
                  if (!tab) return null
                  const active = tabActiva === tabId

                  return (
                    <button
                      key={tabId}
                      onClick={() => setTab(tabId)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all
                        ${collapsed ? 'justify-center' : 'pl-8'}
                        ${active
                          ? 'bg-fmv-800 text-white border-l-3 border-white font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-fmv-800/50'}`}
                      title={collapsed ? tab.label : ''}
                    >
                      {(() => {
                        const TabIcon = TAB_ICONS[tabId]
                        return TabIcon
                          ? <TabIcon size={17} className="shrink-0" />
                          : <span className="text-base">{tab.icon}</span>
                      })()}
                      {!collapsed && <span>{tab.label}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Última actualización de datos, fija al pie del menú */}
        <UltimaActualizacion variant="sidebar" collapsed={collapsed} />
      </aside>
    </>
  )
}
