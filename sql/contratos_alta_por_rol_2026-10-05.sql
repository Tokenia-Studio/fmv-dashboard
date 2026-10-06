-- ============================================================================
-- Contratos · compras no podía dar de alta documentos ni contratos (05/10/2026)
-- ============================================================================
-- Detectado en la primera sesión de piloto con Sachi (05/10/2026): con su usuario
-- (rol compras) «Subir» no hacía nada; con dirección sí.
--
-- Causa: la app crea la fila y la relee en la misma orden (INSERT … RETURNING).
-- En ese caso la base de datos exige que la fila nueva cumpla también la regla de
-- LECTURA, y la comprueba ANTES de guardarla. Las reglas de lectura de contratos
-- y documentos preguntaban «¿ve este id?» a una función que buscaba la fila en la
-- tabla: como todavía no estaba, respondía que no y el alta se rechazaba (42501).
-- A dirección no le pasaba porque para ese rol la función contesta sin buscar.
--
-- Arreglo: la regla de lectura se decide con las columnas de la propia fila
-- (funciones *_fila, como ya hacían las obligaciones). Quién ve qué NO cambia:
--   · contrato   → direccion: todos · compras: los de su vista y los que cubren un equipo
--   · documento  → direccion: todos · compras: los de un equipo, los de una obligación
--                  que ve, los de un contrato que ve, y los que ha subido él mientras
--                  no estén enlazados a nada
-- ctr_ve_contrato(id) y ctr_ve_documento(id) siguen existiendo (las usan las demás
-- tablas y el almacenamiento) y ahora aplican esa misma regla: una sola definición.
--
-- No toca datos ni privilegios de tabla. Cómo ejecutarlo: SQL Editor de Supabase,
-- rol «postgres», Ctrl+A, Ctrl+V, Ctrl+Enter. Si la guarda final encuentra algo
-- mal, aborta y no se aplica nada.
-- Marcha atrás: contratos_alta_por_rol_2026-10-05_MARCHA_ATRAS.sql
-- Después: contratos_alta_por_rol_2026-10-05_comprobacion.sql (suplanta a cada rol)
-- y, como siempre, contratos_comprobacion_permisos.sql y contratos_qa_2026-09-24_comprobacion.sql.
-- ============================================================================

begin;

do $r$
begin
  if to_regprocedure('public.ctr_ve_obligacion(bigint)') is null or to_regclass('public.ctr_documentos') is null then
    raise exception 'Faltan las tablas o funciones ctr_*: ejecutar antes sql/contratos_migracion_2026-09-22.sql';
  end if;
end;
$r$;

-- (06/10/2026) Esta migración quedó superada por contratos_documentos_por_contrato_2026-10-06.sql,
-- que redefine ctr_ve_documento_fila. Ejecutarla después vuelve a abrir F5: pasó en producción
-- el 06/10/2026, al confundirla con su _comprobacion. Si la del 06/10 ya está aplicada, no hace nada.
do $s$
begin
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'ctr_documento_contrato'
               and policyname = 'ctr_documento_contrato_escribir'
               and with_check like '%ctr_ve_documento(documento_id)%') then
    raise exception 'NO SE HA APLICADO NADA: esta migración está superada por contratos_documentos_por_contrato_2026-10-06.sql y ejecutarla ahora volvería a abrir F5. Si lo que se buscaba era la comprobación, es contratos_alta_por_rol_2026-10-05_comprobacion.sql';
  end if;
end;
$s$;

-- ── Contrato: la regla, con las columnas de la fila ─────────────────────────
create or replace function public.ctr_ve_contrato_fila(p_id bigint, p_vista text)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then (
      p_vista = 'compras_fabrica'
      or exists (select 1 from public.ctr_contrato_equipo ce where ce.contrato_id = p_id))
    else false end;
$f$;

create or replace function public.ctr_ve_contrato(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then coalesce(
      (select public.ctr_ve_contrato_fila(c.id, c.vista) from public.ctr_contratos c where c.id = p_id), false)
    else false end;
$f$;

-- ── Documento: la regla, con las columnas de la fila ────────────────────────
-- Los enlaces a contratos se miran aquí dentro (con todos los enlaces a la vista),
-- no en la política: así un documento enlazado a un contrato de Administración no
-- pasa por «suelto» para quien lo subió.
create or replace function public.ctr_ve_documento_fila(p_id bigint, p_equipo bigint, p_obligacion bigint, p_subido_por uuid)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then (
      p_equipo is not null
      or (p_obligacion is not null and public.ctr_ve_obligacion(p_obligacion))
      or exists (select 1 from public.ctr_documento_contrato dc
                 where dc.documento_id = p_id and public.ctr_ve_contrato(dc.contrato_id))
      or (p_subido_por = auth.uid() and p_equipo is null and p_obligacion is null
          and not exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = p_id)))
    else false end;
