-- ============================================================================
-- MÓDULO DE CONTRATOS · columna proveedor_corto en ctr_contratos
-- Preparada el 23-sep-2026 · se ejecuta ANTES de la carga inicial (bloque 1.3)
-- ============================================================================
-- Nombre corto del proveedor que va en el nombre de cada fichero
-- (AAAA-MM-DD_Proveedor_Tipo_Objeto[_Ref].pdf) y en la carpeta del bucket.
-- Decisión de Carlos (23/09/2026): vive en el contrato, no en `proveedores`
-- (esa tabla se recarga desde BC y varios proveedores de contratos no tienen nº BC).
-- La carga inicial la rellena con el bloque Proveedor de los ficheros renombrados.
--
-- No cambia ningún permiso: la columna hereda las políticas de ctr_contratos.
-- Idempotente. Marcha atrás: alter table public.ctr_contratos drop column proveedor_corto;
-- ============================================================================
begin;

alter table public.ctr_contratos add column if not exists proveedor_corto text;

alter table public.ctr_contratos drop constraint if exists ctr_contratos_proveedor_corto_formato;
alter table public.ctr_contratos add constraint ctr_contratos_proveedor_corto_formato
  check (proveedor_corto is null or proveedor_corto ~ '^[A-Za-z0-9-]+$');  -- sin espacios, acentos ni signos

commit;

select 'columna proveedor_corto' as comprobacion,
       (select data_type from information_schema.columns
        where table_schema = 'public' and table_name = 'ctr_contratos' and column_name = 'proveedor_corto') as valor,
       'text' as esperado
union all select 'políticas de ctr_contratos (sin cambios)',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'ctr_contratos'), '4';
