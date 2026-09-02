-- ============================================================================
-- ESQUEMA DE GESTIÓN DE USUARIOS  (estado tras la migración del 2-sep-2026)
-- ============================================================================
--
-- Este fichero documenta el esquema que las apps usan DE VERDAD. Los .sql
-- antiguos del repo (sql/gestion_usuarios.sql, sql/presupuesto_compras_tables.sql)
-- describen el modelo previo `user_roles` / `delete_user`, que YA NO usa el
-- frontend. El modelo vigente es `app_user_roles` + las RPC de abajo + la
-- Edge Function admin-users (supabase/functions/admin-users).
--
-- Historia: volcado fiel de producción el 21-jul-2026 (introspección de
-- pg_catalog); actualizado el 2-sep-2026 con
-- sql/migracion_2026-09-02_usuarios_invitacion.sql (RLS solo-dirección,
-- listado con estado de invitación, borrado protegido, retirada de
-- app_confirm_user y app_create_user).
--
-- Consumido desde:
--   - src/components/Admin/GestionUsuarios.jsx  (Usuarios, rol direccion):
--       lee app_user_roles + app_list_auth_users(); cambia rol/centros/taller
--       con UPDATE directo; alta/reenvío/borrado vía Edge Function admin-users.
--   - src/lib/supabase.js  (db.userRoles.getByUserId, filtra app='dashboard')
--   - fmv-produccion/src/lib/supabase.js (getUserRole, filtra app='produccion')
--
-- CONTEXTO MULTI-APP: las apps de FMV (Dashboard, Producción y las futuras,
-- p.ej. Comercial) comparten el mismo proyecto Supabase y la misma auth.users.
-- `app_user_roles` es la tabla de roles COMPARTIDA (columna `app`).
-- La web (Astro + Decap CMS) NO usa Supabase.
-- Ver también sql/fix_fks_auth_users.sql en el repo de FMV Producción.
--
-- ALTA POR INVITACIÓN (2-sep-2026): el Dashboard es la única puerta de alta.
-- Dirección pone email, app, rol y centros → Edge Function admin-users (clave
-- de servicio) crea la cuenta e invita por correo (auth.admin.inviteUserByEmail)
-- → el usuario pulsa el enlace, cae en su app y establece contraseña. Ese clic
-- confirma el email. "He olvidado mi contraseña" sigue por correo como siempre.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- TABLA: app_user_roles
-- Un usuario (auth.users) puede tener una fila por cada `app` (UNIQUE user_id,app).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_user_roles (
  id                 SERIAL PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app                TEXT NOT NULL,              -- 'dashboard' | 'produccion' | (futuras)
  role               TEXT NOT NULL,              -- p.ej. direccion, compras, planificacion, taller, seccion
  taller_asignado    SMALLINT,                   -- solo rol produccion 'taller' (1 ó 2)
  email              TEXT,                        -- copia del email de auth.users (para listados)
  created_at         TIMESTAMPTZ DEFAULT now(),
  centros_asignados  TEXT[],                      -- solo rol produccion 'seccion' (multi-centro)
  CONSTRAINT app_user_roles_user_id_app_key UNIQUE (user_id, app)
);

-- Índices (además de los implícitos de PK y UNIQUE)
CREATE INDEX IF NOT EXISTS idx_app_user_roles_user ON public.app_user_roles USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_app_user_roles_app  ON public.app_user_roles USING btree (app);


-- ----------------------------------------------------------------------------
-- RPC: app_is_user_admin()
-- Quién gestiona usuarios = rol 'direccion' en la app 'dashboard' (misma regla
-- que la pestaña Usuarios del Dashboard y que la Edge Function admin-users).
-- SECURITY DEFINER para poder consultar app_user_roles desde sus propias políticas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_is_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_user_roles
    WHERE user_id = auth.uid()
      AND app = 'dashboard'
      AND role = 'direccion'
  );
