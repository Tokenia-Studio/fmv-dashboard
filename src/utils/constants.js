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
  { id: 'cuentasAnuales', label: 'Cuentas Anuales', icon: '📑' },
  // { id: 'gestionDocumental', label: 'Gest. Documental', icon: '📄' }, // APARCADO 25/02/2026
  { id: 'presupuestoCompras', label: 'Ppto Compras', icon: '🛒' },
  { id: 'seguimientoEstructuras', label: 'Seg. Estructuras', icon: '🏗️' },
  { id: 'cargar', label: 'Cargar', icon: '📤' },
  { id: 'usuarios', label: 'Usuarios', icon: '👤' }
]

// Secciones de navegación para sidebar (rol direccion)
export const NAVIGATION_SECTIONS = {
  finanzas: { label: 'Finanzas', icon: '💰', tabs: ['pyg', 'servicios', 'financiacion', 'proveedores', 'cashflow', 'presupuesto', 'cuentasAnuales'] },
  produccion: { label: 'Producción', icon: '🏭', tabs: ['seguimientoEstructuras'] },
  admin: { label: 'Administración', icon: '⚙️', tabs: ['cargar', 'usuarios'] }
}

// Tabs visibles por rol
export const TABS_POR_ROL = {
  direccion: ['pyg', 'servicios', 'financiacion', 'proveedores', 'cashflow', 'presupuesto', 'cuentasAnuales', 'seguimientoEstructuras', 'cargar', 'usuarios'],
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

// ============================================
// ESTRUCTURA BALANCE PGC (Cuentas Anuales)
// ============================================
// Cada línea: id, label, type, cuentas (prefijos), signo (1=activo debe-haber, -1=pasivo haber-debe), indent
// Las cuentas de amortización acumulada (28x) y deterioro (29x) se incluyen
// con signo 1 (activo) porque su saldo natural (haber-debe) ya es negativo.
export const ESTRUCTURA_BALANCE = [
  // ==================== ACTIVO ====================
  { id: 'activo_header', label: 'ACTIVO', type: 'section', lado: 'activo' },

  // A) ACTIVO NO CORRIENTE
  { id: 'anc', label: 'A) Activo no corriente', type: 'group', lado: 'activo', subtotalDe: ['anc_i','anc_ii','anc_iii','anc_iv','anc_v','anc_vi'] },
  { id: 'anc_i', label: 'I. Inmovilizado intangible', type: 'line', cuentas: ['20','280','290'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'anc_i_1', label: '1. Desarrollo', cuentas: ['200','2800','2900'] },
    { id: 'anc_i_2', label: '2. Concesiones', cuentas: ['201','2801','2901'] },
    { id: 'anc_i_3', label: '3. Patentes, licencias, marcas y similares', cuentas: ['202','2802','2902'] },
    { id: 'anc_i_4', label: '4. Fondo de comercio', cuentas: ['204','2804'] },
    { id: 'anc_i_5', label: '5. Aplicaciones informaticas', cuentas: ['206','2806','2906'] },
  ]},
  { id: 'anc_ii', label: 'II. Inmovilizado material', type: 'line', cuentas: ['21','23','281','291'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'anc_ii_1', label: '1. Terrenos y construcciones', cuentas: ['210','211','2810','2811','2910','2911'] },
    { id: 'anc_ii_2', label: '2. Instalaciones tecnicas y otro inmov. material', cuentas: ['212','213','214','215','216','217','218','219','2812','2813','2814','2815','2816','2817','2818','2819','2912','2913','2914','2915','2916','2917','2918','2919'] },
    { id: 'anc_ii_3', label: '3. Inmovilizado en curso y anticipos', cuentas: ['23'] },
  ]},
  { id: 'anc_iii', label: 'III. Inversiones inmobiliarias', type: 'line', cuentas: ['22','282','292'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'anc_iii_1', label: '1. Terrenos', cuentas: ['220','2820','2920'] },
    { id: 'anc_iii_2', label: '2. Construcciones', cuentas: ['221','2821','2921'] },
  ]},
  { id: 'anc_iv', label: 'IV. Inversiones en empresas grupo y asoc. LP', type: 'line', cuentas: ['24','2934','2935','2943','2944','2953','2954'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'anc_iv_1', label: '1. Instrumentos de patrimonio', cuentas: ['240','2934','2943','2953'] },
    { id: 'anc_iv_2', label: '2. Creditos a empresas', cuentas: ['242','2935','2944','2954'] },
    { id: 'anc_iv_3', label: '3. Valores representativos de deuda', cuentas: ['241'] },
    { id: 'anc_iv_4', label: '4. Derivados', cuentas: ['243'] },
    { id: 'anc_iv_5', label: '5. Otros activos financieros', cuentas: ['249'] },
  ]},
  { id: 'anc_v', label: 'V. Inversiones financieras a largo plazo', type: 'line', cuentas: ['25','26','27','2940','2941','2942','2945','2946','2947','2948','2949','2950','2951','2952','2955','2956','2957','2958','2959','297','298'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'anc_v_1', label: '1. Instrumentos de patrimonio', cuentas: ['250','2940','2941','2942','2945','2946','2947','2948','2949'] },
    { id: 'anc_v_2', label: '2. Creditos a terceros', cuentas: ['252','253','254','2950','2951','2952','2955','2956','2957','2958','2959'] },
    { id: 'anc_v_3', label: '3. Valores representativos de deuda', cuentas: ['251','297'] },
    { id: 'anc_v_4', label: '4. Derivados', cuentas: ['255'] },
    { id: 'anc_v_5', label: '5. Otros activos financieros', cuentas: ['258','26','27','298'] },
  ]},
  { id: 'anc_vi', label: 'VI. Activos por impuesto diferido', type: 'line', cuentas: ['474'], signo: 1, indent: 1, lado: 'activo' },

  // B) ACTIVO CORRIENTE
  { id: 'ac', label: 'B) Activo corriente', type: 'group', lado: 'activo', subtotalDe: ['ac_0','ac_i','ac_ii','ac_iii','ac_iv','ac_v','ac_vi'] },
  { id: 'ac_0', label: 'Activos no corrientes mantenidos para la venta', type: 'line', cuentas: ['580','581','582','583','584'], signo: 1, indent: 1, lado: 'activo' },
  { id: 'ac_i', label: 'I. Existencias', type: 'line', cuentas: ['30','31','32','33','34','35','36','39'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'ac_i_1', label: '1. Comerciales', cuentas: ['30','390'] },
    { id: 'ac_i_2', label: '2. Materias primas y otros aprovisionamientos', cuentas: ['31','32','391','392'] },
    { id: 'ac_i_3', label: '3. Productos en curso', cuentas: ['33','393'] },
    { id: 'ac_i_4', label: '4. Productos semiterminados', cuentas: ['34','394'] },
    { id: 'ac_i_5', label: '5. Productos terminados', cuentas: ['35','395'] },
    { id: 'ac_i_6', label: '6. Anticipos a proveedores', cuentas: ['36'] },
  ]},
  // Nota: 43x sin 438 (anticipos clientes = pasivo), 44x completo
  { id: 'ac_ii', label: 'II. Deudores comerciales y otras cuentas a cobrar', type: 'line', cuentas: ['430','431','432','433','434','435','436','437','44','460','464','470','471','472','473','490','493','494'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'ac_ii_1', label: '1. Clientes por ventas y prestaciones de servicios', cuentas: ['430','431','432','433','434','435','436','437'] },
    { id: 'ac_ii_2', label: '2. Empresas del grupo y asociadas', cuentas: ['44'] },
    { id: 'ac_ii_3', label: '3. Deudores varios', cuentas: ['440','441','449'] },
    { id: 'ac_ii_4', label: '4. Personal', cuentas: ['460','464'] },
    { id: 'ac_ii_5', label: '5. Activos por impuesto corriente', cuentas: ['470','473'] },
    { id: 'ac_ii_6', label: '6. Otros creditos con las Administraciones Publicas', cuentas: ['471','472'] },
  ]},
  { id: 'ac_iii', label: 'III. Inversiones en empresas grupo y asoc. CP', type: 'line', cuentas: ['530','531','532','533','534','539'], signo: 1, indent: 1, lado: 'activo' },
  { id: 'ac_iv', label: 'IV. Inversiones financieras a corto plazo', type: 'line', cuentas: ['540','541','542','543','544','545','546','547','548','549','550','554','558','559','593','594','595','596','597','598'], signo: 1, indent: 1, lado: 'activo' },
  { id: 'ac_v', label: 'V. Periodificaciones a corto plazo', type: 'line', cuentas: ['480','567'], signo: 1, indent: 1, lado: 'activo' },
  { id: 'ac_vi', label: 'VI. Efectivo y otros activos líquidos', type: 'line', cuentas: ['57'], signo: 1, indent: 1, lado: 'activo', children: [
    { id: 'ac_vi_1', label: '1. Tesoreria', cuentas: ['570','571','572','573','574','575'] },
    { id: 'ac_vi_2', label: '2. Otros activos liquidos equivalentes', cuentas: ['576'] },
  ]},

  // TOTAL ACTIVO
  { id: 'total_activo', label: 'TOTAL ACTIVO', type: 'total', lado: 'activo', subtotalDe: ['anc','ac'] },

  // ==================== PATRIMONIO NETO Y PASIVO ====================
  { id: 'pnp_header', label: 'PATRIMONIO NETO Y PASIVO', type: 'section', lado: 'pasivo' },

  // A) PATRIMONIO NETO
  { id: 'pn', label: 'A) Patrimonio neto', type: 'group', lado: 'pasivo', subtotalDe: ['fp','pn_sub'] },

  // A-1) Fondos propios
  { id: 'fp', label: 'A-1) Fondos propios', type: 'subgroup', lado: 'pasivo', subtotalDe: ['fp_i','fp_ii','fp_iii','fp_iv','fp_v','fp_vi','fp_vii'] },
  { id: 'fp_i', label: 'I. Capital', type: 'line', cuentas: ['100','101','102'], signo: -1, indent: 2, lado: 'pasivo' },
  { id: 'fp_ii', label: 'II. Prima de emisión', type: 'line', cuentas: ['110'], signo: -1, indent: 2, lado: 'pasivo' },
  { id: 'fp_iii', label: 'III. Reservas', type: 'line', cuentas: ['112','113','114','115','116','117','119'], signo: -1, indent: 2, lado: 'pasivo', children: [
    { id: 'fp_iii_1', label: '1. Legal y estatutarias', cuentas: ['112'] },
    { id: 'fp_iii_2', label: '2. Otras reservas', cuentas: ['113','114','115','116','117','119'] },
  ]},
  { id: 'fp_iv', label: 'IV. (Acciones y participaciones propias)', type: 'line', cuentas: ['108','109'], signo: 1, indent: 2, lado: 'pasivo', presentacionNegativa: true },
  // 129 incluido en resultados anteriores; fp_vii se calcula desde grupos 6-7
  { id: 'fp_v', label: 'V. Resultados de ejercicios anteriores', type: 'line', cuentas: ['120','121','129'], signo: -1, indent: 2, lado: 'pasivo', children: [
    { id: 'fp_v_1', label: '1. Remanente', cuentas: ['120'] },
    { id: 'fp_v_2', label: '2. (Resultados negativos de ejercicios anteriores)', cuentas: ['121'] },
  ]},
  { id: 'fp_vi', label: 'VI. Otras aportaciones de socios', type: 'line', cuentas: ['118'], signo: -1, indent: 2, lado: 'pasivo' },
  // esResultado: se calcula desde PyG (grupos 6+7), no desde cuentas del balance
  { id: 'fp_vii', label: 'VII. Resultado del ejercicio', type: 'line', cuentas: [], signo: -1, indent: 2, lado: 'pasivo', esResultado: true },

  // A-2) Subvenciones, donaciones y legados recibidos
  { id: 'pn_sub', label: 'A-2) Subvenciones, donaciones y legados', type: 'line', cuentas: ['130','131','132'], signo: -1, indent: 1, lado: 'pasivo' },

  // B) PASIVO NO CORRIENTE
  { id: 'pnc', label: 'B) Pasivo no corriente', type: 'group', lado: 'pasivo', subtotalDe: ['pnc_i','pnc_ii','pnc_iii','pnc_iv','pnc_v'] },
  { id: 'pnc_i', label: 'I. Provisiones a largo plazo', type: 'line', cuentas: ['14'], signo: -1, indent: 1, lado: 'pasivo' },
  { id: 'pnc_ii', label: 'II. Deudas a largo plazo', type: 'line', cuentas: ['15','17','18'], signo: -1, indent: 1, lado: 'pasivo', children: [
    { id: 'pnc_ii_1', label: '1. Obligaciones y otros valores negociables', cuentas: ['177','178','179'] },
    { id: 'pnc_ii_2', label: '2. Deudas con entidades de credito', cuentas: ['170','171'] },
    { id: 'pnc_ii_3', label: '3. Acreedores por arrendamiento financiero', cuentas: ['174'] },
    { id: 'pnc_ii_4', label: '4. Derivados', cuentas: ['176'] },
    { id: 'pnc_ii_5', label: '5. Otros pasivos financieros', cuentas: ['15','172','173','175','180','185','189'] },
  ]},
  { id: 'pnc_iii', label: 'III. Deudas con empresas grupo y asoc. LP', type: 'line', cuentas: ['16'], signo: -1, indent: 1, lado: 'pasivo' },
  { id: 'pnc_iv', label: 'IV. Pasivos por impuesto diferido', type: 'line', cuentas: ['479'], signo: -1, indent: 1, lado: 'pasivo' },
  { id: 'pnc_v', label: 'V. Periodificaciones a largo plazo', type: 'line', cuentas: ['181'], signo: -1, indent: 1, lado: 'pasivo' },

  // C) PASIVO CORRIENTE
  // Prefijos sin solapamiento: 52x específicos (sin 529), 51x específicos (sin 551,555,556)
  { id: 'pc', label: 'C) Pasivo corriente', type: 'group', lado: 'pasivo', subtotalDe: ['pc_i','pc_ii','pc_iii','pc_iv','pc_v'] },
  { id: 'pc_i', label: 'I. Provisiones a corto plazo', type: 'line', cuentas: ['529','585','586'], signo: -1, indent: 1, lado: 'pasivo' },
  { id: 'pc_ii', label: 'II. Deudas a corto plazo', type: 'line', cuentas: ['500','501','502','503','504','505','506','507','508','509','520','521','522','523','524','525','526','527','528','551','552','553','555','556','560','561'], signo: -1, indent: 1, lado: 'pasivo', children: [
    { id: 'pc_ii_1', label: '1. Obligaciones y otros valores negociables', cuentas: ['500','501','505','506'] },
    { id: 'pc_ii_2', label: '2. Deudas con entidades de credito', cuentas: ['520','527'] },
    { id: 'pc_ii_3', label: '3. Acreedores por arrendamiento financiero', cuentas: ['524'] },
    { id: 'pc_ii_4', label: '4. Derivados', cuentas: ['507','508'] },
    { id: 'pc_ii_5', label: '5. Otros pasivos financieros', cuentas: ['502','503','504','509','521','522','523','525','526','528','551','552','553','555','556','560','561'] },
  ]},
  { id: 'pc_iii', label: 'III. Deudas con empresas grupo y asoc. CP', type: 'line', cuentas: ['510','511','512','513','514','515','516','517','518','519'], signo: -1, indent: 1, lado: 'pasivo' },
  { id: 'pc_iv', label: 'IV. Acreedores comerciales y otras cuentas a pagar', type: 'line', cuentas: ['40','41','438','465','466','475','476','477'], signo: -1, indent: 1, lado: 'pasivo', children: [
    { id: 'pc_iv_1', label: '1. Proveedores', cuentas: ['400','401','403','404','405','406'] },
    { id: 'pc_iv_2', label: '2. Proveedores, empresas del grupo y asociadas', cuentas: ['402'] },
    { id: 'pc_iv_3', label: '3. Acreedores varios', cuentas: ['41'] },
    { id: 'pc_iv_4', label: '4. Personal (remuneraciones pendientes)', cuentas: ['465','466'] },
    { id: 'pc_iv_5', label: '5. Pasivos por impuesto corriente', cuentas: ['475'] },
    { id: 'pc_iv_6', label: '6. Otras deudas con las Administraciones Publicas', cuentas: ['476','477'] },
    { id: 'pc_iv_7', label: '7. Anticipos de clientes', cuentas: ['438'] },
  ]},
  { id: 'pc_v', label: 'V. Periodificaciones a corto plazo', type: 'line', cuentas: ['485','568'], signo: -1, indent: 1, lado: 'pasivo' },

  // TOTAL PN + PASIVO
  { id: 'total_pnp', label: 'TOTAL PATRIMONIO NETO Y PASIVO', type: 'total', lado: 'pasivo', subtotalDe: ['pn','pnc','pc'] }
]

