// ============================================================================
// Edge Function leer-documento: lector asistido del módulo de contratos (US-014).
//
// El navegador sube el PDF a `contratos/_lectura/<uid>/…` y llama aquí con
// { tipo: 'contrato' | 'certificado' | 'factura', ruta }. La función:
//   1. solo atiende al Dashboard (origen), con sesión válida y rol direccion o compras;
//   2. comprueba que el lector está encendido (configuracion.ctr_lector_activo) y el
//      tope de lecturas por persona y día;
//   3. descarga el PDF CON LA SESIÓN DEL USUARIO (si no puede verlo, no se lee);
//   4. lo envía a la API de Claude y valida la respuesta (JSON con esquema);
//   5. anota la lectura en ctr_lecturas (qué, quién, cuándo, tokens; nunca el contenido);
//   6. devuelve una PROPUESTA. No escribe en ninguna tabla de negocio: la persona
//      revisa y confirma en la app (nada se guarda sin confirmación).
//
// Secretos (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY (clave dedicada
// a FMV con límite de gasto). Opcional: LECTOR_MODELO (por defecto claude-opus-5).
// SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
// Despliegue: ver README.md en esta carpeta.
// ============================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import {
  validarPeticion,
  construirPropuesta,
  casarPorSerie,
  origenPermitido,
  ESQUEMAS,
  INSTRUCCIONES,
  PETICION_USUARIO,
  LECTURAS_DIA,
  TAMANO_MAXIMO,
  type EquipoSerie,
} from "./logic.ts";

const MODELO = Deno.env.get("LECTOR_MODELO") || "claude-opus-5";

