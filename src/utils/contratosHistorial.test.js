import { describe, it, expect } from 'vitest';
import { CLAVE_HISTORIAL, estadoHistorial, entradaDelHistorial, mismaNav } from './contratosHistorial.js';

describe('historial del navegador en el módulo (atrás, piloto 20/10/2026)', () => {
  const nav = { pantalla: 'equipos', ficha: { tipo: 'equipo', id: 7 }, filtro: { estado: 'fuera' } };

  it('guarda la navegación sin perder lo que ya hubiera en la entrada', () => {
    const e = estadoHistorial({ otraApp: 1 }, 'compras_fabrica', nav);
    expect(e.otraApp).toBe(1);
    expect(e[CLAVE_HISTORIAL]).toEqual({ vista: 'compras_fabrica', nav });
    expect(estadoHistorial(null, 'administracion', {})[CLAVE_HISTORIAL].nav).toEqual({ pantalla: 'panel', ficha: null, filtro: null });
  });

  it('lee la entrada del módulo y no se confunde con entradas ajenas', () => {
    expect(entradaDelHistorial(estadoHistorial(null, 'compras_fabrica', nav))).toEqual({ vista: 'compras_fabrica', nav });
    expect(entradaDelHistorial(null)).toBeNull();
    expect(entradaDelHistorial({ [CLAVE_HISTORIAL]: 'basura' })).toBeNull();
    expect(entradaDelHistorial({ otra: { vista: 'x' } })).toBeNull();
  });

  it('no apila dos veces la misma pantalla', () => {
    expect(mismaNav({ pantalla: 'tareas' }, { pantalla: 'tareas', ficha: null, filtro: null })).toBe(true);
    expect(mismaNav({ pantalla: 'tareas' }, { pantalla: 'equipos' })).toBe(false);
    expect(mismaNav(nav, { ...nav, ficha: { tipo: 'equipo', id: 8 } })).toBe(false);
  });
});
