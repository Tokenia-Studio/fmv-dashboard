-- ============================================================================
-- MARCHA ATRÁS de contratos_qa_2026-09-24.sql
-- Deja los permisos como estaban el 23/09/2026. No borra las columnas nuevas
-- (renovacion_meses, anulada_por, anulada_en) para no perder lo que se haya
-- rellenado: la app anterior simplemente las ignora.
-- ============================================================================
begin;

grant delete on table public.ctr_contratos, public.ctr_grupos_equipos, public.ctr_equipos,
                     public.ctr_obligaciones, public.ctr_realizadas, public.ctr_realizada_unidades to authenticated;
grant update on table public.ctr_realizadas, public.ctr_realizada_unidades to authenticated;
grant insert, update, delete on table public.ctr_lecturas to authenticated;

drop trigger if exists ctr_realizadas_proteger on public.ctr_realizadas;
drop function if exists public.ctr_proteger_realizada();

drop policy if exists ctr_tareas_notas_leer   on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_crear  on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_editar on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_borrar on public.ctr_tareas_notas;
create policy ctr_tareas_notas_acceso on public.ctr_tareas_notas for all to authenticated
  using ((select public.app_rol('dashboard')) in ('direccion','compras'))
  with check ((select public.app_rol('dashboard')) in ('direccion','compras'));
drop function if exists public.ctr_permiso_clave(text, boolean);

commit;

select 'políticas de ctr_tareas_notas' as comprobacion,
       (select string_agg(policyname, ', ') from pg_policies where schemaname = 'public' and tablename = 'ctr_tareas_notas') as valor,
       'ctr_tareas_notas_acceso' as esperado;
