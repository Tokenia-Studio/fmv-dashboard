-- ============================================================================
-- MÓDULO DE CONTRATOS · nº de proveedor en formato Business Central
-- Preparada el 23-sep-2026 · se ejecuta una vez, después de la carga inicial
-- ============================================================================
-- El inventario traía el nº de proveedor sin ceros ('1438'); el maestro
-- `proveedores` y el diario (cod_procedencia) lo guardan con 6 dígitos
-- ('001438'). Sin esto la app no reconoce a ningún proveedor en el maestro y el
-- cruce contratado/contabilizado de la fase 3 no casaría. Solo toca códigos que
-- son únicamente dígitos. Idempotente. No cambia permisos.
-- ============================================================================
begin;

update public.ctr_contratos
   set proveedor_codigo = lpad(proveedor_codigo, 6, '0')
 where proveedor_codigo ~ '^[0-9]{1,5}$';

commit;

select 'contratos con nº BC' as comprobacion,
       count(*) filter (where proveedor_codigo is not null)::text as valor, '—' as esperado
from public.ctr_contratos
union all
select 'de ellos, en el maestro de proveedores',
       count(*) filter (where exists (select 1 from public.proveedores p where p.codigo = c.proveedor_codigo))::text,
       'casi todos (los que no, son proveedores que BC aún no tiene)'
from public.ctr_contratos c
union all
select 'nº con formato distinto de 6 dígitos',
       count(*) filter (where proveedor_codigo is not null and proveedor_codigo !~ '^[0-9]{6}$')::text, '0'
from public.ctr_contratos;
