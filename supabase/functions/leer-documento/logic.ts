// Lógica pura de la Edge Function leer-documento (sin Deno ni Supabase), para
// probarla con `node --test` desde el repo. index.ts la importa.
//
// La función lee un PDF con la API de Claude y devuelve una PROPUESTA de campos.
// No guarda nada en las tablas de negocio: la persona revisa y confirma en la app
// (funcional D9 y US-014: nada se guarda sin confirmación).

export type TipoLectura = "contrato" | "certificado" | "factura";
export const TIPOS_LECTURA: TipoLectura[] = ["contrato", "certificado", "factura"];

/** Límite de la API: campos con tipos unión (anulables) por esquema. */
export const MAX_UNIONES = 16;

/** Máximo de lecturas por persona y día (arquitectura §5: tope contra gasto descontrolado). */
export const LECTURAS_DIA = 60;
/** Mismo tope que el bucket `contratos`. */
export const TAMANO_MAXIMO = 20 * 1024 * 1024;

export type Peticion = { tipo: TipoLectura; ruta: string };
export type Validacion = { ok: true; peticion: Peticion } | { ok: false; error: string };

/**
 * El navegador sube el PDF a `_lectura/<uid>/…` y pide leer esa ruta. Solo se
 * admite leer lo que la propia persona ha subido ahí: la carpeta lleva su uid.
 */
export function validarPeticion(body: unknown, uid: string): Validacion {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo no válido" };
  const b = body as Record<string, unknown>;
  const tipo = b.tipo as TipoLectura;
  if (!TIPOS_LECTURA.includes(tipo)) return { ok: false, error: "Tipo de lectura no válido" };
  const ruta = typeof b.ruta === "string" ? b.ruta.trim() : "";
  const prefijo = `_lectura/${uid}/`;
  if (!ruta.startsWith(prefijo) || ruta.includes("..") || !/\.pdf$/i.test(ruta) || ruta.length > 300) {
    return { ok: false, error: "Ruta no válida: solo se leen PDF subidos por ti para leer" };
  }
  return { ok: true, peticion: { tipo, ruta } };
}

// ── Esquemas de salida (structured outputs: JSON garantizado) ────────────────
// Lo que no aparece en el documento queda vacío, nunca inventado: los textos
// como cadena vacía y los números y listas cerradas como null. Los textos no son
// «anulables» a propósito: la API admite como mucho 16 campos con tipos unión
// por esquema. `dudosos` lista los campos cuya lectura no es segura.

const texto = { type: "string" };
const numero = { anyOf: [{ type: "number" }, { type: "null" }] };
const entero = { anyOf: [{ type: "integer" }, { type: "null" }] };
const enumONull = (valores: string[]) => ({ anyOf: [{ type: "string", enum: valores }, { type: "null" }] });
const objeto = (props: Record<string, unknown>) => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

export const PERIODICIDADES = ["mes", "trimestre", "semestre", "anual", "único", "por pedido"];
export const RENOVACIONES = ["tácita", "expresa", "no consta"];
export const CATEGORIAS = [
  "Mantenimiento", "Calibración", "Inspección", "Certificación", "Legalización", "Residuos",
  "Renting", "Seguro", "Licencia", "Telecomunicaciones", "Suministro", "Seguridad",
  "Consultoría", "Asociación", "Servicio", "Obra",
];

const ESQUEMA_CONTRATO = objeto({
  fecha_documento: texto,
  proveedor_nombre: texto,
  referencia: texto,
  objeto: texto,
  categoria: enumONull(CATEGORIAS),
  importe: numero,
  periodicidad: enumONull(PERIODICIDADES),
  inicio: texto,
  fin: texto,
  renovacion: enumONull(RENOVACIONES),
  preaviso_dias: entero,
  nave: texto,
  equipos: {
    type: "array",
    items: objeto({ descripcion: { type: "string" }, unidades: entero, num_serie: texto, modelo: texto }),
  },
  revision_periodicidad_meses: entero,
  observaciones: texto,
  dudosos: { type: "array", items: { type: "string" } },
});

