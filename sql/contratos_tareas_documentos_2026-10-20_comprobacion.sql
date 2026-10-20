-- ============================================================================
-- MÓDULO DE CONTRATOS · COMPROBACIÓN DE DESCARTES, FICHAS DE DOCUMENTO Y CIERRES (20/10/2026)
-- Ejecutar después de contratos_tareas_documentos_2026-10-20.sql. Complementa (no
-- sustituye) a las comprobaciones anteriores del módulo, que hay que volver a pasar.
-- ============================================================================
-- Crea filas de prueba (ZZ-TEST-*), se hace pasar por compras, direccion, un usuario
-- de Producción sin rol en el Dashboard y anon, borra las filas de prueba y muestra
-- el informe. Todas las filas deben decir OK.
-- Incluye los dos intentos de «ganar lectura escribiendo» que abre esta pantalla:
-- apuntar la ficha de un documento a otro PDF y colgar de una realizada propia un
-- documento que no se ve.
-- ============================================================================
create temp table if not exists ctr_check_tar (
  orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text
);
truncate ctr_check_tar;

begin;

do $r$
begin
  if to_regprocedure('public.ctr_tareas_notas_descarte()') is null then
    raise exception 'Falta ejecutar antes contratos_tareas_documentos_2026-10-20.sql';
  end if;
end;
$r$;

-- ── Filas de prueba (se borran al final) ────────────────────────────────────
insert into public.ctr_contratos (codigo, proveedor_nombre, categoria, vista, objeto, estado_documental) values
  ('ZZ-TEST-ADM', 'Prueba seguro',        'Seguro',        'administracion',  'Póliza de prueba (solo Administración)', 'Vigente'),
  ('ZZ-TEST-CF',  'Prueba mantenimiento', 'Mantenimiento', 'compras_fabrica', 'Revisión de prueba (Compras y fábrica)', 'Vigente');
insert into public.ctr_equipos (nombre, tipo, regimen, num_serie)
  values ('ZZ-TEST equipo', 'Elevación', 'propio', 'ZZ-TEST-SN');
insert into public.ctr_obligaciones (equipo_id, tipo, etiqueta, periodicidad_meses)
  select id, 'Revisión', 'ZZ-TEST obligación de equipo', 12 from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
insert into public.ctr_realizadas (obligacion_id, fecha, resultado)
  select id, current_date - 10, 'apto' from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
  select 'zz-test/eq.pdf', 'eq.pdf', 'certificado', 'cierre', id from public.ctr_equipos where num_serie = 'ZZ-TEST-SN';
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol) values ('zz-test/adm.pdf', 'adm.pdf', 'poliza', 'origen');
insert into public.ctr_documento_contrato (documento_id, contrato_id)
  select d.id, c.id from public.ctr_documentos d, public.ctr_contratos c where d.ruta = 'zz-test/adm.pdf' and c.codigo = 'ZZ-TEST-ADM';

-- ── Comprobaciones ──────────────────────────────────────────────────────────
do $c$
declare
  u_direccion uuid; u_compras uuid; u_produccion uuid;
  n int; obtenido text; detalle text; nota record; caso record; ve boolean;
  id_adm bigint; id_cf bigint; id_ob bigint; id_r bigint; d_eq bigint; d_adm bigint;
  k_origen text; k_cierre text; k_plazo text; k_noapto text; k_adm text; k_fecha text;
