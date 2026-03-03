// ============================================
// MAIN - Punto de entrada FMV Dashboard v2.0
// ============================================

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DataProvider } from './context/DataContext'
import { ProduccionProvider } from './context/ProduccionContext'
import { PlanificacionProvider } from './context/PlanificacionContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <ProduccionProvider>
        <PlanificacionProvider>
          <App />
        </PlanificacionProvider>
      </ProduccionProvider>
    </DataProvider>
  </React.StrictMode>
)
