-- ============================================================================
-- MÓDULO DE CONTRATOS · COMPROBACIÓN DE PERMISOS POR ROL
-- Ejecutar después de las dos migraciones, y antes de cada entrega.
-- ============================================================================
-- Qué hace: crea unas filas de prueba (códigos ZZ-TEST-*), se hace pasar por
-- cada rol con su usuario real (direccion, compras, uno de Producción sin rol
-- en el Dashboard, una sesión sin rol en ninguna app y anon), comprueba lo que
-- cada uno ve y lo que no puede hacer, borra las filas de prueba y muestra el
-- informe. Si algo falla a medias, la transacción se deshace y no queda rastro.
--
-- Cómo leer el resultado: todas las filas deben decir OK. Una fila FALLO es un
-- dato expuesto o un permiso que falta: no entregar hasta corregirlo.
-- Si en alguna fila pone «sin usuario de este rol», no hay ningún usuario con
-- ese rol en app_user_roles y esa parte no se ha podido probar.
-- ============================================================================
create temp table if not exists ctr_check (
  orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text
);
truncate ctr_check;

begin;

do $r$
begin
  if to_regclass('public.ctr_contratos') is null then
    raise exception 'Faltan las tablas ctr_*: ejecutar antes las dos migraciones';
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
insert into public.ctr_obligaciones (contrato_id, tipo, etiqueta)
  select id, 'Revisión', 'ZZ-TEST obligación solo de contrato admin' from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
insert into public.ctr_obligaciones (equipo_id, contrato_id, tipo, etiqueta, periodicidad_meses)
  select e.id, c.id, 'Revisión', 'ZZ-TEST obligación de equipo', 12
  from public.ctr_equipos e, public.ctr_contratos c where e.num_serie = 'ZZ-TEST-SN' and c.codigo = 'ZZ-TEST-MIXTO';
insert into public.ctr_realizadas (obligacion_id, fecha, resultado)
  select id, current_date, 'apto' from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
insert into public.ctr_hitos (contrato_id, tipo, descripcion, fecha)
  select id, 'Pago', 'ZZ-TEST hito admin', current_date + 30 from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
insert into public.ctr_hitos (contrato_id, tipo, descripcion, fecha)
  select id, 'Pago', 'ZZ-TEST hito compras', current_date + 30 from public.ctr_contratos where codigo = 'ZZ-TEST-CF';
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol) values
  ('zz-test/admin.pdf',  'admin.pdf',  'póliza',      'origen'),
  ('zz-test/equipo.pdf', 'equipo.pdf', 'certificado', 'cierre');
update public.ctr_documentos set equipo_id = (select id from public.ctr_equipos where num_serie = 'ZZ-TEST-SN')
  where ruta = 'zz-test/equipo.pdf';
insert into public.ctr_documento_contrato (documento_id, contrato_id)
  select d.id, c.id from public.ctr_documentos d, public.ctr_contratos c
  where d.ruta = 'zz-test/admin.pdf' and c.codigo = 'ZZ-TEST-ADM';
insert into public.ctr_tareas (tipo, texto, vista) values
  ('Confirmar', 'ZZ-TEST tarea admin',   'administracion'),
  ('Confirmar', 'ZZ-TEST tarea compras', 'compras_fabrica');

-- ── Comprobaciones ──────────────────────────────────────────────────────────
do $c$
declare
  u_direccion uuid; u_compras uuid; u_produccion uuid; u_nadie uuid := gen_random_uuid();
  n int; obtenido text; detalle text;

  -- pequeñas ayudas (plpgsql no tiene funciones locales: se repiten las tres líneas)
