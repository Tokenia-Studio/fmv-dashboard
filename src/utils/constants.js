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
  { id: 'presupuesto', label: 'Presupuesto', icon: '📊' },
  { id: 'presupuestoCompras', label: 'Ppto Compras', icon: '🛒' },
  { id: 'seguimientoEstructuras', label: 'Seg. Estructuras', icon: '🏗️' },
  { id: 'cargar', label: 'Cargar', icon: '📤' },
  { id: 'usuarios', label: 'Usuarios', icon: '👤' }
]

// Secciones de navegación para sidebar (rol direccion)
export const NAVIGATION_SECTIONS = {
  finanzas: { label: 'Finanzas', icon: '💰', tabs: ['pyg', 'servicios', 'financiacion', 'proveedores', 'cashflow', 'presupuesto'] },
  produccion: { label: 'Producción', icon: '🏭', tabs: ['seguimientoEstructuras'] },
  admin: { label: 'Administración', icon: '⚙️', tabs: ['cargar', 'usuarios'] }
}

// Tabs visibles por rol
export const TABS_POR_ROL = {
  direccion: ['pyg', 'servicios', 'financiacion', 'proveedores', 'cashflow', 'presupuesto', 'seguimientoEstructuras', 'cargar', 'usuarios'],
  compras: ['servicios', 'proveedores', 'presupuestoCompras', 'cargar']
}

// Umbrales semáforo para Seguimiento Estructuras (% desviación)
export const SEMAFORO_THRESHOLDS = {
  green: 5,    // <= 5% desviación: OK
  yellow: 15   // <= 15%: ALERTA, > 15%: FUERA
}

// Paginación tabla estructuras
export const ESTRUCTURAS_PAGE_SIZE = 50

// Estructura simplificada para Presupuesto Compras (solo grupos 60 y 62)
export const ESTRUCTURA_COMPRAS = [
  { id: 'compras60', label: 'COMPRAS (60)', grupo: '60', icon: '📦', type: 'header' },
  { id: 'servicios62', label: 'SERVICIOS EXT. (62)', grupo: '62', icon: '🔧', type: 'header' },
  { id: 'totalCompras', label: 'TOTAL', icon: '📊', type: 'total', calc: true }
]

// Mapeo por defecto grupo contable producto -> cuenta contable
export const MAPEO_GRUPO_CUENTA_DEFAULT = {
  'EMBALAJE': '602000000',
  'ENV. Y EMB': '602000000',
  'FABRICA.': '601000000',
  'ME': '600000000',
  'MP': '601000000',
  'NO DEDUCIB': '629000000',
  'O.SERVIC.': '629000000',
  'PS': '600000000',
  'PT': '600000000',
  'SUB. Y RES': '602000001',
  'SUBCONTRA': '607000001',
  'TRANS_LD': '624000001',
  'TRANSPORTE': '624000000',
  'UN': '600000001'
}

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

