-- ============================================================================
-- MÓDULO DE CONTRATOS · COMPROBACIÓN DEL CIERRE DE QA (24/09/2026)
-- Ejecutar después de contratos_qa_2026-09-24.sql. Complementa (no sustituye)
-- a contratos_comprobacion_permisos.sql, que conviene volver a pasar también.
-- ============================================================================
-- Crea filas de prueba (ZZ-TEST-*), se hace pasar por direccion, compras y un
-- usuario de Producción sin rol en el Dashboard, comprueba borrados, anulación
-- de realizadas y notas de tareas, borra las filas de prueba y muestra el
-- informe. Todas las filas deben decir OK.
-- ============================================================================
create temp table if not exists ctr_check_qa (
  orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text
);
truncate ctr_check_qa;

begin;

do $r$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public'
                 and table_name = 'ctr_realizadas' and column_name = 'anulada_por') then
    raise exception 'Falta ejecutar antes contratos_qa_2026-09-24.sql';
  end if;
end;
$r$;

-- ── Filas de prueba (se borran al final) ────────────────────────────────────
insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental) values
  ('ZZ-TEST-ADM',   'Prueba seguro',        'Seguro',        'administracion',  'Póliza de prueba (solo Administración)', 'Vigente'),
  ('ZZ-TEST-CF',    'Prueba mantenimiento', 'Mantenimiento', 'compras_fabrica', 'Revisión de prueba (Compras y fábrica)', 'Vigente'),
  ('ZZ-TEST-MIXTO', 'Prueba renting',       'Renting',       'administracion',  'Carretilla de prueba en renting (mixto)', 'Vigente');
insert into public.ctr_equipos (nombre, tipo, regimen, num_serie)
  values ('ZZ-TEST equipo', 'Elevación', 'renting', 'ZZ-TEST-SN');
insert into public.ctr_contrato_equipo (contrato_id, equipo_id)
  select c.id, e.id from public.ctr_contratos c, public.ctr_equipos e
  where c.codigo = 'ZZ-TEST-MIXTO' and e.num_serie = 'ZZ-TEST-SN';
insert into public.ctr_obligaciones (equipo_id, tipo, etiqueta, periodicidad_meses)
  select id, 'Revisión', 'ZZ-TEST obligación de equipo', 12 from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
insert into public.ctr_realizadas (obligacion_id, fecha, resultado, nota)
  select id, current_date - 1, 'apto', 'ZZ-TEST 1' from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
insert into public.ctr_realizadas (obligacion_id, fecha, resultado, nota)
  select id, current_date - 2, 'apto', 'ZZ-TEST 2' from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
insert into public.ctr_tareas_notas (clave, nota)
  select 'vencido:contrato:' || id, 'ZZ-TEST nota admin' from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
insert into public.ctr_tareas_notas (clave, nota)
  select 'preaviso:contrato:' || id, 'ZZ-TEST nota mixto' from public.ctr_contratos where codigo = 'ZZ-TEST-MIXTO';
insert into public.ctr_tareas_notas (clave, nota)
  select 'cierre:obligacion:' || id, 'ZZ-TEST nota equipo' from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';

-- ── Comprobaciones ──────────────────────────────────────────────────────────
do $c$
declare
  u_direccion uuid; u_compras uuid; u_produccion uuid;
  n int; obtenido text; detalle text; quien uuid;
  id_adm bigint; id_cf bigint; id_mixto bigint; id_ob bigint; id_r1 bigint; id_r2 bigint;
