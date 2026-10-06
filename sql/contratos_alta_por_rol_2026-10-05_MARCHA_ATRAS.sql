-- ============================================================================
-- MARCHA ATRÁS de contratos_alta_por_rol_2026-10-05.sql
-- Deja las reglas de lectura de contratos y documentos como estaban el 24/09/2026.
-- Ojo: con ellas el rol compras vuelve a no poder subir documentos ni crear
-- contratos desde la app. No toca datos.
-- ============================================================================
begin;

-- (06/10/2026) Si la migración del 06/10 está aplicada, deshacer esta volvería a abrir F5:
-- primero contratos_documentos_por_contrato_2026-10-06_MARCHA_ATRAS.sql.
do $s$
begin
  if exists (select 1 from pg_policies
             where schemaname = 'public' and tablename = 'ctr_documento_contrato'
               and policyname = 'ctr_documento_contrato_escribir'
               and with_check like '%ctr_ve_documento(documento_id)%') then
    raise exception 'NO SE HA APLICADO NADA: antes hay que deshacer contratos_documentos_por_contrato_2026-10-06.sql con su _MARCHA_ATRAS';
  end if;
end;
$s$;

create or replace function public.ctr_ve_contrato(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then exists (
      select 1 from public.ctr_contratos c
      where c.id = p_id and (
        c.vista = 'compras_fabrica'
        or exists (select 1 from public.ctr_contrato_equipo ce where ce.contrato_id = c.id)))
    else false end;
$f$;

create or replace function public.ctr_ve_documento(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then exists (
      select 1 from public.ctr_documentos d
      where d.id = p_id and (
        d.equipo_id is not null
        or (d.obligacion_id is not null and public.ctr_ve_obligacion(d.obligacion_id))
        or exists (select 1 from public.ctr_documento_contrato dc
                   where dc.documento_id = d.id and public.ctr_ve_contrato(dc.contrato_id))
        or (d.subido_por = auth.uid() and d.equipo_id is null and d.obligacion_id is null
            and not exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = d.id))))
    else false end;
$f$;

revoke all on function public.ctr_ve_contrato(bigint)  from public, anon;
revoke all on function public.ctr_ve_documento(bigint) from public, anon;
grant execute on function public.ctr_ve_contrato(bigint)  to authenticated;
grant execute on function public.ctr_ve_documento(bigint) to authenticated;

drop policy if exists ctr_contratos_leer on public.ctr_contratos;
create policy ctr_contratos_leer on public.ctr_contratos for select to authenticated
  using (public.ctr_ve_contrato(id));

drop policy if exists ctr_documentos_leer on public.ctr_documentos;
create policy ctr_documentos_leer on public.ctr_documentos for select to authenticated
  using (public.ctr_ve_documento(id));

drop function if exists public.ctr_ve_contrato_fila(bigint, text);
drop function if exists public.ctr_ve_documento_fila(bigint, bigint, bigint, uuid);

commit;

select 'regla de lectura de ctr_contratos' as comprobacion,
       (select qual from pg_policies where schemaname = 'public' and tablename = 'ctr_contratos' and policyname = 'ctr_contratos_leer') as valor,
       'ctr_ve_contrato(id)' as esperado
union all select 'regla de lectura de ctr_documentos',
       (select qual from pg_policies where schemaname = 'public' and tablename = 'ctr_documentos' and policyname = 'ctr_documentos_leer'),
       'ctr_ve_documento(id)'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')),
       '0';
