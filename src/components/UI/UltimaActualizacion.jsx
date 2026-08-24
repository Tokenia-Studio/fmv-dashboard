import { CalendarClock } from 'lucide-react'
import { useData } from '../../context/DataContext'

// Fecha de la última subida de datos (máximo fecha_carga de archivos_cargados,
// el mismo dato que muestra Cargar Datos por año). Dos presentaciones:
// - variant="sidebar": bloque fijo al pie del menú lateral (rol direccion)
// - variant="flotante": etiqueta anclada abajo a la derecha (rol compras, sin sidebar)
export default function UltimaActualizacion({ variant = 'flotante', collapsed = false }) {
  const { archivosCargados } = useData()

  const fechas = Object.values(archivosCargados || {})
    .map(a => (a?.fecha ? new Date(a.fecha).getTime() : NaN))
    .filter(t => !isNaN(t))

  if (fechas.length === 0) return null

  const ultima = new Date(Math.max(...fechas))
  const fechaTexto = ultima.toLocaleDateString('es-ES')
  const horaTexto = ultima.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const titulo = `Última actualización de datos: ${fechaTexto}, ${horaTexto}`

  if (variant === 'sidebar') {
    return (
      <div
        className={`border-t border-fmv-800 px-3 py-3 text-gray-300 ${collapsed ? 'text-center' : ''}`}
        title={titulo}
      >
        {collapsed ? (
          <CalendarClock size={17} className="inline-block text-gray-400" />
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5">
              Datos actualizados
            </div>
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              <CalendarClock size={15} className="text-gray-400" />
              {fechaTexto} <span className="text-gray-400 font-normal">{horaTexto}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full
                 bg-fmv-900 text-white text-sm shadow-lg print:hidden"
      title={titulo}
    >
      <CalendarClock size={15} className="text-gray-400" />
      <span className="text-gray-300">Datos actualizados:</span>
      <span className="font-semibold">{fechaTexto}</span>
      <span className="text-gray-400">{horaTexto}</span>
    </div>
  )
}