$$;
REVOKE ALL ON FUNCTION public.app_is_user_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.app_is_user_admin() TO authenticated;


-- ----------------------------------------------------------------------------
-- RLS: cada usuario lee SOLO su fila; solo el admin de usuarios lee todas y
-- escribe. La Edge Function escribe con la clave de servicio (sin RLS).
-- (Hasta el 2-sep-2026 eran USING (true): cualquier autenticado podía leer y
-- cambiar cualquier rol, incluido el suyo a dirección.)
-- ----------------------------------------------------------------------------
ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_user_roles_select ON public.app_user_roles;
DROP POLICY IF EXISTS app_user_roles_insert ON public.app_user_roles;
DROP POLICY IF EXISTS app_user_roles_update ON public.app_user_roles;
DROP POLICY IF EXISTS app_user_roles_delete ON public.app_user_roles;

CREATE POLICY app_user_roles_select ON public.app_user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.app_is_user_admin());
CREATE POLICY app_user_roles_insert ON public.app_user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.app_is_user_admin());
CREATE POLICY app_user_roles_update ON public.app_user_roles
  FOR UPDATE TO authenticated
  USING (public.app_is_user_admin())
  WITH CHECK (public.app_is_user_admin());
CREATE POLICY app_user_roles_delete ON public.app_user_roles
  FOR DELETE TO authenticated
  USING (public.app_is_user_admin());


-- ----------------------------------------------------------------------------
-- RPC: app_list_auth_users()
-- Lista las cuentas de auth.users con su estado (confirmada, invitada, último
-- acceso) para el panel de Usuarios. Solo admin. SECURITY DEFINER porque
-- auth.users no es accesible con la anon key.
-- El panel marca "Pendiente de aceptar" cuando no hay email_confirmed_at o
-- nunca ha entrado (last_sign_in_at NULL) y ofrece "Reenviar invitación".
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_list_auth_users()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamptz,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_is_user_admin() THEN
    RAISE EXCEPTION 'Solo dirección puede listar usuarios';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at, u.email_confirmed_at, u.invited_at, u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.app_list_auth_users() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.app_list_auth_users() TO authenticated;


-- ----------------------------------------------------------------------------
-- RPC: app_delete_user(target_user_id)
-- Borra la cuenta completa: primero sus roles, luego auth.users. Solo admin y
-- nunca la propia cuenta. El Dashboard ya no la llama (borra vía Edge Function
-- con auth.admin.deleteUser); queda protegida por si se usa desde SQL.
-- El resto de FKs a auth.users deben ser ON DELETE CASCADE (pertenencia) o
-- ON DELETE SET NULL (auditoría) para que el DELETE no se bloquee
-- (ver fix_fks_auth_users.sql en el repo de Producción).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.app_is_user_admin() THEN
    RAISE EXCEPTION 'Solo dirección puede eliminar usuarios';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;
  DELETE FROM public.app_user_roles WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.app_delete_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.app_delete_user(uuid) TO authenticated;


-- ----------------------------------------------------------------------------
-- RETIRADAS el 2-sep-2026 (no deben existir):
--   app_confirm_user(uuid)                  parche para saltar la confirmación
--   app_create_user(text,text,text,text)    alta con contraseña desde SQL
-- Sustituidas por la Edge Function admin-users (alta por invitación).
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- CONFIGURACIÓN DEL PANEL DE SUPABASE (Authentication) que acompaña a esto:
--   - Sign In / Providers → Email → Allow new users to sign up: OFF
--     (las altas pasan por la Edge Function; la API de administración no se ve afectada)
--   - URL Configuration → Redirect URLs: https://fmv-dashboard-v2.vercel.app/**
--     y https://fmv-produccion.vercel.app/** (y cada app nueva)
--   - Email Templates → Invite user: texto neutro con {{ .ConfirmationURL }}
--   - SMTP: Resend, remitente tokenia@tokenia.es (entregabilidad OK desde 22-jul-2026)
-- ----------------------------------------------------------------------------
