// ============================================
// CONTRATOS - El botón «atrás» del navegador dentro del módulo
// ============================================
// Pedido por Sachi en el piloto del 20/10/2026: «atrás» se salía del módulo. Cada
// pantalla o ficha que se abre deja una entrada en el historial con su navegación
// (bajo la clave `contratos`, junto a lo que el navegador ya tuviera); al volver, el
// módulo la restaura. La dirección de la página no cambia.

export const CLAVE_HISTORIAL = 'contratos';

const navLimpia = (nav) => ({ pantalla: nav?.pantalla || 'panel', ficha: nav?.ficha || null, filtro: nav?.filtro ?? null });

/** Estado del historial con la navegación del módulo, sin perder lo que ya hubiera. */
export function estadoHistorial(estadoActual, vista, nav) {
  return { ...(estadoActual && typeof estadoActual === 'object' ? estadoActual : {}), [CLAVE_HISTORIAL]: { vista, nav: navLimpia(nav) } };
}

/** Lo que guardó el módulo en una entrada del historial: { vista, nav } o null. */
export function entradaDelHistorial(estado) {
  const c = estado && typeof estado === 'object' ? estado[CLAVE_HISTORIAL] : null;
  return c && typeof c.vista === 'string' && c.nav ? { vista: c.vista, nav: navLimpia(c.nav) } : null;
}

/** ¿Llevan a la misma pantalla? (para no apilar entradas repetidas al pulsar dos veces) */
export const mismaNav = (a, b) => JSON.stringify(navLimpia(a)) === JSON.stringify(navLimpia(b));
