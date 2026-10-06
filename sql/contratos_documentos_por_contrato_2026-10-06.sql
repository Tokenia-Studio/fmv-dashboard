-- ============================================================================
-- Contratos · un documento que respalda un contrato sigue al contrato (06/10/2026)
-- ============================================================================
-- Cierra dos huecos por los que el rol compras podía leer documentos (ficha y PDF)
-- de contratos de Administración que no ve:
--
--   F5 (QA del 24/09/2026) · A compras le bastaba con que el documento colgara de
--        un equipo, o de una obligación que ve, aunque respaldara un contrato de
--        solo Administración.
--   F9 (visto el 06/10/2026, al preparar el paso a master) · La regla de los enlaces
--        documento—contrato solo miraba el contrato. Compras podía enlazar por la API
--        CUALQUIER documento a un contrato suyo y, con ese enlace, pasaba a verlo.
--        Probado en local con una póliza de Administración sin equipo.
--
-- Regla nueva para compras (dirección sigue viéndolo todo):
--   · El documento respalda algún contrato → lo ve solo si ve alguno de esos contratos
--     (los de su vista y los mixtos). El equipo o la obligación ya no lo abren.
--   · No respalda ninguno → como hasta ahora: los de un equipo, los de una obligación
--     que ve y los que ha subido él mientras no estén enlazados a nada.
--   · Enlazar un documento a un contrato → hay que poder editar el contrato (como
--     hasta ahora) y, además, ver ya el documento.
-- Subir, enlazar a un contrato propio y leer lo propio funciona igual que el 05/10.
-- ctr_ve_documento(id) aplica la misma regla: de ella cuelgan el almacén de PDF,
-- la edición y el borrado de documentos y las notas de tareas.
--
-- No toca datos ni privilegios de tabla. Cómo ejecutarlo: SQL Editor de Supabase,
-- rol «postgres», Ctrl+A, Ctrl+V, Ctrl+Enter. Si la guarda final encuentra algo
-- mal, aborta y no se aplica nada.
-- Marcha atrás: contratos_documentos_por_contrato_2026-10-06_MARCHA_ATRAS.sql
-- Después: contratos_documentos_por_contrato_2026-10-06_comprobacion.sql (suplanta
-- a cada rol) y, como siempre, contratos_comprobacion_permisos.sql,
-- contratos_qa_2026-09-24_comprobacion.sql y contratos_alta_por_rol_2026-10-05_comprobacion.sql.
-- ============================================================================

begin;

do $r$
begin
  if to_regprocedure('public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid)') is null then
    raise exception 'Falta ejecutar antes sql/contratos_alta_por_rol_2026-10-05.sql';
  end if;
end;
$r$;

-- ── F5 · El documento que respalda un contrato sigue al contrato ────────────
create or replace function public.ctr_ve_documento_fila(p_id bigint, p_equipo bigint, p_obligacion bigint, p_subido_por uuid)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then (
      exists (select 1 from public.ctr_documento_contrato dc
              where dc.documento_id = p_id and public.ctr_ve_contrato(dc.contrato_id))
      or (not exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = p_id)
          and (p_equipo is not null
               or (p_obligacion is not null and public.ctr_ve_obligacion(p_obligacion))
               or (p_subido_por = auth.uid() and p_equipo is null and p_obligacion is null))))
    else false end;
$f$;

revoke all on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) from public, anon;
grant execute on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) to authenticated;

-- ── F9 · Para enlazar un documento a un contrato hay que verlo antes ────────
-- La condición se mira sobre la fila nueva antes de guardarla: el enlace que se
-- está creando todavía no cuenta, así que no puede abrirse paso a sí mismo.
drop policy if exists ctr_documento_contrato_escribir on public.ctr_documento_contrato;
create policy ctr_documento_contrato_escribir on public.ctr_documento_contrato for all to authenticated
  using (public.ctr_edita_contrato(contrato_id))
  with check (public.ctr_edita_contrato(contrato_id) and public.ctr_ve_documento(documento_id));