const ESQUEMA_CERTIFICADO = objeto({
  num_serie: texto,
  modelo: texto,
  fecha: texto,
  resultado: enumONull(["apto", "no apto", "sin resultado"]),
  entidad: texto,
  referencia: texto,
  proxima_fecha: texto,
  observaciones: texto,
  dudosos: { type: "array", items: { type: "string" } },
});

const ESQUEMA_FACTURA = objeto({
  proveedor_nombre: texto,
  numero_factura: texto,
  fecha: texto,
  concepto: texto,
  importe_sin_iva: numero,
  periodo_inicio: texto,
  periodo_fin: texto,
  observaciones: texto,
  dudosos: { type: "array", items: { type: "string" } },
});

export const ESQUEMAS: Record<TipoLectura, Record<string, unknown>> = {
  contrato: ESQUEMA_CONTRATO,
  certificado: ESQUEMA_CERTIFICADO,
  factura: ESQUEMA_FACTURA,
};

const COMUN = `Eres el lector de documentos del módulo de contratos y mantenimiento de Fabricaciones Metálicas Valdepinto (FMV), una empresa de calderería y estructuras metálicas con naves en Gavilanes 19, Gavilanes 21 y Águilas 7-13.

Lees un documento y propones los datos para una ficha que una persona revisará antes de guardarla. Un dato equivocado tiene consecuencias reales: una fecha de preaviso mal leída hace que un contrato se renueve solo por otro año. Por eso:
- Extrae solo lo que el documento dice. Si un dato no aparece, déjalo vacío: cadena vacía "" en los textos y null en números y listas. No lo deduzcas ni lo calcules salvo que se indique abajo.
- Si un dato aparece pero no es legible, es ambiguo o hay varios valores posibles, pon tu mejor lectura y añade el nombre del campo a "dudosos".
- Fechas en formato AAAA-MM-DD. Si el documento solo da mes y año, AAAA-MM. Si solo el año, AAAA.
- Importes como número, en euros, SIN IVA. Si solo aparece el importe con IVA y el tipo es el 21 %, calcula la base y marca el campo como dudoso.`;

export const INSTRUCCIONES: Record<TipoLectura, string> = {
  contrato: `${COMUN}

El documento es un contrato, una oferta aceptada, una póliza o una renovación.
- fecha_documento: fecha de firma o de emisión del documento.
- proveedor_nombre: razón social del proveedor, no la de FMV.
- objeto: qué cubre, en una frase corta («Mantenimiento anual de 4 puentes grúa»).
- categoria: la que mejor encaje de la lista.
- importe y periodicidad: el importe tal como lo fija el documento y cada cuánto se paga ("mes" si es una cuota mensual, "anual" si es un precio al año, "único" si es un pago puntual, "por pedido" si se paga por visita o servicio).
- inicio y fin: vigencia del contrato. Si dice «un año desde la firma» y aparece la fecha de firma, calcula el fin.
- renovacion: "tácita" si se prorroga solo salvo aviso, "expresa" si hay que renovarlo de forma explícita, "no consta" si el documento no dice nada.
- preaviso_dias: días de antelación para darlo de baja o no renovar (un mes = 30, tres meses = 90).
- equipos: las máquinas o instalaciones concretas que cubre (puente grúa, compresor, extintores…), con unidades, nº de serie y modelo si aparecen. Lista vacía si no menciona ninguna.
- revision_periodicidad_meses: cada cuántos meses se hace la revisión o visita de mantenimiento, si el documento lo dice (anual = 12, semestral = 6, trimestral = 3).`,
  certificado: `${COMUN}

El documento es un certificado de calibración, revisión o inspección de un equipo.
- num_serie: número de serie del equipo certificado, tal cual aparece. Es el dato con el que se identifica el equipo: cópialo carácter a carácter.
- fecha: fecha en que se hizo la calibración o revisión (no la de emisión del certificado si son distintas; en ese caso marca "fecha" como dudoso).
- resultado: "apto" si el equipo cumple o está conforme, "no apto" si no cumple, "sin resultado" si el documento no da un veredicto.
- entidad: quién certifica.
- referencia: número del certificado.
- proxima_fecha: solo si el documento indica expresamente la próxima calibración o revisión.`,
  factura: `${COMUN}

El documento es una factura que hace de documento de origen de un servicio sin contrato (por ejemplo, un mantenimiento pagado por adelantado).
- concepto: qué se factura, en una frase corta.
- importe_sin_iva: base imponible.
- periodo_inicio y periodo_fin: el periodo que cubre el servicio, solo si la factura lo dice. Si no lo dice, déjalos en null: la persona lo indicará.`,
};