// Mapeo de cuentas a 3 dígitos para Presupuesto
export const ACCOUNT_GROUPS_3 = {
  // Ingresos (7XX)
  '700': { name: 'Ventas de mercaderías', type: 'ingreso' },
  '701': { name: 'Ventas de productos terminados', type: 'ingreso' },
  '702': { name: 'Ventas de productos semiterminados', type: 'ingreso' },
  '703': { name: 'Ventas de subproductos y residuos', type: 'ingreso' },
  '704': { name: 'Ventas de envases', type: 'ingreso' },
  '705': { name: 'Prestaciones de servicios', type: 'ingreso' },
  '706': { name: 'Descuentos s/ventas pronto pago', type: 'ingreso' },
  '708': { name: 'Devoluciones de ventas', type: 'ingreso' },
  '709': { name: 'Rappels sobre ventas', type: 'ingreso' },
  '710': { name: 'Variación exist. prod. curso', type: 'ingreso' },
  '711': { name: 'Variación exist. prod. semit.', type: 'ingreso' },
  '712': { name: 'Variación exist. prod. term.', type: 'ingreso' },
  '713': { name: 'Variación exist. subprod.', type: 'ingreso' },
  '730': { name: 'Trabajos realizados para activo', type: 'ingreso' },
  '740': { name: 'Subvenciones a la explotación', type: 'ingreso' },
  '746': { name: 'Subvenciones de capital', type: 'ingreso' },
  '747': { name: 'Otras subvenciones', type: 'ingreso' },
  '751': { name: 'Resultados de operaciones', type: 'ingreso' },
  '752': { name: 'Ingresos por arrendamientos', type: 'ingreso' },
  '753': { name: 'Ingresos de propiedad industrial', type: 'ingreso' },
  '754': { name: 'Ingresos por comisiones', type: 'ingreso' },
  '755': { name: 'Ingresos por servicios al personal', type: 'ingreso' },
  '759': { name: 'Ingresos por servicios diversos', type: 'ingreso' },
  '760': { name: 'Ingresos de participaciones', type: 'ingreso' },
  '761': { name: 'Ingresos de valores negociables', type: 'ingreso' },
  '762': { name: 'Ingresos de créditos', type: 'ingreso' },
  '763': { name: 'Beneficios por valoración', type: 'ingreso' },
  '765': { name: 'Descuentos s/compras pronto pago', type: 'ingreso' },
  '766': { name: 'Beneficios en participaciones', type: 'ingreso' },
  '768': { name: 'Diferencias positivas cambio', type: 'ingreso' },
  '769': { name: 'Otros ingresos financieros', type: 'ingreso' },
  '770': { name: 'Beneficios procedentes activo', type: 'ingreso' },
  '771': { name: 'Beneficios procedentes inmov.', type: 'ingreso' },
  '773': { name: 'Beneficios por oper. oblig.', type: 'ingreso' },
  '774': { name: 'Diferencias negativas cambio', type: 'ingreso' },
  '775': { name: 'Beneficios por oper. deuda', type: 'ingreso' },
  '778': { name: 'Ingresos excepcionales', type: 'ingreso' },
  '790': { name: 'Reversión deterioro inmov.', type: 'ingreso' },
  '791': { name: 'Reversión deterioro inversiones', type: 'ingreso' },
  '792': { name: 'Reversión deterioro créditos', type: 'ingreso' },
  '793': { name: 'Reversión deterioro existencias', type: 'ingreso' },
  '794': { name: 'Reversión deterioro créd. com.', type: 'ingreso' },
  '795': { name: 'Exceso de provisiones', type: 'ingreso' },
  '796': { name: 'Reversión deterioro partic.', type: 'ingreso' },
  '797': { name: 'Reversión deterioro val. neg.', type: 'ingreso' },
  '798': { name: 'Reversión deterioro créd. cp', type: 'ingreso' },
  '799': { name: 'Reversión deterioro exist. cp', type: 'ingreso' },
  // Gastos (6XX)
  '600': { name: 'Compras de mercaderías', type: 'gasto' },
  '601': { name: 'Compras de materias primas', type: 'gasto' },
  '602': { name: 'Compras de otros aprovisionamientos', type: 'gasto' },
  '606': { name: 'Descuentos s/compras pronto pago', type: 'gasto' },
  '607': { name: 'Trabajos realizados por otras empresas', type: 'gasto' },
  '608': { name: 'Devoluciones de compras', type: 'gasto' },
  '609': { name: 'Rappels por compras', type: 'gasto' },
  '610': { name: 'Variación exist. mercaderías', type: 'gasto' },
  '611': { name: 'Variación exist. materias primas', type: 'gasto' },
  '612': { name: 'Variación exist. otros aprov.', type: 'gasto' },
  '620': { name: 'Gastos en I+D', type: 'gasto' },
  '621': { name: 'Arrendamientos y cánones', type: 'gasto' },
  '622': { name: 'Reparaciones y conservación', type: 'gasto' },
  '623': { name: 'Servicios prof. independientes', type: 'gasto' },
  '624': { name: 'Transportes', type: 'gasto' },
  '625': { name: 'Primas de seguros', type: 'gasto' },
  '626': { name: 'Servicios bancarios', type: 'gasto' },
  '627': { name: 'Publicidad, propaganda y RRPP', type: 'gasto' },
  '628': { name: 'Suministros', type: 'gasto' },
  '629': { name: 'Otros servicios', type: 'gasto' },
  '630': { name: 'Impuesto sobre beneficios', type: 'gasto' },
  '631': { name: 'Otros tributos', type: 'gasto' },
  '633': { name: 'Ajustes negativos IS', type: 'gasto' },
  '634': { name: 'Ajustes negativos IVA', type: 'gasto' },
  '636': { name: 'Devolución de impuestos', type: 'gasto' },
  '638': { name: 'Ajustes positivos IS', type: 'gasto' },
  '639': { name: 'Ajustes positivos IVA', type: 'gasto' },
  '640': { name: 'Sueldos y salarios', type: 'gasto' },
  '641': { name: 'Indemnizaciones', type: 'gasto' },
  '642': { name: 'Seguridad Social empresa', type: 'gasto' },
  '643': { name: 'Retribuciones a largo plazo', type: 'gasto' },
  '644': { name: 'Retribuciones pagadas instrumentos', type: 'gasto' },
  '645': { name: 'Retribuciones al personal', type: 'gasto' },
  '649': { name: 'Otros gastos sociales', type: 'gasto' },
  '650': { name: 'Pérdidas créditos comerciales', type: 'gasto' },
  '651': { name: 'Resultados de operaciones', type: 'gasto' },
  '659': { name: 'Otras pérdidas gestión corriente', type: 'gasto' },
  '660': { name: 'Gastos financieros por deudas', type: 'gasto' },
  '661': { name: 'Gastos financieros por deudas', type: 'gasto' },
  '662': { name: 'Intereses de deudas', type: 'gasto' },
  '663': { name: 'Pérdidas por valoración', type: 'gasto' },
  '664': { name: 'Gastos por dividendos', type: 'gasto' },
  '665': { name: 'Intereses descuento efectos', type: 'gasto' },
  '666': { name: 'Pérdidas en participaciones', type: 'gasto' },
  '667': { name: 'Pérdidas de créditos', type: 'gasto' },
  '668': { name: 'Diferencias negativas de cambio', type: 'gasto' },
  '669': { name: 'Otros gastos financieros', type: 'gasto' },
  '670': { name: 'Pérdidas procedentes activo', type: 'gasto' },
  '671': { name: 'Pérdidas procedentes inmov.', type: 'gasto' },
  '672': { name: 'Pérdidas por oper. oblig.', type: 'gasto' },
  '673': { name: 'Pérdidas por oper. acciones', type: 'gasto' },
  '675': { name: 'Pérdidas por oper. deuda', type: 'gasto' },
  '678': { name: 'Gastos excepcionales', type: 'gasto' },
  '680': { name: 'Amortización inmov. intangible', type: 'gasto' },
  '681': { name: 'Amortización inmov. material', type: 'gasto' },
  '682': { name: 'Amortización inversiones inmob.', type: 'gasto' },
  '690': { name: 'Pérdidas por deterioro inmov.', type: 'gasto' },
  '691': { name: 'Pérdidas por deterioro inversiones', type: 'gasto' },
  '692': { name: 'Pérdidas por deterioro créditos', type: 'gasto' },
  '693': { name: 'Pérdidas por deterioro existencias', type: 'gasto' },
  '694': { name: 'Pérdidas por deterioro créd. com.', type: 'gasto' },
  '695': { name: 'Dotación a provisiones', type: 'gasto' },
  '696': { name: 'Pérdidas por deterioro partic.', type: 'gasto' },
  '697': { name: 'Pérdidas por deterioro val. neg.', type: 'gasto' },
  '698': { name: 'Pérdidas por deterioro créd. cp', type: 'gasto' },
  '699': { name: 'Pérdidas por deterioro exist. cp', type: 'gasto' }
}