-- ── Guarda: si algo no ha quedado como debe, no se aplica nada ──────────────
do $g$
declare fallo text := ''; n int; f text;
begin
  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename = 'ctr_documento_contrato' and policyname = 'ctr_documento_contrato_escribir'
      and cmd = 'ALL' and roles::text[] = array['authenticated']
      and qual like '%ctr_edita_contrato(contrato_id)%'
      and with_check like '%ctr_edita_contrato(contrato_id)%' and with_check like '%ctr_ve_documento(documento_id)%';
  if n <> 1 then fallo := fallo || ' la regla de los enlaces documento—contrato no ha quedado como se esperaba;'; end if;

  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename = 'ctr_documentos' and policyname = 'ctr_documentos_leer'
      and cmd = 'SELECT' and roles::text[] = array['authenticated']
      and qual like '%ctr_ve_documento_fila(id, equipo_id, obligacion_id, subido_por)%';
  if n <> 1 then fallo := fallo || ' la regla de lectura de ctr_documentos no es la del 05/10/2026;'; end if;

  -- La regla vieja abría el documento con solo tener equipo: que no quede en la función
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname = 'ctr_ve_documento_fila'
      and p.prosrc like '%not exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = p_id)%and (p_equipo is not null%';
  if n <> 1 then fallo := fallo || ' ctr_ve_documento_fila no tiene la regla nueva;'; end if;

  foreach f in array array[
    'public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid)', 'public.ctr_ve_documento(bigint)',
    'public.ctr_edita_documento(bigint)', 'public.ctr_edita_contrato(bigint)'] loop
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
    where s.nspname = 'public' and c.relname in ('ctr_documentos', 'ctr_documento_contrato') and not c.relrowsecurity;
  if n > 0 then fallo := fallo || ' ctr_documentos o ctr_documento_contrato sin RLS;'; end if;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor). Las dos últimas filas son informativas:
-- dicen qué había a la vista de compras y conviene mirarlas.
with visibles as (   -- contratos que ve compras: los de su vista y los mixtos
  select c.id from public.ctr_contratos c
  where c.vista = 'compras_fabrica'
     or exists (select 1 from public.ctr_contrato_equipo ce where ce.contrato_id = c.id)
), destapados as (   -- F5: respaldan solo contratos que compras no ve, pero cuelgan de un equipo u obligación
  select d.nombre_original from public.ctr_documentos d
  where exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = d.id)
    and not exists (select 1 from public.ctr_documento_contrato dc
                    where dc.documento_id = d.id and dc.contrato_id in (select id from visibles))
    and (d.equipo_id is not null
         or exists (select 1 from public.ctr_obligaciones o where o.id = d.obligacion_id
                    and (o.equipo_id is not null or o.grupo_id is not null or o.contrato_id in (select id from visibles))))
), compartidos as (  -- respaldan a la vez un contrato de compras y otro de solo Administración
  select d.nombre_original from public.ctr_documentos d
  where exists (select 1 from public.ctr_documento_contrato dc join public.ctr_contratos c on c.id = dc.contrato_id
                where dc.documento_id = d.id and c.vista = 'compras_fabrica')
    and exists (select 1 from public.ctr_documento_contrato dc
                where dc.documento_id = d.id and dc.contrato_id not in (select id from visibles))
)
select 'regla de los enlaces documento—contrato' as comprobacion,
       (select with_check from pg_policies where schemaname = 'public' and tablename = 'ctr_documento_contrato' and policyname = 'ctr_documento_contrato_escribir') as valor,
       '(ctr_edita_contrato(contrato_id) AND ctr_ve_documento(documento_id))' as esperado
union all select 'regla de lectura de ctr_documentos',
       (select qual from pg_policies where schemaname = 'public' and tablename = 'ctr_documentos' and policyname = 'ctr_documentos_leer'),
       'ctr_ve_documento_fila(id, equipo_id, obligacion_id, subido_por)'
union all select 'políticas sobre tablas ctr_',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'),
       '29'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')),
       '0'
union all select 'documentos que compras deja de ver con este cambio (F5)',
       (select count(*)::text || coalesce(': ' || string_agg(nombre_original, ' · ' order by nombre_original), '') from destapados),
       'informativo: son los que estaban a la vista'
union all select 'documentos que respaldan un contrato de compras y otro de solo Administración',
       (select count(*)::text || coalesce(': ' || string_agg(nombre_original, ' · ' order by nombre_original), '') from compartidos),
       'informativo: compras los ve; revisar que todos deban estar en los dos';

-- SIGUIENTE: sql/contratos_documentos_por_contrato_2026-10-06_comprobacion.sql