export const PETICION_USUARIO: Record<TipoLectura, string> = {
  contrato: "Extrae los datos de este contrato para su ficha.",
  certificado: "Extrae los datos de este certificado.",
  factura: "Extrae los datos de esta factura.",
};

// ── Validación de lo que devuelve el modelo ───────────────────────────────────
// El JSON viene garantizado por el esquema, pero los valores se comprueban igual
// antes de proponerlos: una fecha imposible o un importe negativo se descartan
// y se marcan como dudosos.

const FECHA_RE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;

/** 'AAAA-MM-DD' | 'AAAA-MM' | 'AAAA' → { fecha: 'AAAA-MM-DD', precision } ; null si no es una fecha válida. */
export function normalizarFecha(v: unknown): { fecha: string; precision: "dia" | "mes" | "año" } | null {
  if (typeof v !== "string") return null;
  const m = FECHA_RE.exec(v.trim());
  if (!m) return null;
  const año = +m[1];
  if (año < 1990 || año > 2100) return null;
  if (!m[2]) return { fecha: `${m[1]}-01-01`, precision: "año" };
  const mes = +m[2];
  if (mes < 1 || mes > 12) return null;
  if (!m[3]) return { fecha: `${m[1]}-${m[2]}-01`, precision: "mes" };
  const dia = +m[3];
  const d = new Date(Date.UTC(año, mes - 1, dia));
  if (d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return { fecha: `${m[1]}-${m[2]}-${m[3]}`, precision: "dia" };
}

const CAMPOS_FECHA = new Set(["fecha_documento", "inicio", "fin", "fecha", "proxima_fecha", "periodo_inicio", "periodo_fin"]);
const CAMPOS_IMPORTE = new Set(["importe", "importe_sin_iva"]);

export type Campo = { valor: unknown; dudoso: boolean; precision?: string };
export type Propuesta = { tipo: TipoLectura; campos: Record<string, Campo>; equipos?: unknown[]; avisos: string[] };

/** JSON del modelo → propuesta con cada campo marcado como dudoso o no. */
export function construirPropuesta(tipo: TipoLectura, datos: Record<string, unknown>): Propuesta {
  const esquema = ESQUEMAS[tipo] as { properties: Record<string, unknown> };
  const dudosos = new Set(Array.isArray(datos.dudosos) ? datos.dudosos.filter((x) => typeof x === "string") : []);
  const campos: Record<string, Campo> = {};
  const avisos: string[] = [];

  for (const k of Object.keys(esquema.properties)) {
    if (k === "dudosos" || k === "equipos") continue;
    let valor = datos[k] ?? null;
    if (typeof valor === "string" && !valor.trim()) valor = null; // texto vacío = no consta
    let dudoso = dudosos.has(k);
    let precision: string | undefined;
    if (valor !== null && CAMPOS_FECHA.has(k)) {
      const f = normalizarFecha(valor);
      if (!f) {
        avisos.push(`${k}: «${valor}» no es una fecha válida; se deja vacío`);
        valor = null;
        dudoso = true;
      } else {
        valor = f.fecha;
        precision = f.precision;
      }
    }
    if (valor !== null && CAMPOS_IMPORTE.has(k)) {
      if (typeof valor !== "number" || !isFinite(valor) || valor < 0) {
        avisos.push(`${k}: importe no válido; se deja vacío`);
        valor = null;
        dudoso = true;
      } else {
        valor = Math.round(valor * 100) / 100;
      }
    }
    if (k === "preaviso_dias" && valor !== null && (!Number.isInteger(valor) || (valor as number) < 0 || (valor as number) > 730)) {
      avisos.push("preaviso_dias fuera de rango; se deja vacío");
      valor = null;
      dudoso = true;
    }
    if (k === "revision_periodicidad_meses" && valor !== null && (!Number.isInteger(valor) || (valor as number) < 1 || (valor as number) > 120)) {
      valor = null;
      dudoso = true;
    }
    if (typeof valor === "string") valor = valor.trim() || null;
    campos[k] = precision ? { valor, dudoso, precision } : { valor, dudoso };
  }

  // Coherencia de fechas: el fin no puede ser anterior al inicio
  const [ini, fin] = tipo === "factura" ? ["periodo_inicio", "periodo_fin"] : ["inicio", "fin"];
  if (campos[ini]?.valor && campos[fin]?.valor && String(campos[fin].valor) < String(campos[ini].valor)) {
    campos[ini].dudoso = true;
    campos[fin].dudoso = true;
    avisos.push("La fecha de fin es anterior a la de inicio: revisar");
  }

  const propuesta: Propuesta = { tipo, campos, avisos };
  if (tipo === "contrato") {
    propuesta.equipos = (Array.isArray(datos.equipos) ? datos.equipos : [])
      .filter((e) => e && typeof e === "object" && typeof (e as Record<string, unknown>).descripcion === "string")
      .slice(0, 50);
  }
  return propuesta;
}

// ── Casar un certificado con su equipo por nº de serie (US-014) ──────────────

/** Nº de serie comparable: sin espacios, guiones, barras ni puntos, en mayúsculas. */
export function normalizarSerie(s: unknown): string {
  return String(s ?? "").toUpperCase().replace(/[\s\-_./\\]/g, "");
}

export type EquipoSerie = { id: number; nombre: string; num_serie: string | null; estado?: string };

/**
 * Equipos cuyo nº de serie coincide con el leído. Coincidencia exacta tras
 * normalizar; si no hay ninguna, los que contienen o están contenidos en el leído
 * (lecturas con un prefijo de fabricante, p. ej.). La app enseña los candidatos y
 * la persona elige: nunca se asigna sola si hay más de uno o ninguno.
 */
export function casarPorSerie(serieLeida: unknown, equipos: EquipoSerie[]): { exactos: EquipoSerie[]; parciales: EquipoSerie[] } {
  const s = normalizarSerie(serieLeida);
  if (s.length < 3) return { exactos: [], parciales: [] };
  const conSerie = equipos.filter((e) => normalizarSerie(e.num_serie).length >= 3);
  const exactos = conSerie.filter((e) => normalizarSerie(e.num_serie) === s);
  if (exactos.length) return { exactos, parciales: [] };
  const parciales = conSerie.filter((e) => {
    const n = normalizarSerie(e.num_serie);
    return n.includes(s) || s.includes(n);
  });
  return { exactos: [], parciales: parciales.slice(0, 10) };
}

/** Origen permitido para llamar a la función: el Dashboard publicado y el entorno local. */
export function origenPermitido(origen: string | null): boolean {
  if (!origen) return false;
  return (
    origen === "https://fmv-dashboard-v2.vercel.app" ||
    /^https:\/\/fmv-dashboard-v2-[a-z0-9]+-tokenia-studios-projects\.vercel\.app$/.test(origen) ||
    /^http:\/\/localhost:30\d\d$/.test(origen)
  );
}
