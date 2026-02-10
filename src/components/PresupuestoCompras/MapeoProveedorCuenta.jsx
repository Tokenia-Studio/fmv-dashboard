// ============================================
// MAPEO PROVEEDOR -> CUENTA - Asignación inteligente
// ============================================

import React, { useState, useMemo } from 'react'
import { useData } from '../../context/DataContext'
import { calcularMapeoProveedorCuenta } from '../../utils/calculations'

export default function MapeoProveedorCuenta({ onClose }) {
  const {
    movimientos, proveedores, proveedoresCuentas,
    añoActual, guardarMapeoProveedorCuenta
  } = useData()

  const [mapeoCalculado, setMapeoCalculado] = useState(null)
  const [cuentasEditadas, setCuentasEditadas] = useState({}) // {codigo: cuenta}
  const [filtro, setFiltro] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const handleCalcular = () => {
    setMensaje(null)
    const resultado = calcularMapeoProveedorCuenta(movimientos, proveedores, añoActual)
    setMapeoCalculado(resultado)

    // Inicializar cuentas editadas con las ya guardadas
    const iniciales = {}
    resultado.forEach(r => {
      if (proveedoresCuentas[r.codigo]) {
        iniciales[r.codigo] = proveedoresCuentas[r.codigo]
      }
    })
    setCuentasEditadas(iniciales)
  }

  const handleCuentaChange = (codigo, value) => {
    setCuentasEditadas(prev => ({ ...prev, [codigo]: value }))
  }

  const handleAceptarSugerencia = (codigo, cuentaSugerida) => {
    setCuentasEditadas(prev => ({ ...prev, [codigo]: cuentaSugerida }))
  }

  const handleAceptarTodas = () => {
    if (!mapeoCalculado) return
    const nuevas = { ...cuentasEditadas }
    mapeoCalculado.forEach(r => {
      if (!nuevas[r.codigo]) {
        nuevas[r.codigo] = r.cuentaSugerida
      }
    })
    setCuentasEditadas(nuevas)
  }

  const handleGuardar = async () => {
    // Solo guardar las que tienen cuenta asignada
    const paraGuardar = {}
    Object.entries(cuentasEditadas).forEach(([codigo, cuenta]) => {
      if (cuenta && cuenta.trim()) {
        paraGuardar[codigo] = cuenta.trim()
      }
    })

    if (Object.keys(paraGuardar).length === 0) {
      setMensaje({ tipo: 'error', texto: 'No hay cuentas para guardar' })
      return
    }

    setGuardando(true)
    setMensaje(null)
    try {
      await guardarMapeoProveedorCuenta(paraGuardar)
      setMensaje({ tipo: 'success', texto: `Guardadas ${Object.keys(paraGuardar).length} cuentas habituales` })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message })
    }
    setGuardando(false)
  }

  const filasFiltradas = useMemo(() => {
    if (!mapeoCalculado) return []
    if (!filtro.trim()) return mapeoCalculado
    const f = filtro.toLowerCase()
    return mapeoCalculado.filter(r =>
      r.codigo.toLowerCase().includes(f) ||
      r.nombre.toLowerCase().includes(f) ||
      r.cuentaSugerida.includes(f)
    )
  }, [mapeoCalculado, filtro])

  const numAsignadas = Object.values(cuentasEditadas).filter(v => v && v.trim()).length

  const formatImporte = (num) =>
    Math.round(num).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const colorConfianza = (conf) => {
    if (conf >= 80) return 'text-green-700 bg-green-100'
    if (conf >= 50) return 'text-yellow-700 bg-yellow-100'
    return 'text-red-700 bg-red-100'
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span>&#128279;</span>
          <span>Mapeo Cuenta Pedidos</span>
        </h3>
        <div className="flex gap-2">
          {mapeoCalculado && (
            <>
              <button
                onClick={handleAceptarTodas}
                className="px-3 py-1 text-sm bg-blue-500/80 text-white rounded hover:bg-blue-500"
              >
                Aceptar todas
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="px-3 py-1 text-sm bg-green-500/80 text-white rounded hover:bg-green-500 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : `Guardar (${numAsignadas})`}
              </button>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="px-3 py-1 text-sm bg-white/20 text-white rounded hover:bg-white/30">
              Cerrar
            </button>
          )}
        </div>
      </div>

      {mensaje && (
        <div className={`p-3 text-sm ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      {!mapeoCalculado ? (
        <div className="p-8 text-center">
          <p className="text-gray-500 mb-4">
            Analiza el diario contable de {añoActual} para sugerir la cuenta de gasto habitual de cada proveedor.
          </p>
          <button
            onClick={handleCalcular}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Calcular desde Diario
          </button>
        </div>
      ) : (
        <>
          <div className="p-3 border-b bg-gray-50 flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm w-64"
            />
            <span className="text-xs text-gray-500">
              {filasFiltradas.length} de {mapeoCalculado.length} proveedores
            </span>
            <button
              onClick={handleCalcular}
              className="ml-auto px-3 py-1 text-xs bg-slate-200 hover:bg-slate-300 rounded"
            >
              Recalcular
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="table-header sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left">Proveedor</th>
                  <th className="p-2 text-left">Cuenta Sugerida</th>
                  <th className="p-2 text-left">Grupo</th>
                  <th className="p-2 text-center">Confianza</th>
                  <th className="p-2 text-right">Importe</th>
                  <th className="p-2 text-center">Movs</th>
                  <th className="p-2 text-left">Cuenta Asignada</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.map(fila => {
                  const cuentaActual = cuentasEditadas[fila.codigo] || ''
                  const tieneGuardada = !!proveedoresCuentas[fila.codigo]

                  return (
                    <tr key={fila.codigo} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="font-medium text-gray-800">{fila.nombre}</div>
                        <div className="text-xs text-gray-400 font-mono">{fila.codigo}</div>
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => handleAceptarSugerencia(fila.codigo, fila.cuentaSugerida)}
                          className="font-mono text-xs px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded cursor-pointer"
                          title="Clic para aceptar sugerencia"
                        >
                          {fila.cuentaSugerida}
                        </button>
                      </td>
                      <td className="p-2 text-xs text-gray-600">{fila.nombreCuenta3}</td>
                      <td className="p-2 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorConfianza(fila.confianza)}`}>
                          {fila.confianza}%
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono text-xs">{formatImporte(fila.totalDebe)}</td>
                      <td className="p-2 text-center text-xs text-gray-500">{fila.numMovimientos}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={cuentaActual}
                            onChange={(e) => handleCuentaChange(fila.codigo, e.target.value)}
                            className={`w-full px-2 py-1 border rounded text-sm font-mono ${tieneGuardada && !cuentaActual ? 'border-green-300 bg-green-50' : ''}`}
                            placeholder={tieneGuardada ? proveedoresCuentas[fila.codigo] : 'Sin asignar'}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
