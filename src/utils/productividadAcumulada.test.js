import { describe, it, expect } from 'vitest'
import { agregarProductividad, acumuladoHasta } from './productividadAcumulada'

const mes = (mesNum, o = {}) => ({
  mesNum, futuro: false, trabajadores: 10, horasTotales: 1000, diasLab: 20,
  ingresos: 50000, totalGastos: 40000, personalCompleto: 25000,
  proveedores: 10000, acreedores: 5000, resto: 1000, ...o
})

describe('acumuladoHasta', () => {
  const meses = [
    mes(1),
    mes(2, { horasTotales: 500, ingresos: 10000, totalGastos: 30000, trabajadores: 12 }),
    mes(3, { ingresos: 90000 }),
    mes(11, { futuro: true, ingresos: 999999 })
  ]

  it('Ene = solo enero', () => {
    const k = acumuladoHasta(meses, 1)
    expect(k.gastosHoraTotal).toBe(40)
    expect(k.ingresosHora).toBe(50)
    expect(k.pctGastosVentas).toBe(80)
  })

  it('Ene–Feb pondera por horas e importes (no media de ratios)', () => {
    const k = acumuladoHasta(meses, 2)
    // (40000+30000)/(1000+500)
    expect(k.gastosHoraTotal).toBeCloseTo(46.667, 3)
    // (50000+10000)/1500 = 40 (la media de ratios daría (50+20)/2 = 35)
    expect(k.ingresosHora).toBe(40)
    expect(k.plantillaMediaProd).toBe(11)
    expect(k.ingresosPorTrabajador).toBeCloseTo(60000 / 11, 6)
    expect(k.ventasDiaLab).toBe(1500)
    expect(k.pctGastosVentas).toBeCloseTo(116.667, 3)
  })

  it('acumulado hasta el último mes = total del año y excluye meses futuros', () => {
    expect(acumuladoHasta(meses, 3)).toEqual(agregarProductividad(meses))
    expect(acumuladoHasta(meses, 12).totalIngresos).toBe(150000)
  })

  it('sin mes seleccionado o sin datos devuelve ceros', () => {
    expect(acumuladoHasta(meses, undefined).totalHoras).toBe(0)
    expect(acumuladoHasta([], 5).gastosHoraTotal).toBe(0)
  })

  it('ignora meses sin ingresos ni gastos', () => {
    const k = acumuladoHasta([mes(1), mes(2, { ingresos: 0, totalGastos: 0, horasTotales: 9999 })], 2)
    expect(k.totalHoras).toBe(1000)
  })
})
