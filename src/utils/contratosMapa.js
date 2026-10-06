/**
 * Módulo de contratos · pantalla «Mapa»: el reparto de lo que FMV mantiene y de lo
 * que paga, dibujado como dos chapas cortadas en piezas (como en el programa de corte):
 * el área de cada pieza es su parte del total.
 *
 *   · Chapa de equipos: una pieza por tipo de equipo; mide en unidades en servicio.
 *     Dentro, quién lo mantiene.
 *   · Chapa de contratos: una pieza por categoría; mide en importe anual. Dentro, cada
 *     proveedor. Los contratos sin importe conocido no se pueden dibujar a escala: se
 *     devuelven aparte.
 *
 * Las cifras salen de las mismas funciones que las listas (`filasEquipos`,
 * `sumaEnTotales`): cada pieza abre exactamente la lista que cuenta. Funciones puras.
 */
import { filasEquipos, sumaEnTotales, codigoProveedorBC, slugBloque, VISTAS } from './contratosVista.js';

/** Los cuatro estados que se pintan, siempre en este orden (de peor a mejor, y lo que no se sabe al final). */
export const ESTADOS_MAPA = ['rojo', 'ambar', 'verde', 'gris'];

// Mismos colores que las etiquetas de las listas (EST_OBLIGACION y EST_CONTRATO)
const COLOR_SITUACION = { fuera: 'rojo', proxima: 'ambar', ok: 'verde' }; // sin fecha, sin plan, sin obligaciones → gris
const COLOR_CONTRATO = { vencido: 'rojo', avisar: 'rojo', proximo: 'ambar', ok: 'verde' }; // sin vencimiento conocido → gris

const vacio = () => ({ rojo: 0, ambar: 0, verde: 0, gris: 0 });
const centimos = (n) => Math.round(n * 100) / 100;
const porValor = (a, b) => b.valor - a.valor || a.nombre.localeCompare(b.nombre, 'es');

/**
 * Reparte un rectángulo en piezas de área proporcional a `valor` («squarified treemap»
 * de Bruls, Huizing y van Wijk): se van llenando tiras a lo largo del lado corto y cada
 * tira se cierra cuando una pieza más dejaría las que ya tiene más alargadas.
 * Devuelve cada elemento con su hueco { x, y, w, h }. Los de valor 0 no ocupan sitio.
 */
export function encajar(items, x, y, w, h) {
  const validos = items.filter((i) => i.valor > 0).sort((a, b) => b.valor - a.valor);
  if (!validos.length || !(w > 0) || !(h > 0)) return [];
  const escala = (w * h) / validos.reduce((s, i) => s + i.valor, 0);
  const out = [];
  let rx = x, ry = y, rw = w, rh = h;
  let tira = [];
  let suma = 0;

  // Proporción de la pieza más alargada de una tira (están de mayor a menor)
  const peor = (lista, total, lado) => {
    const t2 = total * total;
    const l2 = lado * lado;
    return Math.max((l2 * lista[0].area) / t2, t2 / (l2 * lista[lista.length - 1].area));
  };
  const cerrar = () => {
    const ancha = rw >= rh;
    const grosor = suma / (ancha ? rh : rw);
    let pos = ancha ? ry : rx;
    for (const p of tira) {
      const largo = p.area / grosor;
      out.push(ancha ? { ...p.item, x: rx, y: pos, w: grosor, h: largo } : { ...p.item, x: pos, y: ry, w: largo, h: grosor });
      pos += largo;
    }
    if (ancha) { rx += grosor; rw -= grosor; } else { ry += grosor; rh -= grosor; }
    tira = [];
    suma = 0;
  };

  for (const item of validos) {
    const p = { item, area: item.valor * escala };
    const lado = Math.min(rw, rh);
    if (tira.length && peor([...tira, p], suma + p.area, lado) > peor(tira, suma, lado)) cerrar();
    tira.push(p);
    suma += p.area;
  }
  cerrar();
  return out;
}

/**
 * Chapa de equipos: tipos de equipo en servicio, medidos en unidades (un grupo de
 * 43 eslingas pesa 43). El estado de cada fila de la lista se reparte entre sus unidades.
 */
