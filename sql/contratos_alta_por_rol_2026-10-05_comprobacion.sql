-- ============================================================================
-- MÓDULO DE CONTRATOS · COMPROBACIÓN DE ALTAS POR ROL (05/10/2026)
-- Ejecutar después de contratos_alta_por_rol_2026-10-05.sql. Complementa (no
-- sustituye) a contratos_comprobacion_permisos.sql y a
-- contratos_qa_2026-09-24_comprobacion.sql, que conviene volver a pasar también.
-- ============================================================================
-- Las otras dos comprobaciones miraban qué LEE y qué NO puede tocar cada rol, pero
-- las filas de prueba las creaba el propietario: nadie probaba un ALTA hecha por
-- compras tal como la hace la app (crear y releer en la misma orden). Por ese
-- hueco pasó el fallo del 05/10/2026. Esto lo cubre.
--
-- Crea filas de prueba (ZZ-TEST-*), se hace pasar por compras, direccion, un
-- usuario de Producción sin rol en el Dashboard y anon, da de alta documentos y
-- contratos como cada uno, borra las filas de prueba y muestra el informe.
-- Todas las filas deben decir OK.
-- ============================================================================
create temp table if not exists ctr_check_alta (
  orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text
);
truncate ctr_check_alta;

begin;

do $r$
begin
  if to_regprocedure('public.ctr_ve_contrato_fila(bigint, text)') is null then
    raise exception 'Falta ejecutar antes contratos_alta_por_rol_2026-10-05.sql';
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
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol) values ('zz-test/admin.pdf', 'admin.pdf', 'poliza', 'origen');
insert into public.ctr_documento_contrato (documento_id, contrato_id)
  select d.id, c.id from public.ctr_documentos d, public.ctr_contratos c
  where d.ruta = 'zz-test/admin.pdf' and c.codigo = 'ZZ-TEST-ADM';

-- ── Comprobaciones ──────────────────────────────────────────────────────────
do $c$
declare
  u_direccion uuid; u_compras uuid; u_produccion uuid;
  n int; obtenido text; detalle text; quien uuid;
  id_adm bigint; id_cf bigint; id_eq bigint; id_doc bigint; id_doc2 bigint; id_nuevo bigint;
