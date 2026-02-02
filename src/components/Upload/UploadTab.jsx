// ============================================
// UPLOAD TAB - Pestaña de carga de datos
// ============================================

import React, { useState, useCallback } from 'react'
import { useData } from '../../context/DataContext'
import { formatCurrency, formatDate } from '../../utils/formatters'

export default function UploadTab() {
  const {
    cargarDiario,
    cargarProveedores,
    cargarAlbaranes,
    cargarPedidos,
    borrarAlbaranes,
    borrarPedidos,
    limpiarDatos,
    movimientos,
    proveedores,
    albaranesFacturas,
    pedidosCompra,
    validacion,
    años,
    añoActual,
    archivosCargados,
    loading,
    userRole
  } = useData()

  const [dragActive, setDragActive] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [añoCompras, setAñoCompras] = useState(new Date().getFullYear())
  const [mesCompras, setMesCompras] = useState(new Date().getMonth() + 1)

  // Handlers de drag & drop
  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) await handleFile(file, 'diario')
  }, [])

  // Procesar archivo
  const handleFile = async (file, tipo) => {
    setMensaje({ tipo: 'loading', texto: 'Procesando archivo...' })

    if (tipo === 'diario') {
      const result = await cargarDiario(file)
      if (result.success) {
        setMensaje({
          tipo: 'success',
          texto: `Cargados ${result.movimientos.toLocaleString()} movimientos de ${result.años.join(', ')}`
        })
      } else {
        setMensaje({ tipo: 'error', texto: result.error })
      }
    } else {
      const result = await cargarProveedores(file)
      if (result.success) {
        setMensaje({
          tipo: 'success',
          texto: `Cargados ${result.count.toLocaleString()} proveedores/clientes`
        })
      } else {
        setMensaje({ tipo: 'error', texto: result.error })
      }
    }

    setTimeout(() => setMensaje(null), 5000)
  }

  const tieneDatos = movimientos.length > 0

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Mensaje de estado */}
      {mensaje && (
        <div className={`p-4 rounded-lg flex items-center gap-3
                        ${mensaje.tipo === 'success' ? 'bg-green-100 text-green-800' :
                          mensaje.tipo === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'}`}>
          <span className="text-xl">
            {mensaje.tipo === 'success' ? '✅' : mensaje.tipo === 'error' ? '❌' : '⏳'}
          </span>
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Carga de Diario */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>Cargar Diario Contable</span>
            </h3>
          </div>

          <div className="p-4">
            <div
              className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer
                         transition-all ${dragActive
                           ? 'border-blue-500 bg-blue-50'
                           : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('diario-input').click()}
            >
              <input
                id="diario-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0], 'diario')}
                className="hidden"
              />

              <div className="text-4xl mb-3">📁</div>
              <p className="font-medium text-gray-700 mb-1">
                Arrastra el diario aquí
              </p>
              <p className="text-sm text-gray-500">o haz click para seleccionar</p>
              <p className="text-xs text-gray-400 mt-2">Excel (.xlsx)</p>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p className="font-medium mb-1">Columnas requeridas:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Fecha registro</li>
                <li>Nº cuenta</li>
                <li>Importe debe / Importe haber</li>
                <li>Cód. procedencia mov. (opcional)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Carga de Proveedores */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>👥</span>
              <span>Cargar Maestro Proveedores</span>
            </h3>
          </div>

          <div className="p-4">
            <div
              className="p-8 border-2 border-dashed rounded-xl text-center cursor-pointer
                        border-gray-300 hover:border-purple-400 hover:bg-gray-50 transition-all"
              onClick={() => document.getElementById('proveedores-input').click()}
            >
              <input
                id="proveedores-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files[0] && handleFile(e.target.files[0], 'proveedores')}
                className="hidden"
              />

              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium text-gray-700 mb-1">
                Cargar lista de proveedores
              </p>
              <p className="text-sm text-gray-500">Click para seleccionar</p>
              <p className="text-xs text-gray-400 mt-2">Excel (.xlsx)</p>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              <p className="font-medium mb-1">Columnas requeridas:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Nº (código)</li>
                <li>Nombre</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Carga de ficheros Compras */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="font-bold text-white flex items-center gap-2">
            <span>&#128722;</span>
            <span>Cargar Ficheros Compras</span>
          </h3>
        </div>

        <div className="p-4">
          {/* Selector año/mes */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Año:</span>
              <select
                value={añoCompras}
                onChange={(e) => setAñoCompras(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-lg border text-sm"
              >
                {[2024, 2025, 2026, 2027].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Mes:</span>
              <select
                value={mesCompras}
                onChange={(e) => setMesCompras(parseInt(e.target.value))}
                className="px-3 py-1.5 rounded-lg border text-sm"
              >
                {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Albaranes y Facturas */}
            <div
              className="p-6 border-2 border-dashed rounded-xl text-center cursor-pointer
                        border-gray-300 hover:border-orange-400 hover:bg-gray-50 transition-all"
              onClick={() => document.getElementById('albaranes-input').click()}
            >
              <input
                id="albaranes-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  if (!e.target.files[0]) return
                  setMensaje({ tipo: 'loading', texto: 'Procesando albaranes...' })
                  const result = await cargarAlbaranes(e.target.files[0], añoCompras, mesCompras)
                  if (result.success) {
                    setMensaje({ tipo: 'success', texto: `Cargados ${result.count} albaranes pendientes` })
                  } else {
                    setMensaje({ tipo: 'error', texto: result.error })
                  }
                  setTimeout(() => setMensaje(null), 5000)
                }}
                className="hidden"
              />
              <div className="text-3xl mb-2">&#128230;</div>
              <p className="font-medium text-gray-700 text-sm">Albaranes y Facturas</p>
              <p className="text-xs text-gray-400 mt-1">Excel (.xlsx/.xls)</p>
            </div>

            {/* Pedidos de Compra */}
            <div
              className="p-6 border-2 border-dashed rounded-xl text-center cursor-pointer
                        border-gray-300 hover:border-teal-400 hover:bg-gray-50 transition-all"
              onClick={() => document.getElementById('pedidos-input').click()}
            >
              <input
                id="pedidos-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={async (e) => {
                  if (!e.target.files[0]) return
                  setMensaje({ tipo: 'loading', texto: 'Procesando pedidos...' })
                  const result = await cargarPedidos(e.target.files[0], añoCompras, mesCompras)
                  if (result.success) {
                    setMensaje({ tipo: 'success', texto: `Cargados ${result.count} pedidos de compra` })
                  } else {
                    setMensaje({ tipo: 'error', texto: result.error })
                  }
                  setTimeout(() => setMensaje(null), 5000)
                }}
                className="hidden"
              />
              <div className="text-3xl mb-2">&#128203;</div>
              <p className="font-medium text-gray-700 text-sm">Pedidos de Compra</p>
              <p className="text-xs text-gray-400 mt-1">Excel (.xlsx/.xls)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen Albaranes y Pedidos cargados */}
      {(albaranesFacturas.length > 0 || pedidosCompra.length > 0) && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>&#128722;</span>
              <span>Compras Cargadas</span>
            </h3>
          </div>
          <div className="p-4">
            {(() => {
              // Agrupar por año/mes
              const mesesAlb = {}
              albaranesFacturas.forEach(a => {
                const key = `${a.año}-${String(a.mes).padStart(2, '0')}`
                if (!mesesAlb[key]) mesesAlb[key] = { año: a.año, mes: a.mes, count: 0, total: 0 }
                mesesAlb[key].count++
                mesesAlb[key].total += Math.abs(a.importe || 0)
              })
              const mesesPed = {}
              pedidosCompra.forEach(p => {
                const key = `${p.año}-${String(p.mes).padStart(2, '0')}`
                if (!mesesPed[key]) mesesPed[key] = { año: p.año, mes: p.mes, count: 0, total: 0 }
                mesesPed[key].count++
                mesesPed[key].total += Math.abs(p.importe || 0)
              })
              const mesesNombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
              const allKeys = [...new Set([...Object.keys(mesesAlb), ...Object.keys(mesesPed)])].sort()

              return (
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="p-2 text-left">Período</th>
                      <th className="p-2 text-right">Albaranes</th>
                      <th className="p-2 text-right">Importe Alb.</th>
                      <th className="p-2 text-center"></th>
                      <th className="p-2 text-right">Pedidos</th>
                      <th className="p-2 text-right">Importe Ped.</th>
                      <th className="p-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allKeys.map(key => {
                      const alb = mesesAlb[key]
                      const ped = mesesPed[key]
                      const año = alb?.año || ped?.año
                      const mes = alb?.mes || ped?.mes
                      return (
                        <tr key={key} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{mesesNombres[mes - 1]} {año}</td>
                          <td className="p-2 text-right">{alb ? alb.count : '-'}</td>
                          <td className="p-2 text-right">{alb ? formatCurrency(alb.total) : '-'}</td>
                          <td className="p-2 text-center">
                            {alb && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Eliminar ${alb.count} albaranes de ${mesesNombres[mes - 1]} ${año}?`)) return
                                  const r = await borrarAlbaranes(año, mes)
                                  setMensaje(r.success
                                    ? { tipo: 'success', texto: `Albaranes de ${mesesNombres[mes - 1]} ${año} eliminados` }
                                    : { tipo: 'error', texto: r.error })
                                  setTimeout(() => setMensaje(null), 4000)
                                }}
                                className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded"
                              >
                                Borrar
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-right">{ped ? ped.count : '-'}</td>
                          <td className="p-2 text-right">{ped ? formatCurrency(ped.total) : '-'}</td>
                          <td className="p-2 text-center">
                            {ped && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`¿Eliminar ${ped.count} pedidos de ${mesesNombres[mes - 1]} ${año}?`)) return
                                  const r = await borrarPedidos(año, mes)
                                  setMensaje(r.success
                                    ? { tipo: 'success', texto: `Pedidos de ${mesesNombres[mes - 1]} ${año} eliminados` }
                                    : { tipo: 'error', texto: r.error })
                                  setTimeout(() => setMensaje(null), 4000)
                                }}
                                className="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 rounded"
                              >
                                Borrar
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </div>
      )}

      {/* Resumen de datos cargados */}
      {tieneDatos && (
        <div className="card overflow-hidden">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>📦</span>
              <span>Datos Cargados</span>
            </h3>
            <button
              onClick={() => {
                if (confirm('¿Eliminar TODOS los datos cargados?')) {
                  limpiarDatos()
                  setMensaje({ tipo: 'success', texto: 'Datos eliminados' })
                }
              }}
              className="px-3 py-1 text-sm bg-red-500/20 text-white rounded hover:bg-red-500/30"
            >
              🗑️ Eliminar datos
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Movimientos</p>
                <p className="text-xl font-bold text-gray-800">
                  {movimientos.length.toLocaleString()}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Años</p>
                <p className="text-xl font-bold text-gray-800">
                  {años.join(', ') || '-'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 uppercase">Proveedores</p>
                <p className="text-xl font-bold text-gray-800">
                  {Object.keys(proveedores).length.toLocaleString()}
                </p>
              </div>

              <div className={`rounded-lg p-3 ${validacion?.cuadrado ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="text-xs text-gray-500 uppercase">Estado</p>
                <p className={`text-xl font-bold ${validacion?.cuadrado ? 'text-green-700' : 'text-red-700'}`}>
                  {validacion?.cuadrado ? '✅ Cuadrado' : '❌ Descuadre'}
                </p>
                {!validacion?.cuadrado && (
                  <p className="text-xs text-red-600 mt-1">
                    Diferencia: {formatCurrency(validacion?.diferencia, 2)}
                  </p>
                )}
              </div>
            </div>

            {validacion && (
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Debe:</span>
                  <span className="ml-2 font-medium">{formatCurrency(validacion.totalDebe, 2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Haber:</span>
                  <span className="ml-2 font-medium">{formatCurrency(validacion.totalHaber, 2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archivos cargados por año */}
      {Object.keys(archivosCargados || {}).length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>📅</span>
              <span>Archivos por Año</span>
            </h3>
          </div>

          <div className="p-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(archivosCargados)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([año, info]) => (
                  <div
                    key={año}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl font-bold text-blue-800">{año}</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        ✓ Cargado
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Archivo:</span>
                        <span className="font-medium text-gray-700 truncate max-w-[150px]" title={info.nombre}>
                          {info.nombre}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Movimientos:</span>
                        <span className="font-medium text-gray-700">
                          {info.movimientos?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Debe:</span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(info.totalDebe, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Haber:</span>
                        <span className="font-medium text-gray-700">
                          {formatCurrency(info.totalHaber, 0)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-blue-100 text-xs text-gray-400">
                        Cargado: {info.fecha ? new Date(info.fecha).toLocaleString('es-ES') : '-'}
                      </div>
                    </div>
                  </div>
                ))}

              {/* Placeholder para años futuros */}
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[180px]">
                <span className="text-3xl text-gray-300 mb-2">+</span>
                <p className="text-sm text-gray-400 text-center">
                  Carga más años<br />
                  para comparar
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instrucciones */}
      {!tieneDatos && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span>📖</span>
            Instrucciones
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Exporta el <strong>diario contable</strong> desde tu ERP en formato Excel</li>
            <li>Arrastra o selecciona el archivo en el área de carga</li>
            <li>Opcionalmente, carga el <strong>maestro de proveedores</strong> para ver nombres</li>
            <li>Navega por las pestañas para analizar los datos</li>
          </ol>
        </div>
      )}
    </div>
  )
}
