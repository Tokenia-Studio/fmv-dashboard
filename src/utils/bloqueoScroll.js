// ============================================
// Bloqueo del scroll de la página mientras hay una ventana emergente abierta
// ============================================
// Con la página quieta detrás solo queda una barra de scroll, la de la ventana,
// y la rueda o el panel táctil del portátil no mueven lo de detrás.
// Admite ventanas encadenadas: la página se libera al cerrar la última.

let abiertas = 0;
let previo = null;

/**
 * Bloquea el scroll del documento y devuelve la función que lo libera.
 * Compensa el ancho de la barra de la página para que el contenido no salte.
 * @param {Document} doc  documento (inyectable para los tests)
 * @returns {() => void}  liberar; llamarla más de una vez no hace nada
 */
export function bloquearScrollPagina(doc = document) {
  const body = doc.body;
  if (abiertas === 0) {
    previo = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const barra = (doc.defaultView?.innerWidth ?? 0) - doc.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (barra > 0) body.style.paddingRight = `${barra}px`;
  }
  abiertas++;

  let liberada = false;
  return () => {
    if (liberada) return;
    liberada = true;
    abiertas--;
    if (abiertas === 0 && previo) {
      body.style.overflow = previo.overflow;
      body.style.paddingRight = previo.paddingRight;
      previo = null;
    }
  };
}
