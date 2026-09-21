-- ============================================================================
-- SEGURIDAD · PASO 1 · CERROJO URGENTE (21-sep-2026)
-- Proyecto Supabase compartido de FMV (Dashboard + Producción + Comercial)
-- ============================================================================
-- Cierra lo que hoy es accesible SIN iniciar sesión. No cambia nada para los
-- usuarios legítimos de ninguna app:
--
--   1. delete_user(uuid) y prod_list_auth_users(): ningún frontend las usa
--      (se sustituyeron por app_delete_user / app_list_auth_users el 2-sep).
--      Se les quita el permiso de ejecución. No se borran: marcha atrás fácil.
--   2. prod_truncate_carga_tables(): Producción la usa en cada carga. Se le
--      añade la misma comprobación que ya hace la app (planificación o
--      dirección) y se le quita a los anónimos.
--   3. user_roles (tabla heredada, sin uso): se quitan sus 4 políticas
--      abiertas. Con RLS activa y sin políticas queda cerrada.
--   4. prod_personas: leer → cualquier rol de Producción; escribir →
--      planificación o dirección (igual que `canEdit` en la app).
--   5. prod_calendario: se quita la lectura para anónimos. Los autenticados
--      siguen leyendo por la otra política (Dashboard y Producción lo usan).
--   6. Bucket doc-previews (módulo documental retirado, 54 ficheros): privado.
--
-- Todo va en una transacción con guarda: si algo no queda como debe, no se
-- aplica nada. Marcha atrás: sql/seguridad_paso1_MARCHA_ATRAS.sql
--
-- Cómo ejecutar: clic en el editor → Ctrl+A → Ctrl+V → Ctrl+Enter.
-- ============================================================================
begin;

-- 1 ── Funciones sin uso ─────────────────────────────────────────────────────
revoke all on function public.delete_user(uuid)        from public, anon, authenticated;
revoke all on function public.prod_list_auth_users()   from public, anon, authenticated;

-- 2 ── Vaciado de tablas de carga: solo quien puede editar en Producción ─────
create or replace function public.prod_truncate_carga_tables()
returns void
language plpgsql
security definer
set search_path = public
as $f$
begin
  if not public.prod_can_edit() then
    raise exception 'Solo planificación o dirección pueden recargar los datos de producción'
      using errcode = '42501';
  end if;
  truncate prod_ordenes, prod_rutas, prod_componentes, prod_tiempos, prod_productos restart identity;
end;
$f$;
revoke all on function public.prod_truncate_carga_tables() from public, anon;
grant execute on function public.prod_truncate_carga_tables() to authenticated;

-- 3 ── Tabla heredada user_roles ─────────────────────────────────────────────
drop policy if exists "Users can delete roles"   on public.user_roles;
drop policy if exists "Users can insert roles"   on public.user_roles;
drop policy if exists "Users can read all roles" on public.user_roles;
drop policy if exists "Users can update roles"   on public.user_roles;
alter table public.user_roles enable row level security;

-- 4 ── prod_personas ─────────────────────────────────────────────────────────
drop policy if exists prod_personas_all      on public.prod_personas;
drop policy if exists prod_personas_leer     on public.prod_personas;
drop policy if exists prod_personas_escribir on public.prod_personas;
create policy prod_personas_leer on public.prod_personas
  for select to authenticated
  using (public.prod_get_user_role() is not null);
create policy prod_personas_escribir on public.prod_personas
  for all to authenticated
  using (public.prod_can_edit())
  with check (public.prod_can_edit());

-- 5 ── prod_calendario: fuera la lectura anónima ─────────────────────────────
drop policy if exists "Todos pueden leer calendario" on public.prod_calendario;

-- 6 ── Bucket doc-previews ───────────────────────────────────────────────────
update storage.buckets set public = false where id = 'doc-previews';
drop policy if exists public_read_previews on storage.objects;

-- Guarda: si algo no ha quedado cerrado, se aborta todo ──────────────────────
do $g$
declare fallo text := '';
begin
  if has_function_privilege('anon', 'public.delete_user(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.delete_user(uuid)', 'execute') then
    fallo := fallo || ' delete_user sigue ejecutable;';
  end if;
  if has_function_privilege('anon', 'public.prod_list_auth_users()', 'execute')
     or has_function_privilege('authenticated', 'public.prod_list_auth_users()', 'execute') then
    fallo := fallo || ' prod_list_auth_users sigue ejecutable;';
  end if;
  if has_function_privilege('anon', 'public.prod_truncate_carga_tables()', 'execute') then
    fallo := fallo || ' prod_truncate_carga_tables sigue abierta a anon;';
  end if;
  if not has_function_privilege('authenticated', 'public.prod_truncate_carga_tables()', 'execute') then
    fallo := fallo || ' prod_truncate_carga_tables ha quedado cerrada para Producción;';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_roles') then
    fallo := fallo || ' user_roles conserva políticas;';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename in ('prod_personas', 'prod_calendario')
             and roles && array['public', 'anon']::name[] and coalesce(qual, 'true') = 'true') then
    fallo := fallo || ' prod_personas o prod_calendario siguen abiertas a anónimos;';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'prod_personas') <> 2 then
    fallo := fallo || ' prod_personas no tiene sus 2 políticas nuevas;';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prod_calendario') then
    fallo := fallo || ' prod_calendario se ha quedado sin políticas (Dashboard y Producción dejarían de leerlo);';
  end if;
  if exists (select 1 from storage.buckets where id = 'doc-previews' and public) then
    fallo := fallo || ' doc-previews sigue público;';
  end if;
  if fallo <> '' then
    raise exception 'PASO 1 ABORTADO, no se ha aplicado nada:%', fallo;
  end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'delete_user ejecutable sin sesión' as comprobacion,
       has_function_privilege('anon', 'public.delete_user(uuid)', 'execute')::text as valor, 'false' as esperado
union all select 'prod_list_auth_users ejecutable sin sesión',
       has_function_privilege('anon', 'public.prod_list_auth_users()', 'execute')::text, 'false'
union all select 'prod_truncate_carga_tables ejecutable sin sesión',
       has_function_privilege('anon', 'public.prod_truncate_carga_tables()', 'execute')::text, 'false'
union all select 'prod_truncate_carga_tables para usuarios con sesión',
       has_function_privilege('authenticated', 'public.prod_truncate_carga_tables()', 'execute')::text, 'true'
union all select 'políticas en user_roles',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'user_roles'), '0'
union all select 'políticas en prod_personas',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'prod_personas'), '2'
union all select 'políticas en prod_calendario',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'prod_calendario'), '1'
union all select 'bucket doc-previews público',
       (select public::text from storage.buckets where id = 'doc-previews'), 'false';