$f$;

create or replace function public.ctr_ve_documento(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then coalesce(
      (select public.ctr_ve_documento_fila(d.id, d.equipo_id, d.obligacion_id, d.subido_por)
       from public.ctr_documentos d where d.id = p_id), false)
    else false end;
$f$;

revoke all on function public.ctr_ve_contrato_fila(bigint, text)                 from public, anon;
revoke all on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) from public, anon;
revoke all on function public.ctr_ve_contrato(bigint)                            from public, anon;
revoke all on function public.ctr_ve_documento(bigint)                           from public, anon;
grant execute on function public.ctr_ve_contrato_fila(bigint, text)                 to authenticated;
grant execute on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) to authenticated;
grant execute on function public.ctr_ve_contrato(bigint)                            to authenticated;
grant execute on function public.ctr_ve_documento(bigint)                           to authenticated;

-- ── Las dos reglas de lectura pasan a mirar la fila ─────────────────────────
drop policy if exists ctr_contratos_leer on public.ctr_contratos;
create policy ctr_contratos_leer on public.ctr_contratos for select to authenticated
  using (public.ctr_ve_contrato_fila(id, vista));

drop policy if exists ctr_documentos_leer on public.ctr_documentos;
create policy ctr_documentos_leer on public.ctr_documentos for select to authenticated
  using (public.ctr_ve_documento_fila(id, equipo_id, obligacion_id, subido_por));

-- ── Guarda: si algo no ha quedado como debe, no se aplica nada ──────────────
do $g$
declare fallo text := ''; n int; f text;
begin
  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename = 'ctr_contratos' and policyname = 'ctr_contratos_leer'
      and cmd = 'SELECT' and roles::text[] = array['authenticated'] and qual like '%ctr_ve_contrato_fila(id, vista)%';
  if n <> 1 then fallo := fallo || ' la regla de lectura de ctr_contratos no ha quedado como se esperaba;'; end if;

  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename = 'ctr_documentos' and policyname = 'ctr_documentos_leer'
      and cmd = 'SELECT' and roles::text[] = array['authenticated']
      and qual like '%ctr_ve_documento_fila(id, equipo_id, obligacion_id, subido_por)%';
  if n <> 1 then fallo := fallo || ' la regla de lectura de ctr_documentos no ha quedado como se esperaba;'; end if;

  foreach f in array array[
    'public.ctr_ve_contrato_fila(bigint, text)', 'public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid)',
    'public.ctr_ve_contrato(bigint)', 'public.ctr_ve_documento(bigint)'] loop
    if has_function_privilege('anon', f, 'execute') then
      fallo := fallo || format(' %s ejecutable sin sesión;', f); end if;
    if not has_function_privilege('authenticated', f, 'execute') then
      fallo := fallo || format(' la app no podría usar %s;', f); end if;
  end loop;

  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename like 'ctr\_%'
      and ('anon' = any(roles::text[]) or 'public' = any(roles::text[]));
  if n > 0 then fallo := fallo || format(' %s políticas ctr_ concedidas a anon/public;', n); end if;

  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relname in ('ctr_contratos', 'ctr_documentos') and not c.relrowsecurity;
  if n > 0 then fallo := fallo || ' ctr_contratos o ctr_documentos sin RLS;'; end if;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'regla de lectura de ctr_contratos' as comprobacion,
       (select qual from pg_policies where schemaname = 'public' and tablename = 'ctr_contratos' and policyname = 'ctr_contratos_leer') as valor,
       'ctr_ve_contrato_fila(id, vista)' as esperado
union all select 'regla de lectura de ctr_documentos',
       (select qual from pg_policies where schemaname = 'public' and tablename = 'ctr_documentos' and policyname = 'ctr_documentos_leer'),
       'ctr_ve_documento_fila(id, equipo_id, obligacion_id, subido_por)'
union all select 'políticas de ctr_contratos y ctr_documentos',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename in ('ctr_contratos', 'ctr_documentos')),
       '8'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')),
       '0';

-- SIGUIENTE: sql/contratos_alta_por_rol_2026-10-05_comprobacion.sql
