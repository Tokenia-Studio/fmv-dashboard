-- ============================================================================
-- MARCHA ATRÁS de contratos_documentos_por_contrato_2026-10-06.sql
-- Deja la regla de lectura de documentos y la de los enlaces documento—contrato
-- como estaban el 05/10/2026.
-- Ojo: vuelve a abrir los dos huecos (F5 y F9): compras lee los documentos de un
-- equipo aunque respalden un contrato de Administración y puede hacerse visible
-- cualquier documento enlazándolo a un contrato suyo. No toca datos.
-- ============================================================================
begin;

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

revoke all on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) from public, anon;
grant execute on function public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid) to authenticated;

drop policy if exists ctr_documento_contrato_escribir on public.ctr_documento_contrato;
create policy ctr_documento_contrato_escribir on public.ctr_documento_contrato for all to authenticated
  using (public.ctr_edita_contrato(contrato_id))
  with check (public.ctr_edita_contrato(contrato_id));

commit;

select 'regla de los enlaces documento—contrato' as comprobacion,
       (select with_check from pg_policies where schemaname = 'public' and tablename = 'ctr_documento_contrato' and policyname = 'ctr_documento_contrato_escribir') as valor,
       'ctr_edita_contrato(contrato_id)' as esperado
union all select 'políticas sobre tablas ctr_',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'),
       '29'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')),
       '0';
