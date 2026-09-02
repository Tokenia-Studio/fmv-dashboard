-- ============================================================================
-- Migración 2-sep-2026: usuarios unificados, alta por invitación desde el Dashboard
-- Pegar ENTERA en Supabase SQL Editor (proyecto ryjavkyudanppnobbhkr).
--
-- Qué hace:
--   1) app_is_user_admin(): quién gestiona usuarios = rol 'direccion' en la app
--      'dashboard' (misma regla que la pestaña Usuarios del Dashboard).
--   2) RLS de app_user_roles: cada usuario lee SOLO su fila; solo el admin de
--      usuarios lee todas y escribe. (Antes: cualquier autenticado leía y
--      escribía cualquier rol.) La Edge Function admin-users escribe con la
--      clave de servicio, que no pasa por RLS.
--   3) app_list_auth_users(): solo admin; devuelve además email_confirmed_at,
--      invited_at y last_sign_in_at para mostrar "Pendiente de aceptar".
--   4) app_delete_user(): solo admin (antes sin guarda). El Dashboard ya no la
--      llama (borra vía Edge Function); queda protegida por si acaso.
--   5) Retira app_confirm_user (parche del 2-sep, ya innecesario) y
--      app_create_user (nunca usada por el frontend).
--   6) Una sola vez: confirma las cuentas creadas estos días con rol asignado
--      que quedaron sin confirmar, para que entren con su contraseña temporal.
--   7) La última sentencia muestra el estado de todas las cuentas con rol.
--
-- Cuentas existentes: no se tocan ni auth.users (salvo el punto 6) ni los roles.
-- ============================================================================

-- 1) Helper: ¿el que llama gestiona usuarios?
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

-- 2) RLS app_user_roles
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

-- 3) Listado de cuentas auth (cambia el tipo de retorno → DROP + CREATE)
DROP FUNCTION IF EXISTS public.app_list_auth_users();
CREATE FUNCTION public.app_list_auth_users()
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

-- 4) Borrado protegido
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

-- 5) Funciones retiradas
DROP FUNCTION IF EXISTS public.app_confirm_user(uuid);
DROP FUNCTION IF EXISTS public.app_create_user(text, text, text, text);

-- 6) Una sola vez: cuentas con rol que quedaron sin confirmar (altas de estos días
--    con contraseña temporal entregada en mano). Nunca se ha aceptado invitación
--    (invited_at IS NULL): a las invitadas se las confirma su propio clic.
UPDATE auth.users u
SET email_confirmed_at = now()
WHERE u.email_confirmed_at IS NULL
  AND u.invited_at IS NULL
  AND EXISTS (SELECT 1 FROM public.app_user_roles r WHERE r.user_id = u.id);

-- 7) Comprobación: estado de todas las cuentas con rol
SELECT u.email, r.app, r.role, r.centros_asignados,
       u.email_confirmed_at IS NOT NULL AS confirmada,
       u.invited_at, u.last_sign_in_at
FROM public.app_user_roles r
JOIN auth.users u ON u.id = r.user_id
ORDER BY u.email, r.app;
