-- ============================================================================
-- DASHBOARD · bucket doc-previews (módulo documental retirado): cerrar escritura
-- Hallazgo del diagnóstico general de permisos del 16-oct-2026.
-- ============================================================================
-- Dos políticas de storage dejan a CUALQUIER usuario con sesión insertar y
-- borrar objetos en doc-previews (54 ficheros, 102 MB). Ninguna app lo usa ya.
-- Se borran las dos políticas; el bucket sigue privado y solo la clave de
-- servicio podría tocarlo. Marcha atrás: supabase/migrations/20260224000001_storage_bucket.sql.
-- ============================================================================
begin;
drop policy if exists "service_insert_previews" on storage.objects;
drop policy if exists "service_delete_previews" on storage.objects;
commit;

select policyname, cmd, roles from pg_policies
where schemaname = 'storage' and tablename = 'objects' and qual ilike '%doc-previews%' or with_check ilike '%doc-previews%';
-- Esperado: ninguna fila.
