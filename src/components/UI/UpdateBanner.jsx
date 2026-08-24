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
                 bg-fmv-600 text-white text-sm font-semibold shadow-lg hover:bg-fmv-500
                 transition-colors print:hidden"
      title="Hay una versión nueva de la aplicación desplegada. Pulsa para recargar y actualizarte."
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
      </svg>
      Nueva versión disponible — Actualizar
    </button>
  )
}
