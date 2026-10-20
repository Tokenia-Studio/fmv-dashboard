-- ============================================================================
-- MARCHA ATRÁS · Contratos · códigos de activo fijo de BC en 6 equipos (19/10/2026)
-- ============================================================================
-- Deshace contratos_activos_fijos_bc_2026-10-19.sql:
--   · 110 Compresor DRC 60 VF y 114 Plegadora Amada HRB 1003 vuelven a quedar sin código.
--   · Los grupos de soldadura 072, 074, 077 y 078 recuperan 385, 391, 397 y 396 y se
--     quita de sus observaciones la nota del 19/10/2026.
--
-- Solo deshace lo que siga como lo dejó el script. Si alguien ha cambiado después el
-- código de alguno de los 6, aborta sin tocar nada. Se puede ejecutar dos veces.
--
-- Cómo ejecutarlo: SQL Editor de Supabase, rol «postgres», Ctrl+A, Ctrl+V, Ctrl+Enter.
-- El resultado es una tabla de 6 filas: todas deben salir «OK».
-- ============================================================================

begin;

do $r$
begin
  if to_regclass('public.ctr_equipos') is null then
    raise exception 'No existe public.ctr_equipos: este script es para el proyecto de producción del Dashboard';
  end if;
end;
$r$;

create or replace function pg_temp.af_norm(x text) returns text language sql immutable as $f$
  select nullif(ltrim(regexp_replace(upper(btrim(coalesce(x, ''))), '^AF', ''), '0'), '')
$f$;

-- Al revés que en el script: «antes» es lo que dejó y «despues» lo que había
create temp table _af_cambios (
  id      bigint primary key,
  antes   text,
  despues text,
  nota    text
) on commit drop;

insert into _af_cambios (id, antes, despues, nota) values
  (110, '453', null,  null),
  (114, '391', null,  null),
  (9,   null,  '385', 'Código de activo fijo 385 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000385 es una remachadora neumática BNT-3. Falta el código real.'),
  (11,  null,  '391', 'Código de activo fijo 391 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000391 es la plegadora Amada HRB 100.3. Falta el código real.'),
  (24,  null,  '397', 'Código de activo fijo 397 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000397 es un carro metálico Roolbox. Falta el código real.'),
  (28,  null,  '396', 'Código de activo fijo 396 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000396 es un banco de embalaje. Falta el código real.');

do $r$
declare
  fallos text;
begin
  select string_agg(format('equipo %s: %s', c.id, motivo), '; ' order by c.id) into fallos
  from _af_cambios c
  left join public.ctr_equipos e on e.id = c.id
  cross join lateral (select case
    when e.id is null then 'ya no existe'
    when pg_temp.af_norm(e.activo_fijo_bc) is distinct from c.antes
     and pg_temp.af_norm(e.activo_fijo_bc) is distinct from c.despues
      then format('alguien ha puesto el código «%s»: revisarlo a mano', e.activo_fijo_bc)
    end as motivo) m
  where m.motivo is not null;

  if fallos is not null then
    raise exception 'No se deshace nada. %', fallos;
  end if;
end;
$r$;

-- Los vaciados primero, para que el 391 no esté nunca en dos equipos a la vez
update public.ctr_equipos e
set activo_fijo_bc = null
from _af_cambios c
where e.id = c.id and c.despues is null
  and pg_temp.af_norm(e.activo_fijo_bc) is not distinct from c.antes;

update public.ctr_equipos e
set activo_fijo_bc = c.despues,
    observaciones = nullif(btrim(replace(replace(coalesce(e.observaciones, ''), ' · ' || c.nota, ''), c.nota, '')), '')
from _af_cambios c
where e.id = c.id and c.despues is not null
  and pg_temp.af_norm(e.activo_fijo_bc) is not distinct from c.antes;

commit;

select e.id, e.nombre, e.activo_fijo_bc as codigo_ahora, v.esperado,
       case when pg_temp.af_norm(e.activo_fijo_bc) is not distinct from v.esperado
             and position('retirado el 19/10/2026' in coalesce(e.observaciones, '')) = 0
            then 'OK' else 'REVISAR' end as resultado
from (values (110, null), (114, null), (9, '385'), (11, '391'), (24, '397'), (28, '396')) as v(id, esperado)
join public.ctr_equipos e on e.id = v.id
order by e.id;