function cabeceras(origen: string | null) {
  return {
    "Access-Control-Allow-Origin": origen && origenPermitido(origen) ? origen : "https://fmv-dashboard-v2.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function base64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

Deno.serve(async (req: Request) => {
  const origen = req.headers.get("Origin");
  const cors = cabeceras(origen);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!origenPermitido(origen)) return json({ error: "Origen no permitido" }, 403);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Función sin configurar (Supabase)" }, 500);
  if (!apiKey) return json({ error: "Lector sin configurar: falta la clave de la API (ANTHROPIC_API_KEY)" }, 500);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1) ¿Quién llama?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sesión no válida" }, 401);
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  const caller = callerData?.user;
  if (callerError || !caller) return json({ error: "Sesión no válida" }, 401);

  const { data: rol, error: rolError } = await admin
    .from("app_user_roles").select("role").eq("user_id", caller.id).eq("app", "dashboard").maybeSingle();
  if (rolError) return json({ error: "No se pudo comprobar el rol" }, 500);
  if (!rol || !["direccion", "compras"].includes(rol.role)) return json({ error: "Sin permiso para el lector" }, 403);

  // 2) Interruptor y tope diario
  const { data: cfg } = await admin.from("configuracion").select("value").eq("key", "ctr_lector_activo").maybeSingle();
  if (cfg?.value !== true) return json({ error: "El lector de documentos está apagado" }, 403);

  const inicioDia = new Date();
  inicioDia.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await admin
    .from("ctr_lecturas").select("id", { count: "exact", head: true })
    .eq("usuario", caller.id).gte("leido_en", inicioDia.toISOString());
  if (countError) return json({ error: "No se pudo comprobar el tope diario" }, 500);
  if ((count ?? 0) >= LECTURAS_DIA) return json({ error: `Tope de ${LECTURAS_DIA} lecturas al día alcanzado` }, 429);

  // 3) Petición y PDF, con la sesión del usuario (la RLS del bucket decide)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo no válido" }, 400);
  }
  const v = validarPeticion(body, caller.id);
  if (!v.ok) return json({ error: v.error }, 400);
  const { tipo, ruta } = v.peticion;

  const usuario = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: fichero, error: descargaError } = await usuario.storage.from("contratos").download(ruta);
  if (descargaError || !fichero) return json({ error: "No se ha podido abrir el PDF" }, 404);
  const bytes = new Uint8Array(await fichero.arrayBuffer());
  if (bytes.length > TAMANO_MAXIMO) return json({ error: "El PDF pasa de 20 MB" }, 413);
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return json({ error: "El fichero no es un PDF" }, 415);

  const anotar = (resultado: string, uso?: { input_tokens?: number; output_tokens?: number }, modelo = MODELO) =>
    admin.from("ctr_lecturas").insert({
      documento_id: null,
      tipo_lectura: tipo,
      modelo,
      resultado,
      tokens_entrada: uso?.input_tokens ?? null,
      tokens_salida: uso?.output_tokens ?? null,
      usuario: caller.id,
    });

  // 4) Lectura con la API de Claude (JSON garantizado por el esquema)
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });
  const peticion = {
    model: MODELO,
    max_tokens: 8000,
    output_config: { effort: "medium" as const, format: { type: "json_schema" as const, schema: ESQUEMAS[tipo] } },
    system: INSTRUCCIONES[tipo],
    messages: [{
      role: "user" as const,
      content: [
        { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64(bytes) } },
        { type: "text" as const, text: PETICION_USUARIO[tipo] },
      ],
    }],
  };
  let respuesta;
  try {
    try {
      // Si los filtros de seguridad del modelo rechazaran el documento, se reintenta
      // en el servidor con el modelo alternativo recomendado en vez de fallar.
      respuesta = await client.beta.messages.create({ ...peticion, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
    } catch (e) {
      // La reserva automática es beta: si la cuenta no la admite, se lee sin ella
      if (!(e instanceof Anthropic.BadRequestError)) throw e;
      console.warn("leer-documento: reintento sin fallbacks:", e.message);
      respuesta = await client.messages.create(peticion);
    }
  } catch (e) {
    await anotar("error");
    const estado = e instanceof Anthropic.APIError ? e.status : null;
    const detalle = e instanceof Error ? e.message.slice(0, 300) : String(e);
    console.error("leer-documento: error de la API:", estado, detalle);
    const motivo = estado === 429 || estado === 529
      ? "El servicio de lectura está saturado: vuelve a intentarlo en un minuto"
      : estado === 401 || estado === 403
        ? "La clave de la API no es válida o no tiene permiso (revisar el secreto ANTHROPIC_API_KEY)"
        : estado === 400
          ? "La API no ha aceptado la lectura"
          : "La lectura ha fallado";
    return json({ error: `${motivo}. El PDF sigue subido: puedes rellenar la ficha a mano.`, detalle }, 502);
  }

  if (respuesta.stop_reason === "refusal" || respuesta.stop_reason === "max_tokens") {
    await anotar("sin datos", respuesta.usage, respuesta.model);
    return json({ error: "No se han podido extraer los datos de este documento. Rellena la ficha a mano." }, 422);
  }
  const textoRespuesta = respuesta.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
  let datos: Record<string, unknown>;
  try {
    datos = JSON.parse(textoRespuesta?.text ?? "");
  } catch {
    await anotar("error", respuesta.usage, respuesta.model);
    return json({ error: "La lectura no ha devuelto datos válidos. Rellena la ficha a mano." }, 502);
  }

  const propuesta = construirPropuesta(tipo, datos);

  // 5) Certificados: candidatos por nº de serie, entre los equipos que la persona puede ver
  let candidatos: { exactos: EquipoSerie[]; parciales: EquipoSerie[] } | undefined;
  if (tipo === "certificado") {
    const { data: equipos } = await usuario.from("ctr_equipos").select("id, nombre, num_serie, estado").neq("estado", "baja");
    candidatos = casarPorSerie(propuesta.campos.num_serie?.valor, (equipos ?? []) as EquipoSerie[]);
  }

  await anotar("ok", respuesta.usage, respuesta.model);
  return json({ propuesta, candidatos, modelo: respuesta.model });
});
