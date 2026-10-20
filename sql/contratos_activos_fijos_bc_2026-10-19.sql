-- ============================================================================
-- Contratos · códigos de activo fijo de BC en 6 equipos (19/10/2026)
-- ============================================================================
-- Cruce del listado de activos fijos de Business Central
-- (Mantenimientos/Activos fijos.xlsx, 203 activos) con los equipos del módulo.
--
-- Se rellenan 2 códigos que faltaban (cierra su tarea «Falta código de activo fijo BC»):
--   · 110 Compresor DRC 60 VF            → 453  (BC AF000453 «COMPRESOR DRC 60 VF 9,5 BAR», nave 19)
--   · 114 Plegadora Amada HRB 1003       → 391  (BC AF000391, nº de serie HRB100262)
--
-- Se quitan 4 códigos equivocados. Venían del listado F16-C de soldadura, pero en BC
-- ese número es otro activo. El código real de estos 4 grupos no está en el listado
-- de BC, así que vuelven a mostrar «Pendiente: sin código en BC» y su tarea, y la
-- explicación queda en observaciones:
--   ·   9 Grupo de soldadura 072 (33531830)  385 → en BC es una remachadora neumática BNT-3
--   ·  11 Grupo de soldadura 074 (33586374)  391 → en BC es la plegadora Amada HRB 100.3
--   ·  24 Grupo de soldadura 077 (34328873)  397 → en BC es un carro metálico Roolbox
--   ·  28 Grupo de soldadura 078 (34328876)  396 → en BC es un banco de embalaje
--
-- El código se guarda corto («453»), como los 46 que ya hay.
--
-- Guardas: antes de tocar nada comprueba que cada equipo sigue siendo el mismo (nº de
-- serie, identificación o nombre) y que su código está como en la carga o ya
-- corregido. Si alguien lo ha cambiado a otra cosa, aborta sin aplicar nada. Se puede
-- ejecutar dos veces: lo que ya está corregido no se vuelve a tocar.
-- Las 6 fichas quedan como modificadas hoy, sin usuario (se ejecuta desde el editor).
--
-- Cómo ejecutarlo: SQL Editor de Supabase, rol «postgres», Ctrl+A, Ctrl+V, Ctrl+Enter.
-- El resultado es una tabla de 6 filas: todas deben salir «OK».
-- Marcha atrás: contratos_activos_fijos_bc_2026-10-19_MARCHA_ATRAS.sql
-- No toca reglas de acceso ni privilegios: no hace falta repetir las comprobaciones
-- de permisos.
-- ============================================================================

begin;

do $r$
begin
  if to_regclass('public.ctr_equipos') is null then
    raise exception 'No existe public.ctr_equipos: este script es para el proyecto de producción del Dashboard';
  end if;
end;
$r$;

-- «AF000385», «000385» y «385» son el mismo código
create or replace function pg_temp.af_norm(x text) returns text language sql immutable as $f$
  select nullif(ltrim(regexp_replace(upper(btrim(coalesce(x, ''))), '^AF', ''), '0'), '')
$f$;

create temp table _af_cambios (
  id        bigint primary key,
  identidad text not null,   -- debe seguir apareciendo en el nº de serie, la identificación o el nombre
  antes     text,            -- código en la carga (null = vacío)
  despues   text,            -- código que queda (null = se vacía)
  nota      text             -- se añade a observaciones
) on commit drop;

insert into _af_cambios (id, identidad, antes, despues, nota) values
  (110, 'DRC 60',    null,  '453', null),
  (114, 'HRB100262', null,  '391', null),
  (9,   '33531830',  '385', null,  'Código de activo fijo 385 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000385 es una remachadora neumática BNT-3. Falta el código real.'),
  (11,  '33586374',  '391', null,  'Código de activo fijo 391 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000391 es la plegadora Amada HRB 100.3. Falta el código real.'),
  (24,  '34328873',  '397', null,  'Código de activo fijo 397 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000397 es un carro metálico Roolbox. Falta el código real.'),
  (28,  '34328876',  '396', null,  'Código de activo fijo 396 retirado el 19/10/2026: venía del listado F16-C y en BC el AF000396 es un banco de embalaje. Falta el código real.');

-- ── Guarda previa ──────────────────────────────────────────────────────────
do $r$
declare
  fallos text;
begin
  select string_agg(format('equipo %s: %s', c.id, motivo), '; ' order by c.id) into fallos
  from _af_cambios c
  left join public.ctr_equipos e on e.id = c.id
  cross join lateral (select case
    when e.id is null then 'ya no existe'
    when position(upper(c.identidad) in upper(concat_ws(' ', e.num_serie, e.identificacion, e.nombre))) = 0
      then format('ya no es el mismo equipo (se esperaba «%s», ahora es «%s»)', c.identidad, e.nombre)
    when pg_temp.af_norm(e.activo_fijo_bc) is distinct from c.antes
     and pg_temp.af_norm(e.activo_fijo_bc) is distinct from c.despues
      then format('alguien ha puesto el código «%s»: revisarlo a mano', e.activo_fijo_bc)
    end as motivo) m
  where m.motivo is not null;

  if fallos is not null then
    raise exception 'No se aplica nada. %', fallos;
  end if;
end;
$r$;

-- ── Cambios (solo los que siguen como en la carga) ────────────────────────
update public.ctr_equipos e
set activo_fijo_bc = c.despues,
    observaciones = case
      when c.nota is null then e.observaciones
      when nullif(btrim(e.observaciones), '') is null then c.nota
      else e.observaciones || ' · ' || c.nota
    end
from _af_cambios c
where e.id = c.id
  and pg_temp.af_norm(e.activo_fijo_bc) is not distinct from c.antes;

-- ── Guarda final: cada código que se pone queda en un solo equipo ─────────
do $r$
declare
  fallos text;
begin
  select string_agg(format('el código %s está en %s equipos (%s)', c.despues, x.n, x.ids), '; ') into fallos
  from _af_cambios c
  cross join lateral (
    select count(*) as n, string_agg(e.id::text, ', ' order by e.id) as ids
    from public.ctr_equipos e
    where pg_temp.af_norm(e.activo_fijo_bc) = c.despues) x
  where c.despues is not null and x.n <> 1;

  if fallos is not null then
    raise exception 'No se aplica nada. %', fallos;
  end if;
end;
$r$;

commit;

-- ── Resultado: las 6 filas deben salir «OK» ────────────────────────────────
select e.id, e.nombre, e.activo_fijo_bc as codigo_ahora, v.esperado,
       case when pg_temp.af_norm(e.activo_fijo_bc) is not distinct from v.esperado then 'OK' else 'REVISAR' end as resultado
from (values (110, '453'), (114, '391'), (9, null), (11, null), (24, null), (28, null)) as v(id, esperado)
join public.ctr_equipos e on e.id = v.id
order by e.id;
