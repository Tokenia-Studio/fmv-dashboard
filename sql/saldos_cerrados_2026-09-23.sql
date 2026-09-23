-- ============================================================================
-- SALDOS DE AÑOS CERRADOS (2022-2024) FUERA DEL JAVASCRIPT PÚBLICO
-- Preparada el 23-sep-2026 · Proyecto Supabase compartido de FMV
-- ============================================================================
-- Hasta hoy los saldos por mes y cuenta de 2022, 2023 y 2024 viajaban dentro
-- del bundle (src/data/saldos_*.json): cualquiera con la URL del Dashboard los
-- descargaba sin iniciar sesión. Pasan a esta tabla, que solo se lee con sesión
-- y rol en la app 'dashboard' (la misma regla que `movimientos`).
--
-- Quién lee:     cualquier usuario con rol en el Dashboard (direccion, compras),
--                igual que hoy el diario. El paso 3 de seguridad (compras acotado)
--                tendrá que acotar ESTA tabla junto con `movimientos`.
-- Quién escribe: nadie desde la app. Solo el script `npm run snapshot` con la
--                clave de servicio, en el equipo de Carlos.
-- Anónimos:      nada.
--
-- Orden:
--   1. este fichero (editor SQL de Supabase: Ctrl+A, Ctrl+V, Ctrl+Enter)
--   2. npm run snapshot -- 2022 2023 2024 --desde-json   (carga los saldos que hoy usa la app)
--   3. comprobar en el Dashboard que 2022-2024 salen igual; después, git rm src/data/saldos_*.json
-- Marcha atrás: sql/saldos_cerrados_MARCHA_ATRAS.sql (la app vuelve sola a leer el diario completo)
-- Idempotente. Transacción con guarda final.
-- ============================================================================
begin;

do $r$
begin
  if to_regprocedure('public.app_rol(text)') is null then
    raise exception 'Falta public.app_rol(text): ejecutar antes sql/seguridad_paso2_cierre_por_app.sql';
  end if;
end;
$r$;

create table if not exists public.saldos_cerrados (
  id           bigserial primary key,
  año          integer not null,
  mes          text not null,                 -- 'YYYY-MM'
  fecha        date not null,                 -- último día del mes
  cuenta       text not null,                 -- 9 dígitos
  grupo        text,
  subcuenta    text,
  debe         numeric(14,2) not null default 0,
  haber        numeric(14,2) not null default 0,
  neto         numeric(14,2) not null default 0,
  descripcion  text,
  generado_en  timestamptz not null default now(),
  constraint saldos_cerrados_unico unique (año, mes, cuenta)
);
create index if not exists saldos_cerrados_año_idx on public.saldos_cerrados (año);

alter table public.saldos_cerrados enable row level security;
revoke all on table public.saldos_cerrados from public, anon, authenticated;
grant select on table public.saldos_cerrados to authenticated;
revoke all on sequence public.saldos_cerrados_id_seq from public, anon, authenticated;

drop policy if exists saldos_cerrados_leer on public.saldos_cerrados;
create policy saldos_cerrados_leer on public.saldos_cerrados for select to authenticated
  using ((select public.app_rol('dashboard')) is not null);

-- ── Guarda: si algo queda abierto, no se aplica nada ────────────────────────
do $g$
declare fallo text := ''; n int;
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'saldos_cerrados' and rowsecurity) then
    fallo := fallo || ' saldos_cerrados sin RLS;'; end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'saldos_cerrados';
  if n <> 1 then fallo := fallo || format(' %s políticas en saldos_cerrados, se esperaba 1;', n); end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'saldos_cerrados'
    and (cmd <> 'SELECT' or coalesce(qual, 'true') = 'true' or qual like '%auth.role()%'
         or 'anon' = any(roles::text[]) or 'public' = any(roles::text[]));
  if n > 0 then fallo := fallo || ' política de saldos_cerrados abierta o de escritura;'; end if;

  select count(*) into n from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'saldos_cerrados'
      and (grantee in ('anon', 'PUBLIC') or (grantee = 'authenticated' and privilege_type <> 'SELECT'));
  if n > 0 then fallo := fallo || format(' %s privilegios de más sobre saldos_cerrados;', n); end if;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'saldos_cerrados con RLS' as comprobacion,
       (select case when rowsecurity then 'sí' else 'NO' end from pg_tables where schemaname = 'public' and tablename = 'saldos_cerrados') as valor,
       'sí' as esperado
union all select 'políticas (solo lectura con rol en el Dashboard)',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'saldos_cerrados'), '1'
union all select 'privilegios de anon',
       (select count(*)::text from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'saldos_cerrados' and grantee = 'anon'), '0'
union all select 'privilegios de authenticated',
       (select string_agg(privilege_type, ',') from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'saldos_cerrados' and grantee = 'authenticated'), 'SELECT'
union all select 'filas cargadas por año',
       coalesce((select string_agg(año || ': ' || n, ' · ' order by año) from
                 (select año, count(*) n from public.saldos_cerrados group by año) x), 'ninguna (falta el paso 2)'),
       '2022: 300 · 2023: 1084 · 2024: 1196';
