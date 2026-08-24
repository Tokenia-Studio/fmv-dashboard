// Iconos lucide para pestañas y secciones de navegación.
// Los emojis de TABS/NAVIGATION_SECTIONS en constants.js quedan como fallback
// para ids sin icono asignado; aquí se mapea id → componente lucide.
import {
  BarChart3, Wrench, Landmark, Truck, Wallet, Target, BookOpen,
  Users, ShoppingCart, Building2, Upload, UserCog,
  CircleDollarSign, Settings
} from 'lucide-react'

export const TAB_ICONS = {
  pyg: BarChart3,
  servicios: Wrench,
  financiacion: Landmark,
  proveedores: Truck,
  cashflow: Wallet,
  presupuesto: Target,
  cuentasAnuales: BookOpen,
  personal: Users,
  presupuestoCompras: ShoppingCart,
  inversiones: Building2,
  cargar: Upload,
  usuarios: UserCog
}

export const SECTION_ICONS = {
  finanzas: CircleDollarSign,
  admin: Settings
}
