-- ============================================================================
-- MARCHA ATRÁS del paso 2 de seguridad
-- Reconstruye las políticas EXACTAMENTE como estaban (estado inseguro) desde
-- public.seg_backup_politicas_20260921. Usar solo si una app deja de funcionar.
-- ============================================================================
begin;

do $r$
declare r record; s text;
begin
  if not exists (select 1 from public.seg_backup_politicas_20260921) then
    raise exception 'No hay copia de políticas: no se puede deshacer';
  end if;
  -- 1) quitar las políticas nuevas de las tablas afectadas
  for r in select p.tablename, p.policyname from pg_policies p
           where p.schemaname = 'public'
             and p.tablename::text in (select tabla from public.seg_backup_politicas_20260921 where esquema = 'public')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
  -- 2) recrear las antiguas tal cual
  for r in select * from public.seg_backup_politicas_20260921 loop
    s := format('create policy %I on %I.%I as %s for %s to %s',
                r.politica, r.esquema, r.tabla, r.permisiva, r.cmd,
                (select string_agg(quote_ident(x::text), ', ') from unnest(r.roles) x));
    if r.qual is not null then s := s || format(' using (%s)', r.qual); end if;
    if r.with_check is not null then s := s || format(' with check (%s)', r.with_check); end if;
    execute s;
  end loop;
end;
$r$;

-- Las funciones de rol de Producción vuelven a estar como estaban
grant execute on function public.prod_get_user_role() to anon;
grant execute on function public.prod_can_edit()      to anon;
grant execute on function public.prod_can_mark_done() to anon;

commit;
select 'marcha atrás del paso 2 aplicada' as resultado,
       (select count(*) from pg_policies where schemaname = 'public')::text as politicas_en_public;
