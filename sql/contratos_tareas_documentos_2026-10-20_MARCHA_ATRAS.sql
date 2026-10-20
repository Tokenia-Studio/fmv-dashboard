-- ============================================================================
-- MARCHA ATRÁS de contratos_tareas_documentos_2026-10-20.sql
-- ============================================================================
-- Quita el descarte de tareas (y los descartes hechos: las tareas vuelven a salir),
-- el control del documento de cierre de las realizadas y el responsable por defecto.
-- Ojo: devuelve a authenticated el permiso de cambiar CUALQUIER columna de
-- ctr_documentos, también la ruta del PDF, y con ello reabre el hueco que cerraba
-- (compras podía apuntar una ficha suya a un PDF sin ficha y leerlo). Solo si la
-- versión anterior de la app lo necesitara: la de antes del 20/10 no cambia fichas.
-- Antes de ejecutarla, publicar la versión anterior de la app: la nueva escribe
-- columnas que esta marcha atrás borra.
-- ============================================================================
begin;

drop trigger if exists ctr_tareas_notas_descarte on public.ctr_tareas_notas;
drop function if exists public.ctr_tareas_notas_descarte();
alter table public.ctr_tareas_notas drop constraint if exists ctr_tareas_notas_descarte_ck;
alter table public.ctr_tareas_notas drop column if exists motivo_descarte;
alter table public.ctr_tareas_notas drop column if exists descartada_texto;
alter table public.ctr_tareas_notas drop column if exists descartada_por;
alter table public.ctr_tareas_notas drop column if exists descartada_en;

drop trigger if exists ctr_realizadas_documento_visible on public.ctr_realizadas;
drop function if exists public.ctr_realizada_documento_visible();

grant update on table public.ctr_documentos to authenticated;

-- Almacén: las reglas del 22/09/2026 (reabre la vía de F10 de crear una ficha sobre un PDF ajeno)
drop policy if exists ctr_storage_leer   on storage.objects;
drop policy if exists ctr_storage_borrar on storage.objects;
create policy ctr_storage_leer on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (
    exists (select 1 from public.ctr_documentos d where d.ruta = name and public.ctr_ve_documento(d.id))
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));
create policy ctr_storage_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (
    exists (select 1 from public.ctr_documentos d where d.ruta = name and public.ctr_edita_documento(d.id))
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));
drop function if exists public.ctr_pdf_visible(text, text);
drop function if exists public.ctr_pdf_editable(text, text);

delete from public.configuracion where key = 'ctr_responsables_por_defecto';

commit;

select 'columnas de descarte en ctr_tareas_notas' as comprobacion,
       (select count(*)::text from information_schema.columns
        where table_schema = 'public' and table_name = 'ctr_tareas_notas'
          and (column_name like 'descart%' or column_name = 'motivo_descarte')) as valor,
       '0' as esperado
union all select 'triggers del 20/10',
       (select count(*)::text from pg_trigger where tgname in ('ctr_tareas_notas_descarte', 'ctr_realizadas_documento_visible')),
       '0'
union all select 'políticas sobre tablas ctr_',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'),
       '29';
