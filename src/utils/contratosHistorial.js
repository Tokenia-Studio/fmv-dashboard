// ============================================
// CONTRATOS - El botón «atrás» del navegador dentro del módulo
// ============================================
// Pedido por Sachi en el piloto del 20/10/2026: «atrás» se salía del módulo. Cada
// pantalla o ficha que se abre deja una entrada en el historial con su navegación
// (bajo la clave `contratos`, junto a lo que el navegador ya tuviera); al volver, el
// módulo la restaura. La dirección de la página no cambia.
//
// Botón «Atrás» propio dentro de la sección (Carlos, 26/10/2026): cada entrada lleva
// además su `paso`, cuántas pantallas del módulo hay detrás de ella. Con paso 0 la
// anterior ya no es del módulo y el botón no se ofrece, así que nunca saca de la sección.

export const CLAVE_HISTORIAL = 'contratos';

const navLimpia = (nav) => ({ pantalla: nav?.pantalla || 'panel', ficha: nav?.ficha || null, filtro: nav?.filtro ?? null });
const pasoLimpio = (paso) => (Number.isInteger(paso) && paso > 0 ? paso : 0);

/** Estado del historial con la navegación del módulo, sin perder lo que ya hubiera. */
export function estadoHistorial(estadoActual, vista, nav, paso = 0) {
  return {
    ...(estadoActual && typeof estadoActual === 'object' ? estadoActual : {}),
    [CLAVE_HISTORIAL]: { vista, nav: navLimpia(nav), paso: pasoLimpio(paso) },
  };
}

/** Lo que guardó el módulo en una entrada del historial: { vista, nav, paso } o null. */
export function entradaDelHistorial(estado) {
  const c = estado && typeof estado === 'object' ? estado[CLAVE_HISTORIAL] : null;
  return c && typeof c.vista === 'string' && c.nav ? { vista: c.vista, nav: navLimpia(c.nav), paso: pasoLimpio(c.paso) } : null;
}

/** ¿Llevan a la misma pantalla? (para no apilar entradas repetidas al pulsar dos veces) */
export const mismaNav = (a, b) => JSON.stringify(navLimpia(a)) === JSON.stringify(navLimpia(b));

/**
 * Cómo queda el historial al entrar en una vista:
 *  · por el menú del Dashboard → se reutiliza la entrada actual y se empieza de cero (paso 0)
 *  · con «atrás» desde la otra vista → se reutiliza la entrada con el paso que ya tenía
 *  · con un salto desde la otra vista (Mapa) → paso adelante: entrada nueva, un paso más
 * @returns {{ apilar: boolean, nav, paso: number }}
 */
export function entradaAlEntrar(destino, estadoActual) {
  const nav = navLimpia(destino);
  if (!destino) return { apilar: false, nav, paso: 0 };
  if (destino.desdeHistorial) return { apilar: false, nav, paso: pasoLimpio(destino.paso) };
  return { apilar: true, nav, paso: (entradaDelHistorial(estadoActual)?.paso ?? 0) + 1 };
}