begin
  select user_id into u_direccion from public.app_user_roles where app = 'dashboard' and role = 'direccion' order by created_at limit 1;
  select user_id into u_compras   from public.app_user_roles where app = 'dashboard' and role = 'compras'   order by created_at limit 1;
  select r.user_id into u_produccion from public.app_user_roles r
    where r.app = 'produccion'
      and not exists (select 1 from public.app_user_roles d where d.user_id = r.user_id and d.app = 'dashboard')
    order by r.created_at limit 1;
  select id into id_adm from public.ctr_contratos where codigo = 'ZZ-TEST-ADM';
  select id into id_cf  from public.ctr_contratos where codigo = 'ZZ-TEST-CF';
  select id into id_ob from public.ctr_obligaciones where etiqueta = 'ZZ-TEST obligación de equipo';
  select id into id_r   from public.ctr_realizadas where obligacion_id = id_ob;
  select id into d_eq   from public.ctr_documentos where ruta = 'zz-test/eq.pdf';
  select id into d_adm  from public.ctr_documentos where ruta = 'zz-test/adm.pdf';
  k_origen := 'origen:obligacion:' || id_ob;  k_cierre := 'cierre:obligacion:' || id_ob;
  k_plazo  := 'plazo:obligacion:'  || id_ob;  k_noapto := 'noapto:obligacion:' || id_ob;
  k_adm    := 'vencido:contrato:'  || id_adm; k_fecha  := 'fechadoc:documento:' || d_eq;

  if u_direccion  is null then insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values ('direccion',  'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_compras    is null then insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values ('compras',    'sin usuario de este rol', '-', '-', 'AVISO'); end if;
  if u_produccion is null then insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values ('produccion', 'sin usuario de este rol', '-', '-', 'AVISO'); end if;

  -- ═══ COMPRAS ═══
  if u_compras is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_compras, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_compras::text, true);

    -- Descarta lo suyo; el autor lo pone la base de datos aunque el navegador mande otro
    for caso in select * from (values (k_origen), (k_cierre), (k_fecha)) as t(clave) loop
      begin
        perform set_config('role', 'authenticated', true);
        insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto, descartada_por)
          values (caso.clave, 'No aplica: prueba', 'texto de la tarea', u_direccion);
        obtenido := 'permitido'; detalle := null;
      exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
      perform set_config('role', 'none', true);
      insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
        ('compras', 'descarta una tarea suya con motivo (' || split_part(caso.clave, ':', 1) || ')', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);
    end loop;
    select * into nota from public.ctr_tareas_notas where clave = k_origen;
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'el descarte queda a su nombre y con fecha, aunque mande otro autor', 'compras',
       case when nota.descartada_por = u_compras and nota.descartada_en is not null then 'compras' when nota.descartada_por = u_direccion then 'direccion (falsificado)' else coalesce(nota.descartada_por::text, 'vacío') end,
       case when nota.descartada_por = u_compras and nota.descartada_en is not null then 'OK' else 'FALLO' end);

    -- Lo que no se descarta nunca, ni sin motivo, ni lo que no es suyo
    for caso in
      select * from (values
        (k_plazo,  'No aplica: prueba', 'texto', 'no descarta «Fuera de plazo»'),
        (k_noapto, 'No aplica: prueba', 'texto', 'no descarta «Resultado no apto»'),
        (k_adm,    'No aplica: prueba', 'texto', 'no descarta una tarea de un contrato de Administración'),
        ('preaviso:contrato:' || id_cf, '  ', 'texto', 'no descarta sin motivo (en un contrato suyo)'),
        ('proveedorbc:contrato:' || id_cf, 'No aplica: prueba', null, 'no descarta sin guardar el texto de la tarea (en un contrato suyo)')
      ) as t(clave, motivo, texto, que)
    loop
      begin
        perform set_config('role', 'authenticated', true);
        insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto) values (caso.clave, caso.motivo, caso.texto);
        obtenido := 'permitido'; detalle := null;
      exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
      perform set_config('role', 'none', true);
      insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
        ('compras', caso.que, 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
    end loop;

    -- Sin motivo en una tarea de su obligación (la regla de acceso sí le deja): lo para la base de datos
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_tareas_notas set motivo_descarte = 'ok', descartada_texto = null where clave = k_cierre;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no deja un descarte con motivo de menos de 3 letras y sin texto', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- Recuperar: quitar el motivo limpia el descarte
    perform set_config('role', 'authenticated', true);
    update public.ctr_tareas_notas set motivo_descarte = null where clave = k_origen;
    perform set_config('role', 'none', true);
    select * into nota from public.ctr_tareas_notas where clave = k_origen;
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'recupera una tarea descartada (queda sin descarte)', 'limpio',
       case when nota.descartada_en is null and nota.descartada_por is null and nota.descartada_texto is null then 'limpio' else 'quedan datos' end,
       case when nota.descartada_en is null and nota.descartada_por is null and nota.descartada_texto is null then 'OK' else 'FALLO' end);

    -- Ficha de documento: la cambia, pero no a qué PDF apunta
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set fecha = current_date - 10, fecha_precision = 'dia', tipo = 'informe_revision', descripcion = 'ficha editada' where id = d_eq;
      get diagnostics n = row_count;
      obtenido := case when n = 1 then 'permitido' else 'sin filas' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'pone fecha, tipo y descripción a un documento de equipo', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    for caso in
      select * from (values
        ('ruta',            'no cambia la ruta del PDF de su documento (no puede apuntarlo a otro fichero)'),
        ('nombre_original', 'no cambia el nombre original del PDF')
      ) as t(col, que)
    loop
      begin
        perform set_config('role', 'authenticated', true);
        execute format('update public.ctr_documentos set %I = %L where id = %s', caso.col, 'zz-test/otro-fichero.pdf', d_eq);
        obtenido := 'permitido'; detalle := null;
      exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
      perform set_config('role', 'none', true);
      insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
        ('compras', caso.que, 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
    end loop;

    -- Cierre de una realizada: solo con un documento que ve
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set documento_id = d_adm where id = id_r;
      get diagnostics n = row_count;
      obtenido := case when n = 0 then 'sin filas' else 'permitido' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no cuelga de su realizada un documento de Administración', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_realizadas set documento_id = d_eq where id = id_r;
      get diagnostics n = row_count;
      obtenido := case when n = 1 then 'permitido' else 'sin filas' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'pone como cierre de su realizada un documento que ve (F4)', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select count(*) into n from public.ctr_documentos where id = d_adm;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'tras los intentos sigue sin ver el documento de Administración', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);

    -- F10: una ficha nueva que apunta a un PDF ajeno no lo abre. El almacén pregunta a
    -- ctr_pdf_visible(ruta, dueño del PDF): se le pregunta igual que lo haría él.
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
        values ('zz-test/huerfano.pdf', 'huerfano.pdf', 'otro', 'otro', (select id from public.ctr_equipos where num_serie = 'ZZ-TEST-SN'));
      select public.ctr_pdf_visible('zz-test/huerfano.pdf', gen_random_uuid()::text) into ve;
      obtenido := case when ve then 'lo abre' else 'no lo abre' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('compras', 'no abre un PDF subido por otro aunque cree una ficha que apunte a él (F10)', 'no lo abre', obtenido, case when obtenido in ('no lo abre', 'bloqueado') then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select public.ctr_pdf_visible('zz-test/huerfano.pdf', u_compras::text) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'sí abre el PDF que ha subido él con su ficha (como la app)', 'lo abre', case when ve then 'lo abre' else 'no lo abre' end, case when ve then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select public.ctr_pdf_visible('zz-test/eq.pdf', null) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'sí abre el PDF de una ficha sin autor (carga inicial)', 'lo abre', case when ve then 'lo abre' else 'no lo abre' end, case when ve then 'OK' else 'FALLO' end);

    perform set_config('role', 'authenticated', true);
    select public.ctr_pdf_visible('zz-test/adm.pdf', null) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('compras', 'no abre el PDF de un documento de Administración', 'no lo abre', case when ve then 'lo abre' else 'no lo abre' end, case when not ve then 'OK' else 'FALLO' end);
  end if;

  -- ═══ DIRECCIÓN ═══
  if u_direccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_direccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_direccion::text, true);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto) values (k_adm, 'Contrato de prueba', 'texto');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'descarta una tarea de un contrato de Administración', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto) values (k_plazo, 'No aplica: prueba', 'texto');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'tampoco descarta «Fuera de plazo»', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    -- Asignar responsable a una tarea que descartó compras no cambia de quién es el descarte
    perform set_config('role', 'authenticated', true);
    update public.ctr_tareas_notas set responsable = 'Sachi' where clave = k_fecha;
    perform set_config('role', 'none', true);
    select * into nota from public.ctr_tareas_notas where clave = k_fecha;
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 'al asignar responsable, el descarte sigue siendo de quien lo hizo', 'compras',
       case when nota.descartada_por = u_compras then 'compras' when nota.descartada_por = u_direccion then 'direccion' else coalesce(nota.descartada_por::text, 'vacío') end,
       case when u_compras is null or nota.descartada_por = u_compras then 'OK' else 'FALLO' end);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set ruta = 'zz-test/otro-fichero.pdf' where id = d_adm;
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'tampoco cambia la ruta de un PDF desde la app', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set fecha = current_date - 20, fecha_precision = 'dia' where id = d_adm;
      get diagnostics n = row_count;
      obtenido := case when n = 1 then 'permitido' else 'sin filas' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('direccion', 'pone fecha a un documento de Administración', 'permitido', obtenido, case when obtenido = 'permitido' then 'OK' else 'FALLO' end, detalle);

    perform set_config('role', 'authenticated', true);
    select public.ctr_pdf_visible('zz-test/adm.pdf', gen_random_uuid()::text) into ve;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado) values
      ('direccion', 'sigue abriendo cualquier PDF con ficha', 'lo abre', case when ve then 'lo abre' else 'no lo abre' end, case when ve then 'OK' else 'FALLO' end);
  end if;

  -- ═══ PRODUCCIÓN (sin rol en el Dashboard) ═══
  if u_produccion is not null then
    perform set_config('request.jwt.claims', json_build_object('sub', u_produccion, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', u_produccion::text, true);
    begin
      perform set_config('role', 'authenticated', true);
      insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto) values ('activobc:equipo:' || (select id from public.ctr_equipos where num_serie = 'ZZ-TEST-SN'), 'No aplica: prueba', 'texto');
      obtenido := 'permitido'; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'un usuario de Producción no descarta tareas', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
    begin
      perform set_config('role', 'authenticated', true);
      update public.ctr_documentos set fecha = current_date where id = d_eq;
      get diagnostics n = row_count;
      obtenido := case when n = 0 then 'sin filas' else 'permitido' end; detalle := null;
    exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
    perform set_config('role', 'none', true);
    insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
      ('produccion', 'un usuario de Producción no cambia fichas de documento', 'sin filas', obtenido, case when obtenido in ('sin filas', 'bloqueado') then 'OK' else 'FALLO' end, detalle);
  end if;

  -- ═══ SIN SESIÓN (anon) ═══
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform set_config('role', 'anon', true);
    insert into public.ctr_tareas_notas (clave, motivo_descarte, descartada_texto) values (k_origen || '0', 'No aplica: prueba', 'texto');
    obtenido := 'permitido'; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no descarta tareas', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);
  begin
    perform set_config('role', 'anon', true);
    update public.ctr_documentos set fecha = current_date where id = d_eq;
    get diagnostics n = row_count;
    obtenido := case when n = 0 then 'sin filas' else 'permitido' end; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no cambia fichas de documento', 'bloqueado', obtenido, case when obtenido in ('bloqueado', 'sin filas') then 'OK' else 'FALLO' end, detalle);
  begin
    perform set_config('role', 'anon', true);
    select public.ctr_pdf_visible('zz-test/eq.pdf', null) into ve;
    obtenido := case when ve then 'sí' else 'no' end; detalle := null;
  exception when others then obtenido := 'bloqueado'; detalle := sqlerrm; end;
  perform set_config('role', 'none', true);
  insert into ctr_check_tar (quien, comprobacion, esperado, obtenido, resultado, detalle) values
    ('anon', 'sin sesión no puede preguntar por un PDF', 'bloqueado', obtenido, case when obtenido = 'bloqueado' then 'OK' else 'FALLO' end, detalle);

  perform set_config('role', 'none', true);

  -- ── Limpieza de las filas de prueba (como postgres) ───────────────────────
  delete from public.ctr_tareas_notas where clave in (k_origen, k_cierre, k_plazo, k_noapto, k_adm, k_fecha, k_origen || '0')
     or clave like '%:contrato:' || id_adm or clave like '%:contrato:' || id_cf or clave ='activobc:equipo:' || (select id from public.ctr_equipos where num_serie = 'ZZ-TEST-SN');
end;
$c$;

-- Primero el equipo (arrastra su obligación y su realizada): si se borrara antes el documento,
-- vaciar el cierre de la realizada lo impediría ctr_proteger_realizada (el cierre no se cambia)
delete from public.ctr_equipos    where num_serie = 'ZZ-TEST-SN';
delete from public.ctr_documentos where ruta like 'zz-test/%';        -- arrastra su enlace al contrato
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
from ctr_check_tar
order by orden;
