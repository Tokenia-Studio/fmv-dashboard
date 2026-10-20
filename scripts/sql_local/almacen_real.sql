-- Prueba local (no se ejecuta en producción): el almacén leído de verdad como compras y dirección (F10, F7).
-- Prueba local: el almacén leído de verdad como compras (no se ejecuta en producción)
create temp table ctr_check_alm (orden serial, quien text, comprobacion text, esperado text, obtenido text, resultado text, detalle text);
insert into public.ctr_equipos (nombre, tipo, regimen, num_serie) values ('ZZ alm', 'Elevación', 'propio', 'ZZ-ALM');
insert into storage.objects (bucket_id, name, owner_id) values
  ('contratos', 'X/huerfano-de-direccion.pdf', '11111111-1111-1111-1111-111111111111'),
  ('contratos', 'X/carga-inicial.pdf', null),
  ('contratos', 'X/subido-por-compras.pdf', '22222222-2222-2222-2222-222222222222');
insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
  select 'X/carga-inicial.pdf', 'carga.pdf', 'certificado', 'cierre', id from public.ctr_equipos where num_serie = 'ZZ-ALM';
do $c$
declare n int; o text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
  perform set_config('role', 'authenticated', true);
  insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
    select 'X/huerfano-de-direccion.pdf', 'h.pdf', 'otro', 'otro', id from public.ctr_equipos where num_serie = 'ZZ-ALM';
  insert into public.ctr_documentos (ruta, nombre_original, tipo, rol, equipo_id)
    select 'X/subido-por-compras.pdf', 's.pdf', 'otro', 'otro', id from public.ctr_equipos where num_serie = 'ZZ-ALM';
  select count(*) into n from storage.objects where name = 'X/huerfano-de-direccion.pdf';
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('compras', 'almacén: no lee el PDF huérfano de otro con una ficha suya (F10)', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where name = 'X/subido-por-compras.pdf';
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('compras', 'almacén: lee el PDF que subió él', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where name = 'X/carga-inicial.pdf';
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('compras', 'almacén: lee el PDF de la carga inicial', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);
  perform set_config('role', 'authenticated', true);
  delete from storage.objects where name = 'X/huerfano-de-direccion.pdf';
  get diagnostics n = row_count;
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('compras', 'almacén: no borra el PDF huérfano de otro', '0', n::text, case when n = 0 then 'OK' else 'FALLO' end);
  perform set_config('role', 'authenticated', true);
  delete from storage.objects where name = 'X/carga-inicial.pdf';
  get diagnostics n = row_count;
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('compras', 'almacén: borra el PDF de un documento suyo antes que la ficha (arreglo F7)', '1', n::text, case when n = 1 then 'OK' else 'FALLO' end);
  perform set_config('request.jwt.claims', json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from storage.objects where name in ('X/huerfano-de-direccion.pdf', 'X/subido-por-compras.pdf');
  perform set_config('role', 'none', true);
  insert into ctr_check_alm (quien, comprobacion, esperado, obtenido, resultado) values ('direccion', 'almacén: dirección lee todo lo que tiene ficha', '2', n::text, case when n = 2 then 'OK' else 'FALLO' end);
end;
$c$;
select * from ctr_check_alm order by orden;
