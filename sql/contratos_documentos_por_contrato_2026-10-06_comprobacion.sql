-- ============================================================================
-- MÓDULO DE CONTRATOS · COMPROBACIÓN DE DOCUMENTOS POR CONTRATO (06/10/2026)
-- Ejecutar después de contratos_documentos_por_contrato_2026-10-06.sql. Complementa
-- (no sustituye) a contratos_comprobacion_permisos.sql, a
-- contratos_qa_2026-09-24_comprobacion.sql y a
-- contratos_alta_por_rol_2026-10-05_comprobacion.sql, que hay que volver a pasar.
-- ============================================================================
-- Las comprobaciones anteriores miraban si cada rol ve los documentos de «sus»
-- contratos, pero ninguna probaba (a) un documento de equipo que respalda un
-- contrato de Administración ni (b) que compras intentara ENLAZAR a un contrato
-- suyo un documento que no es suyo. Por esos dos huecos pasaban F5 y F9.
--
-- Crea filas de prueba (ZZ-TEST-*), se hace pasar por compras, direccion, un
-- usuario de Producción sin rol en el Dashboard y anon, borra las filas de prueba
-- y muestra el informe. Todas las filas deben decir OK.
-- No toca el almacén de ficheros: el permiso sobre el PDF se comprueba con
-- ctr_ve_documento(id), que es lo que consulta la regla del almacén.
-- ============================================================================
create temp table if not exists ctr_check_doc (
  orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text
);
truncate ctr_check_doc;

begin;

do $r$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'ctr_documento_contrato'
                   and policyname = 'ctr_documento_contrato_escribir'
                   and with_check like '%ctr_ve_documento(documento_id)%') then
    raise exception 'Falta ejecutar antes contratos_documentos_por_contrato_2026-10-06.sql';
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

-- Documentos: de quién cuelgan y qué contratos respaldan (los crea el propietario: sin autor)
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
  select 'zz-test/' || r, r, 'certificado', 'cierre', e.id
  from public.ctr_equipos e,
       unnest(array['eq-adm.pdf', 'eq-suelto.pdf', 'eq-suelto-2.pdf', 'eq-cf.pdf', 'eq-mixto.pdf', 'eq-adm-cf.pdf']) r
  where e.num_serie = 'ZZ-TEST-SN';
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, obligacion_id)
  select 'zz-test/' || r, r, 'parte de visita', 'cierre', o.id
  from public.ctr_obligaciones o, unnest(array['ob-adm.pdf', 'ob-suelto.pdf']) r
  where o.etiqueta = 'ZZ-TEST obligación de equipo';
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol) values
  ('zz-test/adm.pdf',    'adm.pdf',    'póliza', 'origen'),
  ('zz-test/suelto.pdf', 'suelto.pdf', 'otro',   'otro');
insert into public.ctr_documento_contrato (documento_id, contrato_id)
  select d.id, c.id from public.ctr_documentos d, public.ctr_contratos c
  where (d.ruta, c.codigo) in (
    ('zz-test/eq-adm.pdf',    'ZZ-TEST-ADM'),
    ('zz-test/eq-cf.pdf',     'ZZ-TEST-CF'),
    ('zz-test/eq-mixto.pdf',  'ZZ-TEST-MIXTO'),
    ('zz-test/eq-adm-cf.pdf', 'ZZ-TEST-ADM'),
    ('zz-test/eq-adm-cf.pdf', 'ZZ-TEST-CF'),
    ('zz-test/ob-adm.pdf',    'ZZ-TEST-ADM'),
    ('zz-test/adm.pdf',       'ZZ-TEST-ADM'));

