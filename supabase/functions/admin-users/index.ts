// ============================================================================
// Edge Function admin-users: gestión de cuentas desde el Dashboard FMV.
//
// Única puerta de alta para todas las apps (Dashboard, Producción, futuras).
// Solo puede llamarla un usuario con rol 'direccion' en la app 'dashboard'.
// Usa la clave de servicio (la inyecta Supabase en la función) para la API de
// administración: crea la cuenta e invita por correo; el usuario pulsa el
// enlace, cae en su app y establece su contraseña. Ese clic confirma el email.
//
// Acciones (POST JSON, cabecera Authorization: Bearer <jwt del admin>):
//   invite { email, app, role, redirectTo, centros?, taller? }
//   resend { user_id, redirectTo }
//   delete { user_id }
//
// Despliegue: ver README.md en esta carpeta.
// ============================================================================
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import {
  validarPeticion,
  decidirEnvio,
  filaRol,
  type PeticionInvite,
  type PeticionResend,
  type PeticionDelete,
} from "./logic.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Función sin configurar (SUPABASE_URL / SERVICE_ROLE_KEY)" }, 500);

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1) ¿Quién llama? Token de sesión del Dashboard, verificado contra Supabase.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return json({ error: "Sesión no válida" }, 401);
  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  const caller = callerData?.user;
  if (callerError || !caller) return json({ error: "Sesión no válida" }, 401);

  // 2) ¿Gestiona usuarios? Misma regla que app_is_user_admin() en SQL.
  const { data: adminRow, error: adminError } = await admin
    .from("app_user_roles")
    .select("id")
    .eq("user_id", caller.id)
    .eq("app", "dashboard")
    .eq("role", "direccion")
    .maybeSingle();
  if (adminError) return json({ error: `No se pudo comprobar el rol: ${adminError.message}` }, 500);
  if (!adminRow) return json({ error: "Solo dirección puede gestionar usuarios" }, 403);

  // 3) Petición
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo no válido" }, 400);
  }
  const v = validarPeticion(body);
  if (!v.ok) return json({ error: v.error }, 400);

  try {
    switch (v.peticion.action) {
      case "invite":
        return json(await invitar(admin, v.peticion));
      case "resend":
        return json(await reenviar(admin, v.peticion));
      case "delete":
        return json(await borrar(admin, v.peticion, caller.id));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});

// ----------------------------------------------------------------------------

async function buscarPorEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  // listUsers pagina; FMV tiene decenas de cuentas, no miles.
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`No se pudo consultar las cuentas: ${error.message}`);
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < perPage) return null;
  }
  return null;
}

type Enviado = "invitacion" | "recuperacion";

/**
 * Envía el correo que corresponde al estado de la cuenta y devuelve el user_id.
 *  invitar   -> crea la cuenta + correo "Invitación" (plantilla Invite user)
 *  reinvitar -> misma invitación otra vez (cuenta existente sin confirmar)
 *  recuperar -> correo "Restablecer contraseña" (cuenta confirmada que nunca entró)
 * El enlace lleva a redirectTo; la app detecta type=invite / recovery y pide contraseña.
 */
async function enviarAcceso(
  admin: SupabaseClient,
  email: string,
  redirectTo: string,
  decision: "invitar" | "reinvitar" | "recuperar",
  existente: User | null,
): Promise<{ userId: string; enviado: Enviado }> {
  if (decision !== "recuperar") {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (!error && data?.user) return { userId: data.user.id, enviado: "invitacion" };
    // Cuenta ya existente que Supabase no deja reinvitar -> enlace de contraseña.
    if (!existente) throw new Error(`No se pudo enviar la invitación: ${error?.message ?? "sin detalle"}`);
  }
  if (!existente) throw new Error("Cuenta no encontrada");
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(`No se pudo enviar el enlace de contraseña: ${error.message}`);
  return { userId: existente.id, enviado: "recuperacion" };
}

function estado(u: User) {
  return { email_confirmed_at: u.email_confirmed_at ?? null, last_sign_in_at: u.last_sign_in_at ?? null };
}

async function invitar(admin: SupabaseClient, p: PeticionInvite) {
  const existente = await buscarPorEmail(admin, p.email);
  const decision = decidirEnvio(existente ? estado(existente) : null);

  let userId = existente?.id ?? null;
  let enviado: Enviado | null = null;
  if (decision !== "nada") {
    const r = await enviarAcceso(admin, p.email, p.redirectTo, decision, existente);
    userId = r.userId;
    enviado = r.enviado;
  }
  if (!userId) throw new Error("No se obtuvo el identificador de la cuenta");

  const { error: rolError } = await admin
    .from("app_user_roles")
    .upsert(filaRol(p, userId), { onConflict: "user_id,app" });
  if (rolError) throw new Error(`Cuenta creada pero rol no guardado: ${rolError.message}`);

  const mensaje = enviado === "invitacion"
    ? `Invitación enviada a ${p.email}. Al pulsar el enlace establecerá su contraseña.`
    : enviado === "recuperacion"
      ? `Acceso añadido. Se ha enviado a ${p.email} un enlace para establecer su contraseña.`
      : `Acceso añadido a ${p.email}. Entra con la contraseña que ya tiene.`;

  return { user_id: userId, existia: !!existente, enviado, mensaje };
}

async function reenviar(admin: SupabaseClient, p: PeticionResend) {
  const { data, error } = await admin.auth.admin.getUserById(p.user_id);
  if (error || !data?.user?.email) throw new Error("Cuenta no encontrada");
  const u = data.user;
  const decision = decidirEnvio(estado(u));
  if (decision === "nada") {
    throw new Error('Esta cuenta ya ha entrado alguna vez; si no recuerda la contraseña, que use "He olvidado mi contraseña" en la app');
  }
  const r = await enviarAcceso(admin, u.email!.toLowerCase(), p.redirectTo, decision === "invitar" ? "reinvitar" : decision, u);
  const mensaje = r.enviado === "invitacion"
    ? `Invitación reenviada a ${u.email}.`
    : `Enlace para establecer contraseña enviado a ${u.email}.`;
  return { user_id: u.id, enviado: r.enviado, mensaje };
}

async function borrar(admin: SupabaseClient, p: PeticionDelete, callerId: string) {
  if (p.user_id === callerId) throw new Error("No puedes eliminar tu propia cuenta");
  const { error } = await admin.auth.admin.deleteUser(p.user_id);
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`);
  return { user_id: p.user_id, mensaje: "Cuenta eliminada" };
}
