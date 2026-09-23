-- ============================================================================
-- MÓDULO DE CONTRATOS Y MANTENIMIENTO · MARCHA ATRÁS
-- Deshace por completo contratos_migracion_2026-09-22.sql y
-- contratos_migracion_bucket_2026-09-22.sql. No toca nada más.
-- ============================================================================
-- BORRA LOS DATOS del módulo (las 13 tablas ctr_ con todo lo que contengan).
-- Los PDF del bucket NO se borran: si el bucket tiene ficheros, se deja tal
-- cual (privado y sin políticas: nadie puede leerlo por la API) y se avisa en
-- el resultado. Para vaciarlo hay que hacerlo a mano desde Storage.
-- ============================================================================
begin;

-- Políticas del bucket
drop policy if exists ctr_storage_leer   on storage.objects;
drop policy if exists ctr_storage_subir  on storage.objects;
drop policy if exists ctr_storage_borrar on storage.objects;

-- Bucket, solo si está vacío
delete from storage.buckets b
where b.id = 'contratos'
  and not exists (select 1 from storage.objects o where o.bucket_id = 'contratos');

-- Tablas (en orden inverso de dependencias; cascade por si queda alguna vista o FK externa)
drop table if exists public.ctr_lecturas            cascade;
drop table if exists public.ctr_tareas_notas        cascade;
drop table if exists public.ctr_tareas              cascade;
drop table if exists public.ctr_hitos               cascade;
drop table if exists public.ctr_realizada_unidades  cascade;
drop table if exists public.ctr_realizadas          cascade;
drop table if exists public.ctr_documento_contrato  cascade;
drop table if exists public.ctr_documentos          cascade;
drop table if exists public.ctr_obligaciones        cascade;
drop table if exists public.ctr_contrato_equipo     cascade;
drop table if exists public.ctr_equipos             cascade;
drop table if exists public.ctr_grupos_equipos      cascade;
drop table if exists public.ctr_contratos           cascade;

-- Funciones (las de trigger caen con las tablas, pero se quitan por si acaso)
drop function if exists public.ctr_edita_documento(bigint);
drop function if exists public.ctr_ve_documento(bigint);
drop function if exists public.ctr_edita_obligacion(bigint);
drop function if exists public.ctr_ve_obligacion(bigint);
drop function if exists public.ctr_edita_obligacion_fila(bigint,bigint,bigint);
drop function if exists public.ctr_ve_obligacion_fila(bigint,bigint,bigint);
drop function if exists public.ctr_edita_contrato(bigint);
drop function if exists public.ctr_ve_contrato(bigint);
drop function if exists public.ctr_rol();
drop function if exists public.ctr_proteger_vista();
drop function if exists public.ctr_autoria_nota();
drop function if exists public.ctr_autoria_registro();
drop function if exists public.ctr_autoria_subida();
drop function if exists public.ctr_autoria();

-- Interruptor del lector
delete from public.configuracion where key = 'ctr_lector_activo';

commit;

select 'tablas ctr_ que quedan' as comprobacion,
       (select count(*)::text from pg_tables where schemaname = 'public' and tablename like 'ctr\_%') as valor, '0' as esperado
union all select 'funciones ctr_ que quedan',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%'), '0'
union all select 'políticas de storage ctr_',
       (select count(*)::text from pg_policies where schemaname = 'storage' and policyname like 'ctr\_storage\_%'), '0'
union all select 'bucket contratos',
       (select case when count(*) = 0 then 'eliminado' else 'CONSERVADO: tiene ficheros, vaciarlo a mano en Storage' end
        from storage.buckets where id = 'contratos'), 'eliminado';
