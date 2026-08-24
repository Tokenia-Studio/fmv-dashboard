// Skeleton screen de la pestaña PyG: silueta difuminada de su maquetación real
// (filtro, 4 KPIs, resumen mensual, detalle y gráfico) mientras llegan los
// datos de Supabase en la carga inicial. Sustituye al overlay bloqueante solo
// en ese caso; el resto de operaciones siguen usando el overlay.
export default function PyGSkeleton() {
  // Alturas fijas (no aleatorias) para que el esqueleto no baile entre renders
  const barras = [45, 70, 55, 85, 60, 90, 75, 50, 80, 65, 95, 70]

  return (
    <div className="space-y-6 animate-pulse" aria-label="Cargando datos...">
      {/* Filtro de periodo */}
      <div className="flex items-center gap-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-7 w-28 bg-gray-300 rounded mb-2" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Tabla resumen mensual */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="h-4 w-48 bg-gray-200 rounded mb-4" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-3">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 flex-1 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico comparativo: columnas creciendo difuminadas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="h-4 w-56 bg-gray-200 rounded mb-4" />
        <div className="flex items-end gap-2 h-48">
          {barras.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-gray-200 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          {barras.map((_, i) => (
            <div key={i} className="flex-1 h-3 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
