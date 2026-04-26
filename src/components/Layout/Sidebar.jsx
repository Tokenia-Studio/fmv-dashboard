import React, { useState } from 'react'
import { useData } from '../../context/DataContext'
import { TABS, NAVIGATION_SECTIONS, TABS_POR_ROL } from '../../utils/constants'

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
        className={`fixed lg:sticky top-0 left-0 h-screen bg-slate-800 text-white z-40
          transition-all duration-300 flex flex-col
          ${collapsed ? 'w-16' : 'w-60'}
          ${collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}
        style={{ top: 0 }}
      >
        {/* Toggle button */}
        <div className="flex items-center justify-end p-3 border-b border-slate-700">
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-sm transition-colors"
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
                    text-slate-400 hover:text-slate-200 transition-colors
                    ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? section.label : ''}
                >
                  <span className="text-base">{section.icon}</span>
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
                    <div className="pl-8 pr-4 py-2 text-xs text-slate-500 italic">
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
                          ? 'bg-slate-700 text-white border-l-3 border-blue-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                      title={collapsed ? tab.label : ''}
                    >
                      <span className="text-base">{tab.icon}</span>
                      {!collapsed && <span>{tab.label}</span>}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
