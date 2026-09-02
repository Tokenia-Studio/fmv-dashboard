// Lógica pura de la Edge Function admin-users (sin Deno ni Supabase) para poder
// probarla con `node --test` desde el repo. index.ts la importa.

export type Accion = "invite" | "resend" | "delete";

export type PeticionInvite = {
  action: "invite";
  email: string;
  app: string;
  role: string;
  redirectTo: string;
  centros: string[] | null;
  taller: number | null;
};
export type PeticionResend = { action: "resend"; user_id: string; redirectTo: string };
export type PeticionDelete = { action: "delete"; user_id: string };
export type Peticion = PeticionInvite | PeticionResend | PeticionDelete;

export type Validacion = { ok: true; peticion: Peticion } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z][a-z0-9_-]{1,30}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CENTRO_RE = /^[A-Z0-9_]{1,10}$/;

function redirectValido(url: unknown): url is string {
  if (typeof url !== "string") return false;
  return url.startsWith("https://") || url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
}

/** Valida y normaliza el cuerpo recibido del Dashboard. */
export function validarPeticion(body: unknown): Validacion {
  if (!body || typeof body !== "object") return { ok: false, error: "Cuerpo no válido" };
  const b = body as Record<string, unknown>;
  const action = b.action;

  if (action === "invite") {
    const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (!EMAIL_RE.test(email)) return { ok: false, error: "Email no válido" };
    const app = typeof b.app === "string" ? b.app.trim() : "";
    if (!SLUG_RE.test(app)) return { ok: false, error: "Aplicación no válida" };
    const role = typeof b.role === "string" ? b.role.trim() : "";
    if (!SLUG_RE.test(role)) return { ok: false, error: "Rol no válido" };
    if (!redirectValido(b.redirectTo)) return { ok: false, error: "URL de la aplicación no válida" };

    let centros: string[] | null = null;
    if (role === "seccion") {
      const lista = Array.isArray(b.centros) ? b.centros : [];
      if (lista.length > 50) return { ok: false, error: "Demasiados centros" };
      const limpios = lista.map((c) => String(c).trim().toUpperCase());
      if (limpios.some((c) => !CENTRO_RE.test(c))) return { ok: false, error: "Código de centro no válido" };
      centros = limpios.length ? Array.from(new Set(limpios)) : null;
    }

    let taller: number | null = null;
    if (role === "taller" && b.taller !== null && b.taller !== undefined && b.taller !== "") {
      const t = Number(b.taller);
      if (t !== 1 && t !== 2) return { ok: false, error: "Taller no válido" };
      taller = t;
    }

    return { ok: true, peticion: { action, email, app, role, redirectTo: b.redirectTo, centros, taller } };
  }

  if (action === "resend") {
    if (typeof b.user_id !== "string" || !UUID_RE.test(b.user_id)) return { ok: false, error: "Usuario no válido" };
    if (!redirectValido(b.redirectTo)) return { ok: false, error: "URL de la aplicación no válida" };
    return { ok: true, peticion: { action, user_id: b.user_id, redirectTo: b.redirectTo } };
  }

  if (action === "delete") {
    if (typeof b.user_id !== "string" || !UUID_RE.test(b.user_id)) return { ok: false, error: "Usuario no válido" };
    return { ok: true, peticion: { action, user_id: b.user_id } };
  }

  return { ok: false, error: "Acción no reconocida" };
}

export type EstadoCuenta = {
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
} | null;

export type Decision = "invitar" | "reinvitar" | "recuperar" | "nada";

/**
 * Qué correo enviar al dar de alta o reenviar, según el estado de la cuenta:
 *  - no existe                -> "invitar" (crea la cuenta y manda la invitación)
 *  - existe sin confirmar     -> "reinvitar" (misma invitación otra vez)
 *  - confirmada, nunca entró  -> "recuperar" (enlace para establecer contraseña)
 *  - confirmada y ya entró    -> "nada" (tiene contraseña; solo se le añade acceso)
 */
export function decidirEnvio(cuenta: EstadoCuenta): Decision {
  if (!cuenta) return "invitar";
  if (!cuenta.email_confirmed_at) return "reinvitar";
  if (!cuenta.last_sign_in_at) return "recuperar";
  return "nada";
}

/** Fila que se escribe en app_user_roles para una invitación. */
export function filaRol(p: PeticionInvite, userId: string) {
  return {
    user_id: userId,
    app: p.app,
    role: p.role,
    email: p.email,
    taller_asignado: p.role === "taller" ? p.taller : null,
    centros_asignados: p.role === "seccion" ? p.centros : null,
  };
}
