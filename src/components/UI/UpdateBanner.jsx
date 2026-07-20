import { useEffect, useState } from 'react'

// Aviso de "hay una versión nueva" (mismo mecanismo que en FMV Producción):
// cada pocos minutos (y al volver a la pestaña) se pide /version.json — que cada
// build publica con su propio buildId — y se compara con el __BUILD_ID__ que este
// bundle lleva incrustado (vite.config). Si no coinciden, hay un deploy más nuevo
// que el que el usuario tiene abierto → botón flotante que recarga la app.
// Los assets van con hash, así que un reload normal ya baja la versión nueva.
const INTERVALO_MS = 5 * 60 * 1000

export default function UpdateBanner() {
  const [hayNueva, setHayNueva] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return // en dev no existe version.json
    let cancelado = false
    const comprobar = async () => {
      try {
        const r = await fetch('/version.json', { cache: 'no-store' })
        if (!r.ok) return
        const { buildId } = await r.json()
        if (!cancelado && buildId && buildId !== __BUILD_ID__) setHayNueva(true)
      } catch {
        // sin red o respuesta rara: silencio, se reintenta en el siguiente tick
      }
    }
    comprobar()
    const id = setInterval(comprobar, INTERVALO_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') comprobar() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelado = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (!hayNueva) return null

  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full
                 bg-blue-700 text-white text-sm font-semibold shadow-lg hover:bg-blue-800
                 transition-colors print:hidden"
      title="Hay una versión nueva de la aplicación desplegada. Pulsa para recargar y actualizarte."
    >
      <span>🔄</span>
      Nueva versión disponible — Actualizar
    </button>
  )
}