begin
  select user_id into u_direccion from public.app_user_roles where app = 'dashboard' and role = 'direccion' order by created_at limit 1;
  select user_id into u_compras   from public.app_user_roles where app = 'dashboard' and role = 'compras'   order by created_at limit 1;
  select r.user_id into u_produccion from public.app_user_roles r
    where r.app = 'produccion'
      and not exists (select 1 from public.app_user_roles d where d.user_id = r.user_id and d.app = 'dashboard')
    order by r.created_at limit 1;
  select id into id_adm from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
  select id into id_cf  from public.ctr_contratos where codigo = 'ZZ-TEST-CF';
  select id into id_eq  from public.ctr_equipos   where num_serie = 'ZZ-TEST-SN';

  if u_direccion is null then insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values ('direccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_compras   is null then insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values ('compras',   'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_produccion is null then insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values ('produccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;

  -- ═══ COMPRAS ═══
  if u_compras is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_compras, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_compras::text, true);

    -- El fallo del 05/10/2026: subir un documento (crear la ficha y releerla)
    id_doc := null;
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/compras-1.pdf', 'compras-1.pdf', 'contrato', 'origen') returning id into id_doc;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí sube un documento (alta con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    select subido_por into quien from public.ctr_documentos where id = id_doc;
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'el documento guarda quién lo subió', 'usuario de compras', case when quien = u_compras then 'usuario de compras' else coalesce(quien::text, 'vacío') end,
       case when quien = u_compras then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_doc, id_cf);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí lo enlaza a un contrato de su vista', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where id = id_doc;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'lo sigue viendo una vez enlazado', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
        values ('zz-test/compras-equipo.pdf', 'compras-equipo.pdf', 'manual', 'otro', id_eq) returning id into id_nuevo;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí sube un documento de un equipo (alta con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    -- El otro fallo del 05/10/2026: crear un contrato
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental)
        values ('ZZ-TEST-ALTA-C', 'Prueba alta compras', 'Mantenimiento', 'compras_fabrica', 'Alta de prueba', 'Vigente') returning id into id_nuevo;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí crea un contrato de su vista (alta con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_contratos set observaciones = 'editado por compras' where codigo = 'ZZ-TEST-CF' returning id into id_nuevo;
      obtenido := case when id_nuevo = id_cf then 'permitido' else 'sin filas' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí edita un contrato de su vista (edición con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    -- Lo que sigue sin poder hacer
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental)
        values ('ZZ-TEST-ALTA-X', 'Prueba alta compras', 'Seguro', 'administracion', 'Alta de prueba', 'Vigente');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no crea contratos de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    id_doc2 := null;
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/compras-2.pdf', 'compras-2.pdf', 'contrato', 'origen') returning id into id_doc2;
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_doc2, id_adm);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; id_doc2 := null; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no enlaza un documento a un contrato de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- Un documento suyo que dirección enlaza a un contrato de Administración deja de ser «suyo»
    perform set_config('role', 'authenticated', true);
    insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
      values ('zz-test/compras-3.pdf', 'compras-3.pdf', 'contrato', 'origen') returning id into id_doc2;
    select count(*) into n from public.ctr_documentos where id = id_doc2;
    perform set_config('role', 'none', true);
    insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_doc2, id_adm);  -- como postgres: lo que haría dirección
    perform set_config('role', 'authenticated', true);
    select n * 10 + count(*) into n from public.ctr_documentos where id = id_doc2;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've su documento suelto (1) y deja de verlo si pasa a un contrato de Administración (0)', '10', n::text, case when n = 10 then 'OK' else 'FALLO' end);

    -- Lo que ya se comprobaba: sigue igual tras el cambio de regla
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_contratos where codigo in ('ZZ-TEST-ADM', 'ZZ-TEST-CF', 'ZZ-TEST-MIXTO');
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've su contrato y el mixto, no el de Administración', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where ruta = 'zz-test/admin.pdf';
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no ve el documento del contrato de Administración', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);
  end if;

  -- ═══ DIRECCIÓN ═══
  if u_direccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_direccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_direccion::text, true);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/direccion-1.pdf', 'direccion-1.pdf', 'contrato', 'origen') returning id into id_nuevo;
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_nuevo, id_adm);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí sube un documento y lo enlaza a un contrato de Administración', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental)
        values ('ZZ-TEST-ALTA-D', 'Prueba alta dirección', 'Seguro', 'administracion', 'Alta de prueba', 'Vigente') returning id into id_nuevo;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí crea un contrato de Administración (alta con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_contratos where codigo like 'ZZ-TEST-%';
    perform set_config('role', 'none', true);
    select count(*) into id_nuevo from public.ctr_contratos where codigo like 'ZZ-TEST-%';
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've todos los contratos de prueba', id_nuevo::text, n::text, case when n = id_nuevo then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where ruta like 'zz-test/%';
    perform set_config('role', 'none', true);
    select count(*) into id_nuevo from public.ctr_documentos where ruta like 'zz-test/%';
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've todos los documentos de prueba', id_nuevo::text, n::text, case when n = id_nuevo then 'OK' else 'FALLO' end);
  end if;

  -- ═══ PRODUCCIÓN (sin rol en el Dashboard) ═══
  if u_produccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_produccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_produccion::text, true);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/produccion.pdf', 'produccion.pdf', 'contrato', 'origen');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'no sube documentos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental)
        values ('ZZ-TEST-ALTA-P', 'Prueba alta producción', 'Mantenimiento', 'compras_fabrica', 'Alta de prueba', 'Vigente');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'no crea contratos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select (select count(*) from public.ctr_contratos) + (select count(*) from public.ctr_documentos) into n;
    perform set_config('role', 'none', true);
    insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado) values
      ('produccion', 'no ve ningún contrato ni documento', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);
  end if;

  -- ═══ SIN SESIÓN (anon) ═══
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform set_config('role', 'anon', true);
    insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
      values ('zz-test/anon.pdf', 'anon.pdf', 'contrato', 'origen');
    obtenido := 'permitido'; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no sube documentos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  begin
    perform set_config('role', 'anon', true);
    select count(*) into n from public.ctr_contratos;
    obtenido := n::text; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_alta (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no lee contratos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  perform set_config('role', 'none', true);
end;
$c$;

-- ── Limpieza de las filas de prueba (como postgres) ─────────────────────────
delete from public.ctr_documentos where ruta like 'zz-test/%';        -- arrastra sus enlaces a contratos
delete from public.ctr_equipos    where num_serie = 'ZZ-TEST-SN';     -- arrastra su enlace al contrato mixto
delete from public.ctr_contratos  where codigo like 'ZZ-TEST-%';

do $l$
declare n int;
begin
  select (select count(*) from public.ctr_contratos where codigo like 'ZZ-TEST-%')
       + (select count(*) from public.ctr_equipos where nombre like 'ZZ-TEST%')
       + (select count(*) from public.ctr_documentos where ruta like 'zz-test/%') into n;
  if n > 0 then raise exception 'Quedan % filas de prueba: se deshace todo', n; end if;
end;
$l$;

commit;

-- Informe
select orden, quien, comprobacion, esperado, obtenido, resultado, detalle
from ctr_check_alta
order by orden;