export function mapaEquipos(modelo) {
  const tipos = new Map();
  for (const f of filasEquipos(modelo)) {
    if (f.situacion === 'baja') continue;
    const nombre = f.tipoEquipo || 'Sin tipo';
    if (!tipos.has(nombre)) tipos.set(nombre, { clave: `tipo:${nombre}`, nombre, valor: 0, filas: 0, noAptos: 0, estados: vacio(), partes: new Map() });
    const t = tipos.get(nombre);
    const color = COLOR_SITUACION[f.situacion] || 'gris';
    t.valor += f.unidades;
    t.filas += 1;
    t.noAptos += f.noAptas;
    t.estados[color] += f.unidades;

    const quien = f.proveedor || '';
    if (!t.partes.has(quien)) t.partes.set(quien, { clave: `tipo:${nombre}:${quien}`, nombre: quien || 'Sin mantenedor', sinNombre: !quien, valor: 0, filas: 0, estados: vacio() });
    const p = t.partes.get(quien);
    p.valor += f.unidades;
    p.filas += 1;
    p.estados[color] += f.unidades;
  }
  const piezas = [...tipos.values()].map((t) => ({ ...t, partes: [...t.partes.values()].sort(porValor) })).sort(porValor);
  return { total: piezas.reduce((s, p) => s + p.valor, 0), filas: piezas.reduce((s, p) => s + p.filas, 0), piezas };
}

/**
 * Chapa de contratos: por cada vista, sus categorías con el importe anual de los
 * contratos vivos, y dentro cada proveedor. `estados` va en euros (lo que pinta la pieza)
 * y `estadosN` en número de contratos (lo que dice la lista).
 * @param {string[]} vistas  las que la persona puede ver: ['compras_fabrica'] o las dos
 */
export function mapaContratos(modelo, vistas) {
  const regiones = vistas.map((vista) => {
    const categorias = new Map();
    for (const c of modelo.contratos) {
      if (c.vista !== vista || !sumaEnTotales(c)) continue;
      const nombre = c.categoria || 'Sin categoría';
      if (!categorias.has(nombre)) categorias.set(nombre, { clave: `${vista}:${nombre}`, vista, nombre, valor: 0, n: 0, sinImporte: 0, estados: vacio(), estadosN: vacio(), partes: new Map() });
      const k = categorias.get(nombre);
      const importe = c.importe_anual != null && !isNaN(Number(c.importe_anual)) ? Number(c.importe_anual) : null;
      const color = COLOR_CONTRATO[c.calc.estado] || 'gris';

      // Un proveedor es el mismo aunque el nombre venga escrito distinto, si comparte nº de Business Central
      const quien = codigoProveedorBC(c.proveedor_codigo) || slugBloque(c.proveedor_nombre).toLowerCase();
      if (!k.partes.has(quien)) k.partes.set(quien, { clave: `${vista}:${nombre}:${quien}`, nombre: c.proveedor_nombre, valor: 0, n: 0, sinImporte: 0, contratos: [], estados: vacio(), estadosN: vacio() });
      const p = k.partes.get(quien);

      for (const x of [k, p]) {
        x.n += 1;
        x.estadosN[color] += 1;
        if (importe == null) x.sinImporte += 1;
        else {
          x.valor += importe;
          x.estados[color] += importe;
        }
      }
      p.contratos.push(c.id);
    }
    const redondear = (x) => ({ ...x, valor: centimos(x.valor), estados: Object.fromEntries(ESTADOS_MAPA.map((e) => [e, centimos(x.estados[e])])) });
    const piezas = [...categorias.values()].map((k) => ({ ...redondear(k), partes: [...k.partes.values()].map(redondear).sort(porValor) })).sort(porValor);
    return {
      clave: vista,
      vista,
      nombre: VISTAS[vista],
      valor: centimos(piezas.reduce((s, p) => s + p.valor, 0)),
      n: piezas.reduce((s, p) => s + p.n, 0),
      sinImporte: piezas.reduce((s, p) => s + p.sinImporte, 0),
      piezas,
    };
  });
  return {
    total: centimos(regiones.reduce((s, r) => s + r.valor, 0)),
    n: regiones.reduce((s, r) => s + r.n, 0),
    sinImporte: regiones.reduce((s, r) => s + r.sinImporte, 0),
    regiones,
  };
}
