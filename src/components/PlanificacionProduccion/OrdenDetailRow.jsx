import React from 'react'
import { getDemoSemaforo, getDemoProgress } from '../../utils/planificacionCalculations'

const SEMAFORO_COLORS = {
  green: { bg: 'bg-green-100', bar: 'bg-green-500', border: 'border-green-400' },
  yellow: { bg: 'bg-yellow-100', bar: 'bg-yellow-500', border: 'border-yellow-400' },
  red: { bg: 'bg-red-100', bar: 'bg-red-500', border: 'border-red-400' },
}

export default function OrdenDetailRow({ orden }) {
  const semaforo = getDemoSemaforo(orden.id)
  const colors = SEMAFORO_COLORS[semaforo]

  return (
    <tr>
      <td colSpan={8} className="p-0">
        <div className={`mx-2 mb-2 rounded-lg border-l-4 ${colors.border} bg-gray-50 p-4`}>
          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
            <span><strong>Cod. Procedencia:</strong> {orden.codProcedencia || '-'}</span>
            <span><strong>Estado:</strong> {orden.estado || '-'}</span>
            <span><strong>Op. Actual:</strong> {orden.currentOpNo} - {orden.currentOpDesc || '-'}</span>
            {orden.tiempoTeoricoTotal > 0 && (
              <span><strong>Tiempo teórico total:</strong> {orden.tiempoTeoricoTotal} min</span>
            )}
            {orden.planoServidor && (
              <span className="text-blue-600">
                <strong>Ruta servidor:</strong> <span className="font-mono text-[10px]">{orden.planoServidor}</span>
              </span>
            )}
          </div>

          {/* Rutas/Operaciones */}
          {orden.rutas.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-200">
                  <th className="py-1 text-left font-medium w-16">N.Op</th>
                  <th className="py-1 text-left font-medium">Descripción</th>
                  <th className="py-1 text-left font-medium w-20">Centro</th>
                  <th className="py-1 text-right font-medium w-16">T.Prep</th>
                  <th className="py-1 text-right font-medium w-16">T.Ejec</th>
                  <th className="py-1 text-center font-medium w-16">Fin</th>
                  <th className="py-1 text-left font-medium w-32">
                    Progreso <span className="text-[10px] text-gray-300">FASE 2</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orden.rutas.map((ruta, i) => {
                  const progress = getDemoProgress(orden.id, ruta.numOperacion)
                  return (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 font-mono text-gray-600">{ruta.numOperacion}</td>
                      <td className="py-1.5 text-gray-700">{ruta.descripcion}</td>
                      <td className="py-1.5 font-mono text-gray-500">{ruta.centroTrabajo}</td>
                      <td className="py-1.5 text-right text-gray-500">{ruta.tiempoPrep || '-'}</td>
                      <td className="py-1.5 text-right text-gray-500">{ruta.tiempoEjec || '-'}</td>
                      <td className="py-1.5 text-center">
                        {ruta.finalizada
                          ? <span className="text-green-600 font-bold">Si</span>
                          : <span className="text-gray-400">No</span>
                        }
                      </td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors.bar}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 w-8 text-right">{progress}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400 italic">Sin operaciones de ruta asociadas</p>
          )}
        </div>
      </td>
    </tr>
  )
}
