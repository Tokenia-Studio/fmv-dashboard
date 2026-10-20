-- Lo mínimo de Supabase para pasar las migraciones y comprobaciones del módulo de contratos
-- SEGURIDAD-OK: base de pruebas LOCAL (PGlite en memoria, carpeta temporal de la sesión) que
-- reproduce a propósito los privilegios por defecto que Supabase da a anon/authenticated, para
-- que las migraciones reales los cierren y las comprobaciones lo verifiquen. Nunca se ejecuta
-- contra Supabase ni contra producción.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as $f$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    case when nullif(current_setting('request.jwt.claims', true), '') is null then null
         else (current_setting('request.jwt.claims', true)::jsonb ->> 'sub') end), '')::uuid
$f$;
create function auth.role() returns text language sql stable as $f$
  select case when nullif(current_setting('request.jwt.claims', true), '') is null then null
              else (current_setting('request.jwt.claims', true)::jsonb ->> 'role') end
$f$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text,
  owner uuid, owner_id text, created_at timestamptz default now(), unique (bucket_id, name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

-- Privilegios por defecto de Supabase en public
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.app_user_roles (
  id serial primary key, user_id uuid not null references auth.users(id) on delete cascade, app text not null, role text not null,
  taller_asignado smallint, email text, created_at timestamptz default now(), centros_asignados text[]);
create table public.configuracion (id bigserial primary key, key varchar(100) unique not null, value jsonb, updated_at timestamptz default now());

-- app_rol() del paso 2 de seguridad (21-sep-2026), copiada de seguridad_paso2_cierre_por_app.sql
create or replace function public.app_rol(p_app text)
returns text language sql security definer stable set search_path = public as $f$
  select role from public.app_user_roles where user_id = auth.uid() and app = p_app limit 1;
$f$;
revoke all on function public.app_rol(text) from public, anon;
grant execute on function public.app_rol(text) to authenticated;

alter table public.app_user_roles enable row level security;
alter table public.configuracion enable row level security;
create policy configuracion_acceso on public.configuracion for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);

-- Un usuario por rol
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'direccion@prueba'),
  ('22222222-2222-2222-2222-222222222222', 'compras@prueba'),
  ('33333333-3333-3333-3333-333333333333', 'taller@prueba');
insert into public.app_user_roles (user_id, app, role, created_at) values
  ('11111111-1111-1111-1111-111111111111', 'dashboard', 'direccion', now() - interval '3 day'),
  ('22222222-2222-2222-2222-222222222222', 'dashboard', 'compras',   now() - interval '2 day'),
  ('33333333-3333-3333-3333-333333333333', 'produccion', 'taller',   now() - interval '1 day');
