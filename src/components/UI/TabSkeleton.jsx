// Skeleton screens de todas las pestañas: silueta difuminada de la maquetación
// real de cada una mientras llegan los datos de Supabase en una recarga
// completa (arranque de la app o "Recargar datos"). Sustituye al overlay
// bloqueante solo en ese caso; subir/borrar ficheros sueltos sigue usando el
// overlay. PyG conserva su skeleton propio (PyGSkeleton).
import PyGSkeleton from '../PyG/PyGSkeleton'

// Alturas fijas (no aleatorias) para que el esqueleto no baile entre renders
const BARRAS_12 = [45, 70, 55, 85, 60, 90, 75, 50, 80, 65, 95, 70]
const BARRAS_15 = [95, 80, 72, 65, 58, 52, 45, 40, 36, 30, 26, 22, 18, 15, 12]

// ---------- Piezas ----------

function Kpis({ n = 4, cols = 'grid-cols-2 md:grid-cols-4' }) {
  return (
    <div className={`grid ${cols} gap-4`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-28 bg-gray-300 rounded mb-2" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

// Tarjeta con cabecera oscura (.card-header) como las secciones reales
function Card({ children, sinCabecera = false }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {!sinCabecera && (
        <div className="px-4 py-3 bg-fmv-800/70">
          <div className="h-4 w-56 bg-white/30 rounded" />
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

function Barras({ altura = 'h-48', barras = BARRAS_12 }) {
  return (
    <>
      <div className={`flex items-end gap-2 ${altura}`}>
        {barras.map((h, i) => (
          <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {barras.map((_, i) => (
          <div key={i} className="flex-1 h-3 bg-gray-100 rounded" />
        ))}
      </div>
    </>
  )
}

// Gráfico de líneas: rejilla horizontal con una banda ondulada difuminada
function Lineas({ altura = 'h-48' }) {
  return (
    <div className={`relative ${altura}`}>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${i * 25}%` }} />
      ))}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0,70 C10,60 15,40 25,45 S40,75 50,55 S65,20 75,35 S90,60 100,40" fill="none" stroke="#e5e7eb" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <path d="M0,85 C12,80 20,65 30,70 S45,90 55,75 S70,50 80,60 S92,80 100,65" fill="none" stroke="#f3f4f6" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}

// Barras horizontales (ranking de proveedores)
function BarrasHorizontales({ n = 15 }) {
  return (
    <div className="space-y-2">
      {BARRAS_15.slice(0, n).map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-32 bg-gray-200 rounded" />
          <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
            <div className="h-full bg-gray-200 rounded" style={{ width: `${w}%` }} />
          </div>
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  )
}

function Tabla({ filas = 8, cols = 4, ancha = false }) {
  return (
    <div className="space-y-2.5">
      <div className="flex gap-3 pb-2 border-b border-gray-100">
        <div className="h-3 w-40 bg-gray-300 rounded" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-3 ${ancha ? 'flex-1' : 'w-20'} bg-gray-300 rounded`} />
        ))}
      </div>
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className={`h-4 bg-gray-200 rounded ${i % 3 === 0 ? 'w-40' : 'w-32 ml-4'}`} />
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className={`h-4 ${ancha ? 'flex-1' : 'w-20'} ${j % 2 ? 'bg-gray-100' : 'bg-gray-200'} rounded`} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Tabla ancha de 12 meses + total (presupuestos)
function TablaMeses({ filas = 14 }) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        <div className="h-8 w-36 bg-gray-200 rounded-lg" />
        <div className="ml-auto h-8 w-32 bg-gray-200 rounded-lg" />
      </div>
      <Tabla filas={filas} cols={13} ancha />
    </Card>
  )
}

function Toolbar({ izquierda = 2, derecha = 2, pills = false }) {
  const Btn = ({ w }) => <div className={`h-8 ${w} bg-gray-200 ${pills ? 'rounded-md' : 'rounded-lg'}`} />
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className={`flex gap-2 ${pills ? 'bg-gray-100 rounded-lg p-1' : ''}`}>
        {Array.from({ length: izquierda }).map((_, i) => <Btn key={i} w={i ? 'w-28' : 'w-36'} />)}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: derecha }).map((_, i) => <Btn key={i} w="w-32" />)}
      </div>
    </div>
  )
}

function Wrap({ children }) {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Cargando datos...">
      {children}
    </div>
  )
}

// ---------- Composiciones por pestaña ----------