begin
  select user_id into u_direccion from public.app_user_roles where app = 'dashboard' and role = 'direccion' order by created_at limit 1;
  select user_id into u_compras   from public.app_user_roles where app = 'dashboard' and role = 'compras'   order by created_at limit 1;
  select r.user_id into u_produccion from public.app_user_roles r
    where r.app = 'produccion'
      and not exists (select 1 from public.app_user_roles d where d.user_id = r.user_id and d.app = 'dashboard')
    order by r.created_at limit 1;
  select id into id_adm   from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
  select id into id_cf    from public.ctr_contratos where codigo = 'ZZ-TEST-CF';
  select id into id_mixto from public.ctr_contratos where codigo = 'ZZ-TEST-MIXTO';
  select id into id_ob    from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
  select id into id_r1    from public.ctr_realizadas where nota = 'ZZ-TEST 1';
  select id into id_r2    from public.ctr_realizadas where nota = 'ZZ-TEST 2';

  if u_direccion is null then insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values ('direccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_compras   is null then insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values ('compras',   'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_produccion is null then insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values ('produccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;

  -- ═══ COMPRAS ═══
  if u_compras is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_compras, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_compras::text, true);

    -- F1 · borrados
    begin
      perform set_config('role', 'authenticated', true);
      delete from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede borrar un equipo', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      delete from public.ctr_realizadas where id = id_r1;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede borrar una realizada', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      delete from public.ctr_contratos where id = id_cf;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede borrar un contrato de su vista', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- F1 · realizadas: fecha y resultado no se reescriben; anular sí, una vez y con autor
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set fecha = current_date - 30 where id = id_r1;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede cambiar la fecha de una realizada', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set resultado = 'no apto' where id = id_r1;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede cambiar el resultado de una realizada', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set anulada = true where id = id_r1;
      get diagnostics n = row_count;
      obtenido := n::text; detalle := null;
    exception when others then obtenido := 'error'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí puede anular una realizada (filas tocadas)', '1', obtenido, case when obtenido = '1' then 'OK' else 'FALLO' end, detalle);

    select anulada_por into quien from public.ctr_realizadas where id = id_r1;
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'la anulación guarda quién la hizo', 'usuario de compras', case when quien = u_compras then 'usuario de compras' else coalesce(quien::text, 'vacío') end,
       case when quien = u_compras then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set anulada = false where id = id_r1;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede deshacer una anulación', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- F2 · notas de tareas
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas_notas where clave = 'vencido:contrato:' || id_adm;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no lee la nota de un aviso de contrato de Administración', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas_notas where clave in ('preaviso:contrato:' || id_mixto, 'cierre:obligacion:' || id_ob);
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'lee las notas del mixto y de su equipo', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    update public.ctr_tareas_notas set pospuesta_hasta = current_date + 365 where clave = 'preaviso:contrato:' || id_mixto;
    get diagnostics n = row_count;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no puede posponer el aviso del mixto (filas tocadas)', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, nota) values ('sinvenc:contrato:' || id_adm, 'ZZ-TEST intento compras');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede crear notas sobre un contrato de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, nota) values ('otra:contrato:abc', 'ZZ-TEST clave rara');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no acepta claves mal formadas', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, nota) values ('fecha:obligacion:' || id_ob, 'ZZ-TEST compras');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí puede anotar tareas de su equipo', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ DIRECCIÓN ═══
  if u_direccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_direccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_direccion::text, true);

    begin
      perform set_config('role', 'authenticated', true);
      delete from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'tampoco borra equipos (baja lógica)', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set anulada = true where id = id_r2;
      get diagnostics n = row_count;
      obtenido := n::text; detalle := null;
    exception when others then obtenido := 'error'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí puede anular una realizada (filas tocadas)', '1', obtenido, case when obtenido = '1' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas_notas where nota like 'ZZ-TEST nota%';
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 'lee todas las notas de prueba', '3', n::text, case when n = 3 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    update public.ctr_tareas_notas set pospuesta_hasta = current_date + 7 where clave = 'vencido:contrato:' || id_adm;
    get diagnostics n = row_count;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 'sí pospone un aviso de Administración (filas tocadas)', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);
  end if;

  -- ═══ PRODUCCIÓN (sin rol en el Dashboard) ═══
  if u_produccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_produccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_produccion::text, true);
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas_notas;
    perform set_config('role', 'none', true);
    insert into ctr_check_qa (quien, comprobacion, esperado, obtenido, resultado) values
      ('produccion', 'no lee ninguna nota de tareas', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);
  end if;

  perform set_config('role', 'none', true);
end;
$c$;

-- ── Limpieza de las filas de prueba (como postgres) ─────────────────────────
delete from public.ctr_tareas_notas where nota like 'ZZ-TEST%';
delete from public.ctr_obligaciones where etiqueta like 'ZZ-TEST%';   -- arrastra sus realizadas
delete from public.ctr_equipos      where num_serie = 'ZZ-TEST-SN';
delete from public.ctr_contratos    where codigo like 'ZZ-TEST-%';

do $l$
declare n int;
begin
  select (select count(*) from public.ctr_contratos where codigo like 'ZZ-TEST-%')
       + (select count(*) from public.ctr_equipos where nombre like 'ZZ-TEST%')
       + (select count(*) from public.ctr_realizadas where nota like 'ZZ-TEST%')
       + (select count(*) from public.ctr_tareas_notas where nota like 'ZZ-TEST%') into n;
  if n > 0 then raise exception 'Quedan % filas de prueba: se deshace todo', n; end if;
end;
$l$;

commit;

-- Informe
select orden, quien, comprobacion, esperado, obtenido, resultado, detalle
from ctr_check_qa
order by orden;