begin
  select user_id into u_direccion from public.app_user_roles where app = 'dashboard' and role = 'direccion' order by created_at limit 1;
  select user_id into u_compras   from public.app_user_roles where app = 'dashboard' and role = 'compras'   order by created_at limit 1;
  select r.user_id into u_produccion from public.app_user_roles r
    where r.app = 'produccion'
      and not exists (select 1 from public.app_user_roles d where d.user_id = r.user_id and d.app = 'dashboard')
    order by r.created_at limit 1;

  if u_direccion is null then insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values ('direccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_compras   is null then insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values ('compras',   'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_produccion is null then insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values ('produccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;

  -- ═══ COMPRAS ═══
  if u_compras is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_compras, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_compras::text, true);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_contratos where codigo like 'ZZ-TEST-%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've solo su contrato y el mixto (no el seguro)', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no ve el contrato de Administración', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    update public.ctr_contratos set observaciones = 'intento' where codigo = 'ZZ-TEST-ADM';
    get diagnostics n = row_count;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no puede editar el contrato de Administración (filas tocadas)', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    update public.ctr_contratos set observaciones = 'intento' where codigo = 'ZZ-TEST-MIXTO';
    get diagnostics n = row_count;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've el mixto pero no lo edita (filas tocadas)', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    update public.ctr_contratos set observaciones = 'editado por compras' where codigo = 'ZZ-TEST-CF';
    get diagnostics n = row_count;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'sí edita el contrato de su vista (filas tocadas)', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_contratos set vista = 'administracion' where codigo = 'ZZ-TEST-CF';
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede cambiar la vista de un contrato', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental)
        values ('ZZ-TEST-COMPRAS-ADM', 'x', 'Seguro', 'administracion', 'intento', 'Vigente');
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede crear un contrato de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_contrato_equipo (contrato_id, equipo_id)
        select c.id, e.id from public.ctr_contratos c, public.ctr_equipos e where c.codigo = 'ZZ-TEST-ADM' and e.num_serie = 'ZZ-TEST-SN';
      get diagnostics n = row_count;
      obtenido := case when n = 0 then 'bloqueado' else 'permitido' end; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede hacerse visible un contrato de Administración enlazándole un equipo', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_obligaciones where etiqueta like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've la obligación del equipo y no la del seguro', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_realizadas r join public.ctr_obligaciones o on o.id = r.obligacion_id where o.etiqueta like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've la realizada del equipo', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_hitos where descripcion like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've el hito de su contrato y no el del seguro', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where ruta like 'zz-test/%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've el certificado del equipo y no la póliza', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas where texto like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've la tarea de su vista y no la de Administración', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas (tipo, texto, vista) values ('Otro', 'ZZ-TEST intento compras', 'administracion');
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no puede crear tareas en Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_lecturas;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no lee el registro de lecturas', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_lecturas (tipo_lectura, modelo, resultado) values ('contrato', 'prueba', 'ok');
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no escribe en el registro de lecturas', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 've el equipo en renting aunque su contrato sea de Administración', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);
  end if;

  -- ═══ DIRECCIÓN ═══
  if u_direccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_direccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_direccion::text, true);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_contratos where codigo like 'ZZ-TEST-%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've los tres contratos', '3', n::text, case when n = 3 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_obligaciones where etiqueta like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've las dos obligaciones', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where ruta like 'zz-test/%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've los dos documentos', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_tareas where texto like 'ZZ-TEST%';
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 've las dos tareas', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_contratos set vista = 'compras_fabrica' where codigo = 'ZZ-TEST-ADM';
      get diagnostics n = row_count;
      obtenido := case when n = 1 then 'permitido' else 'bloqueado' end; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'sí puede cambiar la vista de un contrato', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      select count(*) into n from public.ctr_lecturas;
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'puede leer el registro de lecturas', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ USUARIO DE PRODUCCIÓN (sin rol en el Dashboard) ═══
  if u_produccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_produccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_produccion::text, true);

    perform set_config('role', 'authenticated', true);
    select (select count(*) from public.ctr_contratos) + (select count(*) from public.ctr_equipos)
         + (select count(*) from public.ctr_obligaciones) + (select count(*) from public.ctr_documentos)
         + (select count(*) from public.ctr_tareas) + (select count(*) from public.ctr_hitos)
         + (select count(*) from public.ctr_realizadas) + (select count(*) from public.ctr_lecturas) into n;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
      ('produccion', 'no ve ninguna fila de ninguna tabla del módulo', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_equipos (nombre, tipo) values ('ZZ-TEST intento produccion', 'Otro');
      obtenido := 'permitido'; detalle := null;
    exception when others then
      obtenido := 'bloqueado'; detalle := sqlerrm;
    end;
    perform set_config('role', 'none', true);
    insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'no puede crear un equipo', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ SESIÓN VÁLIDA SIN ROL EN NINGUNA APP ═══
  perform set_config('request.jwt.claims', json_build_object('sub', u_nadie, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', u_nadie::text, true);
  perform set_config('role', 'authenticated', true);
  select (select count(*) from public.ctr_contratos) + (select count(*) from public.ctr_equipos)
       + (select count(*) from public.ctr_obligaciones) + (select count(*) from public.ctr_documentos) into n;
  perform set_config('role', 'none', true);
  insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado) values
    ('sin rol', 'no ve nada', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

  -- ═══ ANON (sin iniciar sesión) ═══
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform set_config('role', 'anon', true);
    select count(*) into n from public.ctr_contratos;
    obtenido := 'permitido'; detalle := 'ha podido consultar la tabla';
  exception when others then
    obtenido := 'bloqueado'; detalle := sqlerrm;
  end;
  perform set_config('role', 'none', true);
  insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'no puede ni consultar la tabla de contratos', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  begin
    perform set_config('role', 'anon', true);
    perform public.ctr_rol();
    obtenido := 'permitido'; detalle := 'ha podido ejecutar ctr_rol()';
  exception when others then
    obtenido := 'bloqueado'; detalle := sqlerrm;
  end;
  perform set_config('role', 'none', true);
  insert into ctr_check (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'no puede ejecutar las funciones de permiso', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  perform set_config('role', 'none', true);
end;
$c$;

-- ── Limpieza de las filas de prueba (como postgres) ─────────────────────────
delete from public.ctr_documentos  where ruta like 'zz-test/%';
delete from public.ctr_tareas      where texto like 'ZZ-TEST%';
delete from public.ctr_obligaciones where etiqueta like 'ZZ-TEST%';   -- antes que los contratos (contrato_id pasaría a null)
delete from public.ctr_equipos     where num_serie = 'ZZ-TEST-SN';
delete from public.ctr_contratos   where codigo like 'ZZ-TEST-%';

-- Nada de prueba puede quedar
do $l$
declare n int;
begin
  select (select count(*) from public.ctr_contratos where codigo like 'ZZ-TEST-%')
       + (select count(*) from public.ctr_equipos where nombre like 'ZZ-TEST%')
       + (select count(*) from public.ctr_tareas where texto like 'ZZ-TEST%')
       + (select count(*) from public.ctr_documentos where ruta like 'zz-test/%') into n;
  if n > 0 then raise exception 'Quedan % filas de prueba: se deshace todo', n; end if;
end;
$l$;

commit;

-- Informe
select orden, quien, comprobacion, esperado, obtenido, resultado, detalle
from ctr_check
order by orden;