// ============================================
// ESTRUCTURA PyG OFICIAL PGC (Cuentas Anuales)
// ============================================
// signo: 1 = ingreso (haber-debe positivo), -1 = gasto (debe-haber positivo, se muestra negativo)
export const ESTRUCTURA_PYG_CCAA = [
  { id: 'pyg_1', label: '1. Importe neto de la cifra de negocios', type: 'line', cuentas: ['700','701','702','703','704','705','706','708','709'], signo: 1, children: [
    { id: 'pyg_1_a', label: 'a) Ventas', cuentas: ['700','701','702','703','704'] },
    { id: 'pyg_1_b', label: 'b) Prestaciones de servicios', cuentas: ['705'] },
    { id: 'pyg_1_c', label: 'c) Devoluciones y rappels', cuentas: ['706','708','709'] },
  ]},
  { id: 'pyg_2', label: '2. Variación de existencias de PT y en curso', type: 'line', cuentas: ['710','711','712','713','610','611','612'], signo: 1 },
  { id: 'pyg_3', label: '3. Trabajos realizados por la empresa para su activo', type: 'line', cuentas: ['730','731','732','733'], signo: 1 },
  { id: 'pyg_4', label: '4. Aprovisionamientos', type: 'line', cuentas: ['600','601','602','606','607','608','609'], signo: -1, children: [
    { id: 'pyg_4_a', label: 'a) Consumo de mercaderias', cuentas: ['600','6060','6080','6090'] },
    { id: 'pyg_4_b', label: 'b) Consumo de materias primas y otras materias consumibles', cuentas: ['601','602','6061','6081','6091'] },
    { id: 'pyg_4_c', label: 'c) Trabajos realizados por otras empresas', cuentas: ['607'] },
    { id: 'pyg_4_d', label: 'd) Deterioro de mercaderias, materias primas y otros', cuentas: ['6092','6093'] },
  ]},
  { id: 'pyg_5', label: '5. Otros ingresos de explotación', type: 'line', cuentas: ['740','747','751','752','753','754','755','759'], signo: 1, children: [
    { id: 'pyg_5_a', label: 'a) Ingresos accesorios y otros de gestion corriente', cuentas: ['751','752','753','754','755','759'] },
    { id: 'pyg_5_b', label: 'b) Subvenciones de explotacion incorporadas al resultado', cuentas: ['740','747'] },
  ]},
  { id: 'pyg_6', label: '6. Gastos de personal', type: 'line', cuentas: ['640','641','642','643','644','645','649'], signo: -1, children: [
    { id: 'pyg_6_a', label: 'a) Sueldos, salarios y asimilados', cuentas: ['640','641'] },
    { id: 'pyg_6_b', label: 'b) Cargas sociales', cuentas: ['642','643','644','649'] },
    { id: 'pyg_6_c', label: 'c) Provisiones', cuentas: ['645'] },
  ]},
  { id: 'pyg_7', label: '7. Otros gastos de explotación', type: 'line', cuentas: ['620','621','622','623','624','625','626','627','628','629','631','634','636','639','650','651','659'], signo: -1, children: [
    { id: 'pyg_7_a', label: 'a) Servicios exteriores', cuentas: ['620','621','622','623','624','625','626','627','628','629'] },
    { id: 'pyg_7_b', label: 'b) Tributos', cuentas: ['631','634','636','639'] },
    { id: 'pyg_7_c', label: 'c) Perdidas, deterioro y variacion de provisiones por operaciones comerciales', cuentas: ['650','651','659'] },
  ]},
  { id: 'pyg_8', label: '8. Amortización del inmovilizado', type: 'line', cuentas: ['680','681','682'], signo: -1 },
  { id: 'pyg_9', label: '9. Imputación de subvenciones de inmov. no financiero', type: 'line', cuentas: ['746'], signo: 1 },
  { id: 'pyg_10', label: '10. Excesos de provisiones', type: 'line', cuentas: ['795'], signo: 1 },
  { id: 'pyg_11', label: '11. Deterioro y resultado por enajenaciones de inmov.', type: 'line', cuentas: ['690','691','692','770','771','772'], signo: 1, children: [
    { id: 'pyg_11_a', label: 'a) Deterioros de valor', cuentas: ['690','691','692'] },
    { id: 'pyg_11_b', label: 'b) Resultados por enajenaciones y otras', cuentas: ['770','771','772'] },
  ]},

  // A.1) Resultado de explotación
  { id: 'a1', label: 'A.1) RESULTADO DE EXPLOTACIÓN', type: 'subtotal', subtotalDe: ['pyg_1','pyg_2','pyg_3','pyg_4','pyg_5','pyg_6','pyg_7','pyg_8','pyg_9','pyg_10','pyg_11'] },

  { id: 'pyg_12', label: '12. Ingresos financieros', type: 'line', cuentas: ['760','761','762','769'], signo: 1, children: [
    { id: 'pyg_12_a', label: 'a) De participaciones en instrumentos de patrimonio', cuentas: ['760'] },
    { id: 'pyg_12_b', label: 'b) De valores negociables y otros instrumentos financieros', cuentas: ['761','762','769'] },
  ]},
  { id: 'pyg_13', label: '13. Gastos financieros', type: 'line', cuentas: ['660','661','662','664','665','669'], signo: -1, children: [
    { id: 'pyg_13_a', label: 'a) Por deudas con empresas del grupo y asociadas', cuentas: ['6610','6615','6620','6640'] },
    { id: 'pyg_13_b', label: 'b) Por deudas con terceros', cuentas: ['660','6611','6616','6621','664','665','669'] },
  ]},
  { id: 'pyg_14', label: '14. Variación de valor razonable en instrumentos financieros', type: 'line', cuentas: ['663','763'], signo: 1 },
  { id: 'pyg_15', label: '15. Diferencias de cambio', type: 'line', cuentas: ['668','768'], signo: 1 },
  { id: 'pyg_16', label: '16. Deterioro y resultado por enajenaciones de instrum. financieros', type: 'line', cuentas: ['666','667','673','675','696','697','698','766','773','775','796','797','798'], signo: 1, children: [
    { id: 'pyg_16_a', label: 'a) Deterioros de valor', cuentas: ['696','697','698','796','797','798'] },
    { id: 'pyg_16_b', label: 'b) Resultados por enajenaciones y otras', cuentas: ['666','667','673','675','766','773','775'] },
  ]},

  // A.2) Resultado financiero
  { id: 'a2', label: 'A.2) RESULTADO FINANCIERO', type: 'subtotal', subtotalDe: ['pyg_12','pyg_13','pyg_14','pyg_15','pyg_16'] },

  // A.3) Resultado antes de impuestos
  { id: 'a3', label: 'A.3) RESULTADO ANTES DE IMPUESTOS', type: 'subtotal', subtotalDe: ['a1','a2'] },

  { id: 'pyg_17', label: '17. Impuesto sobre beneficios', type: 'line', cuentas: ['630','633','638'], signo: -1 },

  // A.4) Resultado del ejercicio procedente de operaciones continuadas
  { id: 'a4', label: 'A.4) RESULTADO OPERACIONES CONTINUADAS', type: 'subtotal', subtotalDe: ['a3','pyg_17'] },

  { id: 'pyg_18', label: '18. Resultado de operaciones interrumpidas', type: 'line', cuentas: ['678','778'], signo: 1 },

  // A.5) Resultado del ejercicio
  { id: 'a5', label: 'A.5) RESULTADO DEL EJERCICIO', type: 'total', subtotalDe: ['a4','pyg_18'] }
]

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
