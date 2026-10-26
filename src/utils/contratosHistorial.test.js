import { describe, it, expect } from 'vitest';
import { CLAVE_HISTORIAL, estadoHistorial, entradaDelHistorial, mismaNav, entradaAlEntrar } from './contratosHistorial.js';

describe('historial del navegador en el módulo (atrás, piloto 20/10/2026)', () => {
  const nav = { pantalla: 'equipos', ficha: { tipo: 'equipo', id: 7 }, filtro: { estado: 'fuera' } };

  it('guarda la navegación sin perder lo que ya hubiera en la entrada', () => {
    const e = estadoHistorial({ otraApp: 1 }, 'compras_fabrica', nav);
    expect(e.otraApp).toBe(1);
    expect(e[CLAVE_HISTORIAL]).toEqual({ vista: 'compras_fabrica', nav, paso: 0 });
    expect(estadoHistorial(null, 'administracion', {})[CLAVE_HISTORIAL].nav).toEqual({ pantalla: 'panel', ficha: null, filtro: null });
  });

  it('lee la entrada del módulo y no se confunde con entradas ajenas', () => {
    expect(entradaDelHistorial(estadoHistorial(null, 'compras_fabrica', nav))).toEqual({ vista: 'compras_fabrica', nav, paso: 0 });
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

describe('botón «Atrás» dentro de la sección (26/10/2026)', () => {
  it('cada entrada guarda cuántas pantallas del módulo tiene detrás', () => {
    expect(entradaDelHistorial(estadoHistorial(null, 'compras_fabrica', nav(), 3)).paso).toBe(3);
  });

  it('un paso raro o de una versión anterior cuenta como 0: el botón no se ofrece y no saca del módulo', () => {
    for (const raro of [undefined, null, -1, 1.5, '2', NaN]) {
      expect(estadoHistorial(null, 'compras_fabrica', nav(), raro)[CLAVE_HISTORIAL].paso).toBe(0);
      expect(entradaDelHistorial({ [CLAVE_HISTORIAL]: { vista: 'compras_fabrica', nav: nav(), paso: raro } }).paso).toBe(0);
    }
    // Entrada guardada antes de esta versión, sin paso
    expect(entradaDelHistorial({ [CLAVE_HISTORIAL]: { vista: 'compras_fabrica', nav: nav() } }).paso).toBe(0);
  });

  it('entrar por el menú empieza de cero en la entrada actual', () => {
    const actual = estadoHistorial(null, 'compras_fabrica', nav('tareas'), 4);
    expect(entradaAlEntrar(null, actual)).toEqual({ apilar: false, nav: nav('panel'), paso: 0 });
  });

  it('volver con «atrás» a la otra vista recupera el paso que tenía esa entrada', () => {
    const destino = { vista: 'administracion', pantalla: 'contratos', ficha: null, filtro: null, paso: 2, desdeHistorial: true };
    expect(entradaAlEntrar(destino, {})).toEqual({ apilar: false, nav: nav('contratos'), paso: 2 });
  });

  it('saltar desde la otra vista (Mapa) es un paso adelante sobre la entrada en la que se estaba', () => {
    const actual = estadoHistorial(null, 'compras_fabrica', nav('mapa'), 1);
    expect(entradaAlEntrar({ vista: 'administracion', pantalla: 'contratos', filtro: { x: 1 } }, actual))
      .toEqual({ apilar: true, nav: { pantalla: 'contratos', ficha: null, filtro: { x: 1 } }, paso: 2 });
    // Sin entrada del módulo detrás (no debería pasar, pero no rompe): paso 1
    expect(entradaAlEntrar({ vista: 'administracion', pantalla: 'contratos' }, null).paso).toBe(1);
  });

  function nav(pantalla = 'equipos') {
    return { pantalla, ficha: null, filtro: null };
  }
});
