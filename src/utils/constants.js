// ============================================
// CONSTANTES - FMV Dashboard v2.0
// ============================================

export const BRAND = {
  primary: '#1a365d',
  light: '#2c5282',
  name: 'FMV',
  fullName: 'Fabricaciones Metálicas Valdepinto'
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                             'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Patrones para buscar columnas del Excel (maneja problemas de encoding)
export const EXCEL_COLUMN_PATTERNS = {
  fecha: ['fecha registro', 'fecha'],
  cuenta: ['cuenta', 'n cuenta', 'nº cuenta', 'no cuenta'],
  debe: ['importe debe', 'debe'],
  haber: ['importe haber', 'haber'],
  codProcedencia: ['procedencia', 'cod. procedencia', 'código procedencia'],
  descripcion: ['descripcion', 'descripción', 'concepto'],
  documento: ['nº documento', 'n documento', 'num documento', 'numero documento'],
  tipoDocumento: ['tipo documento'],
  contrapartida: ['contrapartida']
}

// Función para encontrar columna por patrón
export function findColumn(columns, patterns) {
  const colsLower = columns.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  for (const pattern of patterns) {
    const patternNorm = pattern.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const idx = colsLower.findIndex(c => c.includes(patternNorm))
    if (idx !== -1) return columns[idx]
  }
  return null
}

// Grupos contables y su clasificación
// Para PyG: el SALDO (Debe-Haber) se interpreta así:
// - Gastos (6X): saldo positivo = gasto
// - Ingresos (7X): saldo negativo = ingreso (lo convertimos a positivo)
export const ACCOUNT_GROUPS = {
  // Gastos (6X) - saldo = debe - haber
  '60': { name: 'Compras', category: 'compras', sign: -1 },
  '61': { name: 'Var. Exist. MP', category: 'varExistMP', sign: -1 },  // Afecta aprovisionamientos
  '62': { name: 'Servicios Ext.', category: 'servicios', sign: -1 },
  '63': { name: 'Tributos', category: 'restoGastos', sign: -1 },
  '64': { name: 'Personal', category: 'personal', sign: -1 },
  '65': { name: 'Otros gastos', category: 'restoGastos', sign: -1 },
  '66': { name: 'Gastos financieros', category: 'gastosFinancieros', sign: -1 },
  '67': { name: 'Pérdidas activos', category: 'restoGastos', sign: -1 },
  '68': { name: 'Amortizaciones', category: 'amortizaciones', sign: -1 },
  '69': { name: 'Pérdidas deterioro', category: 'restoGastos', sign: -1 },
  // Ingresos (7X) - valor = -(debe - haber) = haber - debe
  '70': { name: 'Ventas', category: 'ventas', sign: 1 },
  '71': { name: 'Var. Exist. PT', category: 'varExistPT', sign: 1 },  // Ingreso por producción
  '72': { name: 'Trabajos empresa', category: 'otrosIngresos', sign: 1 },
  '73': { name: 'Trabajos inmov.', category: 'otrosIngresos', sign: 1 },
  '74': { name: 'Subvenciones', category: 'subvenciones', sign: 1 },
  '75': { name: 'Otros ingresos', category: 'otrosIngExplot', sign: 1 },
  '76': { name: 'Ingresos financieros', category: 'ingFinancieros', sign: 1 },
  '77': { name: 'Beneficios activos', category: 'ingExcepc', sign: 1 },
  '78': { name: 'Excesos provisiones', category: 'ingExcepc', sign: 1 },
  '79': { name: 'Excesos deterioro', category: 'ingExcepc', sign: 1 }
}

// Subcuentas de Servicios Exteriores (62x)
export const SERVICIOS_SUBCUENTAS = {
  '621': { name: 'Arrendamientos', color: '#3b82f6' },
  '622': { name: 'Reparaciones', color: '#ef4444' },
  '623': { name: 'Serv. prof. indep.', color: '#10b981' },
  '624': { name: 'Transportes', color: '#f59e0b' },
  '625': { name: 'Primas seguros', color: '#8b5cf6' },
  '626': { name: 'Servicios bancarios', color: '#ec4899' },
  '627': { name: 'Publicidad', color: '#06b6d4' },
  '628': { name: 'Suministros', color: '#84cc16' },
  '629': { name: 'Otros servicios', color: '#6b7280' }
}

// Cuentas de Balance para Financiación y Cash Flow
export const BALANCE_ACCOUNTS = {
  '17': { name: 'Deuda largo plazo', type: 'pasivo' },
  '40': { name: 'Proveedores', type: 'pasivo' },
  '41': { name: 'Acreedores', type: 'pasivo' },
  '52': { name: 'Deuda corto plazo', type: 'pasivo' },
  '57': { name: 'Tesorería', type: 'activo' }
}

// Tabs de navegación
export const TABS = [
  { id: 'pyg', label: 'PyG', icon: '📋' },
  { id: 'servicios', label: 'Servicios Ext.', icon: '🔧' },
  { id: 'financiacion', label: 'Financiación', icon: '🏦' },
  { id: 'proveedores', label: 'Proveedores', icon: '👥' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
  { id: 'cargar', label: 'Cargar', icon: '📤' }
]

// Colores para gráficos
export const CHART_COLORS = {
  ventas: '#22c55e',
  compras: '#ef4444',
  servicios: '#3b82f6',
  personal: '#a855f7',
  varExist: '#f97316',
  resto: '#6b7280',
  resultado: '#1a365d',
  ebitda: '#8b5cf6',
  margenBruto: '#0ea5e9',
  // Series comparativas
  actual: '#3b82f6',
  anterior: '#94a3b8',
  // Financiación
  deudaCorto: '#ef4444',
  deudaLargo: '#f97316',
  deudaTotal: '#1a365d',
  tesoreria: '#22c55e'
}

// Umbrales para indicadores semáforo
export const THRESHOLDS = {
  margenBruto: { warning: 15, danger: 10 },
  ebitda: { warning: 8, danger: 5 },
  personalSobreVentas: { warning: 35, danger: 40 },
  deudaEbitda: { warning: 3, danger: 5 },
  coberturaIntereses: { warning: 3, danger: 2 }
}