-- ── Comprobaciones ──────────────────────────────────────────────────────────
do $c$
declare
  u_direccion uuid; u_compras uuid; u_produccion uuid;
  n int; m int; obtenido text; detalle text; ve boolean; caso record;
  id_adm bigint; id_cf bigint; id_eq bigint; id_doc bigint;
  d_eq_adm bigint; d_eq_suelto bigint; d_eq_suelto2 bigint; d_eq_cf bigint; d_ob_adm bigint; d_adm bigint; d_suelto bigint;
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
  select id into d_eq_adm     from public.ctr_documentos where ruta = 'zz-test/eq-adm.pdf';
  select id into d_eq_suelto  from public.ctr_documentos where ruta = 'zz-test/eq-suelto.pdf';
  select id into d_eq_suelto2 from public.ctr_documentos where ruta = 'zz-test/eq-suelto-2.pdf';
  select id into d_eq_cf      from public.ctr_documentos where ruta = 'zz-test/eq-cf.pdf';
  select id into d_ob_adm     from public.ctr_documentos where ruta = 'zz-test/ob-adm.pdf';
  select id into d_adm        from public.ctr_documentos where ruta = 'zz-test/adm.pdf';
  select id into d_suelto     from public.ctr_documentos where ruta = 'zz-test/suelto.pdf';

  if u_direccion is null then insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values ('direccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_compras   is null then insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values ('compras',   'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_produccion is null then insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values ('produccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;

  -- ═══ COMPRAS ═══
  if u_compras is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_compras, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_compras::text, true);

    -- Qué ve y qué no (F5): un documento por caso
    for caso in
      select * from (values
        ('zz-test/eq-adm.pdf',    0, 'no ve el documento de un equipo que respalda un contrato de Administración (F5)'),
        ('zz-test/ob-adm.pdf',    0, 'no ve el documento de una obligación que respalda un contrato de Administración (F5)'),
        ('zz-test/adm.pdf',       0, 'no ve el documento de un contrato de Administración'),
        ('zz-test/suelto.pdf',    0, 'no ve un documento suelto que no ha subido él'),
        ('zz-test/eq-suelto.pdf', 1, 'sí ve el documento de un equipo que no respalda ningún contrato'),
        ('zz-test/ob-suelto.pdf', 1, 'sí ve el documento de una obligación de equipo que no respalda ningún contrato'),
        ('zz-test/eq-cf.pdf',     1, 'sí ve el documento de un equipo que respalda un contrato suyo'),
        ('zz-test/eq-mixto.pdf',  1, 'sí ve el documento de un equipo que respalda un contrato mixto'),
        ('zz-test/eq-adm-cf.pdf', 1, 'sí ve el documento que respalda un contrato suyo y otro de Administración')
      ) as t(ruta, esperado, texto)
    loop
      perform set_config('role', 'authenticated', true);
      select count(*) into n from public.ctr_documentos where ruta = caso.ruta;
      perform set_config('role', 'none', true);
      insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
        ('compras', caso.texto, caso.esperado::text, n::text, case when n = caso.esperado then 'OK' else 'FALLO' end);
    end loop;

    -- El PDF: la regla del almacén pregunta a ctr_ve_documento(id)
    perform set_config('role', 'authenticated', true);
    select public.ctr_ve_documento(d_eq_adm) or public.ctr_ve_documento(d_ob_adm) or public.ctr_ve_documento(d_adm) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no puede abrir el PDF de ninguno de los tres documentos de Administración', 'no', case when ve then 'sí' else 'no' end, case when not ve then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select public.ctr_ve_documento(d_eq_suelto) and public.ctr_ve_documento(d_eq_cf) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'sí puede abrir el PDF de los documentos que ve', 'sí', case when ve then 'sí' else 'no' end, case when ve then 'OK' else 'FALLO' end);

    -- Lo que no ve, tampoco lo toca
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set descripcion = 'tocado por compras' where id = d_eq_adm;
      get diagnostics n = row_count;
      delete from public.ctr_documentos where id = d_eq_adm;
      get diagnostics m = row_count;
      obtenido := case when n + m = 0 then 'sin filas' else 'permitido' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no modifica ni borra el documento de equipo de Administración', 'sin filas', obtenido, case when obtenido = 'sin filas' then 'OK' else 'FALLO' end, detalle);

    -- F9: no se hace visible un documento enlazándolo a un contrato suyo
    for caso in
      select * from (values
        (d_adm,    'no enlaza a un contrato suyo un documento de Administración (F9)'),
        (d_eq_adm, 'no enlaza a un contrato suyo el documento de equipo de Administración (F9)'),
        (d_suelto, 'no enlaza a un contrato suyo un documento suelto que no es suyo (F9)')
      ) as t(doc, texto)
    loop
      begin
        perform set_config('role', 'authenticated', true);
        insert into public.ctr_documento_contrato (documento_id, contrato_id) values (caso.doc, id_cf);
        obtenido := 'permitido'; detalle := null;
      exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
      perform set_config('role', 'none', true);
      insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
        ('compras', caso.texto, 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
    end loop;

    begin
      perform set_config('role', 'authenticated', true);
      -- hacia uno que no se ha intentado enlazar arriba: si no, sin el arreglo chocaría con el enlace ya creado
      update public.ctr_documento_contrato set documento_id = d_ob_adm where documento_id = d_eq_cf and contrato_id = id_cf;
      get diagnostics n = row_count;
      obtenido := case when n = 0 then 'sin filas' else 'permitido' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no desvía un enlace suyo hacia un documento de Administración (F9)', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where id in (d_adm, d_eq_adm, d_ob_adm, d_suelto);
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'tras los intentos sigue sin ver ninguno de los cuatro', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    -- Lo que la app hace a diario sigue funcionando
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (d_eq_suelto, id_cf);
      select count(*) into n from public.ctr_documentos where id = d_eq_suelto;
      obtenido := case when n = 1 then 'permitido' else 'enlazado pero ya no lo ve' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí enlaza a un contrato suyo un documento de equipo que ya ve, y lo sigue viendo', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    id_doc := null;
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/compras-1.pdf', 'compras-1.pdf', 'contrato', 'origen') returning id into id_doc;
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_doc, id_cf);
      select count(*) into n from public.ctr_documentos where id = id_doc;
      obtenido := case when n = 1 then 'permitido' else 'enlazado pero ya no lo ve' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí sube un documento, lo enlaza a un contrato suyo y lo ve (como la app)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
        values ('zz-test/compras-equipo.pdf', 'compras-equipo.pdf', 'manual', 'otro', id_eq) returning id into id_doc;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'sí sube un documento de un equipo (alta con relectura)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol)
        values ('zz-test/compras-2.pdf', 'compras-2.pdf', 'contrato', 'origen') returning id into id_doc;
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (id_doc, id_adm);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no enlaza un documento suyo a un contrato de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- Un documento de equipo que dirección enlaza a un contrato de Administración deja de verse
    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where id = d_eq_suelto2;
    perform set_config('role', 'none', true);
    insert into public.ctr_documento_contrato (documento_id, contrato_id) values (d_eq_suelto2, id_adm);  -- como postgres: lo que haría dirección
    perform set_config('role', 'authenticated', true);
    select n * 10 + count(*) into n from public.ctr_documentos where id = d_eq_suelto2;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've un documento de equipo (1) y deja de verlo si pasa a respaldar un contrato de Administración (0)', '10', n::text, case when n = 10 then 'OK' else 'FALLO' end);
  end if;

  -- ═══ DIRECCIÓN ═══
  if u_direccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_direccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_direccion::text, true);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where ruta like 'zz-test/%';
    perform set_config('role', 'none', true);
    select count(*) into m from public.ctr_documentos where ruta like 'zz-test/%';
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've todos los documentos de prueba', m::text, n::text, case when n = m then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (d_suelto, id_adm), (d_suelto, id_cf);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí enlaza un documento a un contrato de Administración y a uno de compras', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set descripcion = 'revisado por dirección' where id = d_eq_adm;
      get diagnostics n = row_count;
      obtenido := case when n = 1 then 'permitido' else 'sin filas' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí modifica el documento de equipo de Administración', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ PRODUCCIÓN (sin rol en el Dashboard) ═══
  if u_produccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_produccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_produccion::text, true);

    perform set_config('role', 'authenticated', true);
    select (select count(*) from public.ctr_documentos) + (select count(*) from public.ctr_documento_contrato) into n;
    select public.ctr_ve_documento(d_eq_suelto) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado) values
      ('produccion', 'no ve ningún documento ni enlace, ni puede abrir un PDF', '0 / no', n::text || ' / ' || case when ve then 'sí' else 'no' end,
       case when n = 0 and not ve then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documento_contrato (documento_id, contrato_id) values (d_eq_suelto, id_cf);
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'no enlaza documentos a contratos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ SIN SESIÓN (anon) ═══
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform set_config('role', 'anon', true);
    select count(*) into n from public.ctr_documentos;
    obtenido := n::text; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no lee documentos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  begin
    perform set_config('role', 'anon', true);
    insert into public.ctr_documento_contrato (documento_id, contrato_id) values (d_eq_suelto, id_cf);
    obtenido := 'permitido'; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no enlaza documentos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  begin
    perform set_config('role', 'anon', true);
    select public.ctr_ve_documento(d_eq_suelto) into ve;
    obtenido := case when ve then 'sí' else 'no' end; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_doc (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no puede preguntar por un documento', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  perform set_config('role', 'none', true);
end;
$c$;

-- ── Limpieza de las filas de prueba (como postgres) ─────────────────────────
delete from public.ctr_documentos where ruta like 'zz-test/%';        -- arrastra sus enlaces a contratos
delete from public.ctr_equipos    where num_serie = 'ZZ-TEST-SN';     -- arrastra su obligación y su enlace al contrato mixto
delete from public.ctr_contratos  where codigo like 'ZZ-TEST-%';

do $l$
declare n int;
begin
  select (select count(*) from public.ctr_contratos where codigo like 'ZZ-TEST-%')
       + (select count(*) from public.ctr_equipos where nombre like 'ZZ-TEST%')
       + (select count(*) from public.ctr_obligaciones where etiqueta like 'ZZ-TEST%')
       + (select count(*) from public.ctr_documentos where ruta like 'zz-test/%') into n;
  if n > 0 then raise exception 'Quedan % filas de prueba: se deshace todo', n; end if;
end;
$l$;

commit;

-- Informe
select orden, quien, comprobacion, esperado, obtenido, resultado, detalle
from ctr_check_doc
order by orden;
