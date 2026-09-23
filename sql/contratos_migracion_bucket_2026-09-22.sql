-- ============================================================================
-- MÓDULO DE CONTRATOS Y MANTENIMIENTO · MIGRACIÓN 2 de 2: BUCKET PRIVADO
-- Preparada el 22-sep-2026 · Ejecutar DESPUÉS de contratos_migracion_2026-09-22.sql
-- ============================================================================
-- Bucket 'contratos': PRIVADO, solo PDF, 20 MB por fichero. Los PDF se sirven
-- con enlaces firmados de corta duración desde la app.
--   · Leer un PDF   → quien puede leer su ficha en ctr_documentos; o quien lo
--                     acaba de subir y aún no le ha creado la ficha.
--   · Subir         → direccion y compras.
--   · Borrar        → quien puede editar la ficha; o su propia subida huérfana.
--   · Sobrescribir  → nadie (sin política de UPDATE): un PDF no se pisa.
-- Idempotente y con guarda: si el bucket quedara público, no se aplica nada.
-- ============================================================================
begin;

do $r$
begin
  if to_regclass('public.ctr_documentos') is null then
    raise exception 'Faltan las tablas ctr_*: ejecutar antes sql/contratos_migracion_2026-09-22.sql';
  end if;
end;
$r$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos', 'contratos', false, 20971520, array['application/pdf']::text[])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ctr_storage_leer   on storage.objects;
drop policy if exists ctr_storage_subir  on storage.objects;
drop policy if exists ctr_storage_borrar on storage.objects;

create policy ctr_storage_leer on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (
    exists (select 1 from public.ctr_documentos d where d.ruta = name and public.ctr_ve_documento(d.id))
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));

create policy ctr_storage_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'contratos' and (select public.app_rol('dashboard')) in ('direccion','compras'));

create policy ctr_storage_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (
    exists (select 1 from public.ctr_documentos d where d.ruta = name and public.ctr_edita_documento(d.id))
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));

-- Guarda
do $g$
declare fallo text := ''; n int;
begin
  if not exists (select 1 from storage.buckets where id = 'contratos' and public = false) then
    fallo := fallo || ' el bucket contratos no existe o es público;'; end if;
  select count(*) into n from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'ctr\_storage\_%';
  if n <> 3 then fallo := fallo || format(' %s políticas de storage, se esperaban 3;', n); end if;
  select count(*) into n from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'ctr\_storage\_%'
      and ('anon' = any(roles::text[]) or 'public' = any(roles::text[]));
  if n > 0 then fallo := fallo || ' política de storage concedida a anon/public;'; end if;
  if fallo <> '' then raise exception 'MIGRACIÓN DEL BUCKET ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

select 'bucket contratos privado' as comprobacion,
       (select case when public then 'NO' else 'sí' end from storage.buckets where id = 'contratos') as valor,
       'sí' as esperado
union all select 'tamaño máximo por fichero (bytes)',
       (select file_size_limit::text from storage.buckets where id = 'contratos'), '20971520'
union all select 'tipos admitidos',
       (select array_to_string(allowed_mime_types, ',') from storage.buckets where id = 'contratos'), 'application/pdf'
union all select 'políticas del bucket',
       (select count(*)::text from pg_policies
        where schemaname = 'storage' and tablename = 'objects' and policyname like 'ctr\_storage\_%'), '3';

-- SIGUIENTE: sql/contratos_comprobacion_permisos.sql