function ServiciosSkeleton() {
  return (
    <Wrap>
      <Kpis />
      <Card><Barras altura="h-56" /></Card>
      <Card><Lineas altura="h-56" /></Card>
      <Card><Tabla filas={6} cols={3} /></Card>
      <Card><Tabla filas={8} cols={13} ancha /></Card>
    </Wrap>
  )
}

function FinanciacionSkeleton() {
  return (
    <Wrap>
      <Kpis n={6} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" />
      <Card><Barras altura="h-56" /></Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><Barras altura="h-48" /></Card>
        <Card><Lineas altura="h-48" /></Card>
      </div>
      <Card><Tabla filas={6} cols={5} ancha /></Card>
      <Card><Lineas altura="h-56" /></Card>
    </Wrap>
  )
}

function ProveedoresSkeleton() {
  return (
    <Wrap>
      <Kpis />
      <Card><Barras altura="h-56" /></Card>
      <Card><BarrasHorizontales /></Card>
    </Wrap>
  )
}

function CashFlowSkeleton() {
  return (
    <Wrap>
      <Kpis n={6} cols="grid-cols-2 md:grid-cols-3" />
      <Card><Lineas altura="h-72" /></Card>
      <Card><Barras altura="h-72" /></Card>
      <Card><Tabla filas={10} cols={13} ancha /></Card>
    </Wrap>
  )
}

function PresupuestoSkeleton() {
  return (
    <Wrap>
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-1">
          <div className="h-8 w-16 bg-gray-300 rounded-t-lg" />
          <div className="h-8 w-40 bg-gray-200 rounded-t-lg" />
        </div>
        <div className="h-3 w-48 bg-gray-200 rounded" />
      </div>
      <TablaMeses filas={16} />
    </Wrap>
  )
}

function InversionesSkeleton() {
  return (
    <Wrap>
      <TablaMeses filas={12} />
    </Wrap>
  )
}

function CuentasAnualesSkeleton() {
  return (
    <Wrap>
      <Toolbar izquierda={2} derecha={3} pills />
      <Card sinCabecera>
        <div className="h-5 w-64 bg-gray-300 rounded mb-5" />
        <Tabla filas={18} cols={2} />
      </Card>
    </Wrap>
  )
}

function PersonalSkeleton() {
  return (
    <Wrap>
      <Kpis />
      <Card><Tabla filas={8} cols={13} ancha /></Card>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Lineas altura="h-52" />
          <Barras altura="h-52" />
          <Lineas altura="h-52" />
          <Barras altura="h-52" />
        </div>
      </Card>
      <Card><Tabla filas={6} cols={5} ancha /></Card>
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
        <Tabla filas={8} cols={13} ancha />
      </Card>
    </Wrap>
  )
}

function PresupuestoComprasSkeleton() {
  return (
    <Wrap>
      <Toolbar izquierda={1} derecha={2} />
      <Card sinCabecera>
        <div className="h-4 w-40 bg-gray-200 rounded mb-3" />
        <div className="h-16 bg-gray-100 rounded" />
      </Card>
      <TablaMeses filas={18} />
    </Wrap>
  )
}

function UploadSkeleton() {
  return (
    <Wrap>
      <div className="grid md:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <Card key={i}>
            <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg" />
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex gap-3 mb-4">
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
          <div className="h-8 w-36 bg-gray-200 rounded-lg" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg" />
          <div className="h-24 border-2 border-dashed border-gray-200 rounded-lg" />
        </div>
      </Card>
      <Card>
        <Kpis />
      </Card>
      <Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-lg" />)}
        </div>
      </Card>
    </Wrap>
  )
}

function UsuariosSkeleton() {
  return (
    <Wrap>
      <Card>
        <div className="grid md:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-9 bg-gray-200 rounded-lg" />)}
        </div>
      </Card>
      <Card>
        <Tabla filas={6} cols={4} ancha />
      </Card>
    </Wrap>
  )
}

const SKELETONS = {
  pyg: PyGSkeleton,
  servicios: ServiciosSkeleton,
  financiacion: FinanciacionSkeleton,
  proveedores: ProveedoresSkeleton,
  cashflow: CashFlowSkeleton,
  presupuesto: PresupuestoSkeleton,
  cuentasAnuales: CuentasAnualesSkeleton,
  personal: PersonalSkeleton,
  presupuestoCompras: PresupuestoComprasSkeleton,
  inversiones: InversionesSkeleton,
  cargar: UploadSkeleton,
  usuarios: UsuariosSkeleton
}

export default function TabSkeleton({ tab }) {
  const Componente = SKELETONS[tab] || PyGSkeleton
  return <Componente />
}
