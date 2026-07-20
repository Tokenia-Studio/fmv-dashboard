// ============================================
// PLANTILLA PRESUPUESTO - Ida y vuelta por Excel
// Exporta el presupuesto de un ejercicio a una plantilla editable que el
// propio dashboard vuelve a leer (ver cargarPresupuesto en DataContext).
// El marcador de formato es el NOMBRE DE HOJA: PPTO_<año>.
// ============================================

import * as XLSX from 'xlsx'
import { ACCOUNT_GROUPS_3 } from './constants'

export const MESES_PLANTILLA = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Nombre de hoja que marca el formato plantilla y transporta el ejercicio
export const nombreHojaPlantilla = (año) => `PPTO_${año}`

// Descripción de apoyo: no tenemos nombres a 9 dígitos, usamos el grupo de 3
const descripcionCuenta = (cuenta) => {
  const g = ACCOUNT_GROUPS_3[String(cuenta).substring(0, 3)]
  return g ? g.name : ''
}

// Filas a exportar: el ppto real del año si existe; si no, el catálogo 6XX/7XX a cero
function construirFilas(presupuestos, año) {
  const delAño = (presupuestos || []).filter(p =>
    (p.año == null || p.año === año) && /^[67]/.test(String(p.cuenta || ''))
  )

  const porCuenta = {}
  delAño.forEach(p => {
    const cuenta = String(p.cuenta)
    if (!porCuenta[cuenta]) porCuenta[cuenta] = new Array(12).fill(0)
    const mes = parseInt(p.mes)
    if (mes >= 1 && mes <= 12) porCuenta[cuenta][mes - 1] += Number(p.importe) || 0
  })

  // Sin presupuesto cargado: plantilla en blanco con el catálogo de grupos
  if (Object.keys(porCuenta).length === 0) {
    Object.keys(ACCOUNT_GROUPS_3)
      .filter(c => /^[67]/.test(c))
      .forEach(c => { porCuenta[c] = new Array(12).fill(0) })
  }

  return Object.keys(porCuenta)
    .sort()
    .map(cuenta => ({ cuenta, meses: porCuenta[cuenta] }))
}

function hojaPlantilla(filas) {
  const cabecera = ['Cuenta', 'Descripción', ...MESES_PLANTILLA, 'Total']
  const aoa = [cabecera, ...filas.map(f => [
    f.cuenta,
    descripcionCuenta(f.cuenta),
    ...f.meses,
    null // se sustituye por fórmula
  ])]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  filas.forEach((_, i) => {
    const fila = i + 2 // 1-indexado + cabecera
    // La cuenta va como texto: si no, Excel se come el formato del código
    const celdaCuenta = ws[`A${fila}`]
    if (celdaCuenta) { celdaCuenta.t = 's'; celdaCuenta.v = String(celdaCuenta.v) }

    for (let c = 2; c <= 13; c++) {
      const ref = XLSX.utils.encode_cell({ r: fila - 1, c })
      if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '#,##0.00'
    }
    // Total con fórmula viva, para que cuadre mientras editan
    ws[`P${fila}`] = { t: 'n', f: `SUM(C${fila}:N${fila})`, z: '#,##0.00' }
  })

  ws['!cols'] = [{ wch: 12 }, { wch: 34 }, ...MESES_PLANTILLA.map(() => ({ wch: 12 })), { wch: 14 }]
  ws['!freeze'] = { xSplit: 2, ySplit: 1 }
  return ws
}

function hojaInstrucciones(año) {
  return XLSX.utils.aoa_to_sheet([
    [`PRESUPUESTO ${año} - Plantilla de edición`],
    [],
    ['Cómo usar este fichero'],
    ['1', `Edita los importes de los meses en la hoja PPTO_${año}.`],
    ['2', 'Puedes añadir filas nuevas al final: basta con rellenar la columna Cuenta y los meses.'],
    ['3', 'Guarda el fichero y súbelo desde "Cargar Presupuesto" en Presupuesto vs Real.'],
    [],
    ['Reglas importantes'],
    ['-', 'NO cambies el nombre de la hoja: el año de carga se lee de ahí.'],
    ['-', 'NO cambies la fila de cabecera ni el orden de las columnas de meses.'],
    ['-', 'Los importes van SIEMPRE en positivo, tanto ingresos (7XX) como gastos (6XX).'],
    ['-', 'Solo se cargan cuentas que empiecen por 6 o por 7. El resto se ignora.'],
    ['-', 'Las celdas vacías o a 0 no se guardan.'],
    ['-', `Al subirlo se REEMPLAZA todo el presupuesto de PyG de ${año}.`],
    ['-', 'El presupuesto de inversiones (grupo 2) no se toca: se edita en su pestaña.'],
    [],
    ['La columna Total es informativa: se recalcula sola y no se importa.']
  ])
}

// Construye el libro (separado de la descarga para poder testearlo)
export function construirLibroPresupuesto(presupuestos, año) {
  const filas = construirFilas(presupuestos, año)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, hojaPlantilla(filas), nombreHojaPlantilla(año))
  XLSX.utils.book_append_sheet(wb, hojaInstrucciones(año), 'Instrucciones')
  return { wb, filas: filas.length }
}

// Descarga la plantilla del ejercicio indicado
export function exportarPlantillaPresupuesto(presupuestos, año) {
  const { wb, filas } = construirLibroPresupuesto(presupuestos, año)
  XLSX.writeFile(wb, `Presupuesto_${año}_editable.xlsx`)
  return { filas }
}
