-- ============================================================================
-- Contratos · cierre de QA antes del piloto (24/09/2026)
-- ============================================================================
-- Decisiones de Carlos del 24/09/2026:
--   F1 · Nadie borra equipos, grupos, obligaciones ni realizadas por la API (baja
--        lógica). Tampoco contratos: la pantalla nunca borra ninguno y el borrado
--        arrastraba en cascada hitos, tareas y enlaces. Una realizada solo se anula
--        (queda quién y cuándo) o recibe su documento de cierre si no lo tenía;
--        ni la fecha ni el resultado se pueden reescribir. El resultado por unidad
--        tampoco. Un borrado real se hace desde el editor de Supabase (postgres).
--   F2 · Las notas de tareas automáticas siguen los permisos de aquello a lo que
--        se refieren: compras ya no lee ni pospone avisos de contratos de
--        Administración.
--   F3 · Columna ctr_contratos.renovacion_meses: cada cuánto se renueva una prórroga
--        tácita. Vacía = anual (lo decide el motor de la app).
--
-- No toca datos. Cómo ejecutarlo: SQL Editor de Supabase, rol «postgres»,
-- Ctrl+A, Ctrl+V, Ctrl+Enter. Si la guarda final encuentra algo mal, aborta y no
-- se aplica nada. Marcha atrás: contratos_qa_2026-09-24_MARCHA_ATRAS.sql
-- Después: contratos_qa_2026-09-24_comprobacion.sql (suplanta a cada rol).
-- ============================================================================

begin;

-- ── F1 · Sin borrados por la API ────────────────────────────────────────────
-- Se retira el privilegio (más fuerte que una política: ninguna regla lo devuelve).
revoke delete on table public.ctr_contratos           from authenticated;
revoke delete on table public.ctr_grupos_equipos      from authenticated;
revoke delete on table public.ctr_equipos             from authenticated;
revoke delete on table public.ctr_obligaciones        from authenticated;
revoke delete on table public.ctr_realizadas          from authenticated;
revoke delete on table public.ctr_realizada_unidades  from authenticated;
-- Registro del lector: solo lo escribe la función de servidor (clave de servicio). Supabase
-- había dejado a authenticated los privilegios por defecto; RLS ya lo bloqueaba, se retiran igual.
revoke insert, update, delete on table public.ctr_lecturas from authenticated;

-- Resultado por unidad: se inserta al registrar y ya no se toca (se corrige anulando la realizada)
revoke update on table public.ctr_realizada_unidades  from authenticated;

-- Realizadas: solo se pueden cambiar dos columnas
alter table public.ctr_realizadas add column if not exists anulada_por uuid references auth.users(id) on delete set null;
alter table public.ctr_realizadas add column if not exists anulada_en  timestamptz;

revoke update on table public.ctr_realizadas from authenticated;
grant update (anulada, documento_id) on table public.ctr_realizadas to authenticated;

-- …y en un solo sentido: anular no se deshace; el documento de cierre se añade si faltaba, no se cambia
create or replace function public.ctr_proteger_realizada()
returns trigger language plpgsql as $f$
begin
  if old.anulada and not new.anulada then
    raise exception 'Una realizada anulada no se puede recuperar: regístrela de nuevo' using errcode = '42501';
  end if;
  if old.documento_id is not null and new.documento_id is distinct from old.documento_id then
    raise exception 'El documento de cierre de una realizada no se cambia: anule la realizada y regístrela de nuevo' using errcode = '42501';
  end if;
  -- Por si alguien con privilegios de tabla lo intenta: la fecha y el resultado no se reescriben
  if new.fecha is distinct from old.fecha or new.resultado is distinct from old.resultado
     or new.obligacion_id is distinct from old.obligacion_id or new.nota is distinct from old.nota then
    raise exception 'La fecha, el resultado y la nota de una realizada no se cambian: anúlela y regístrela de nuevo' using errcode = '42501';
  end if;
  if new.anulada and not old.anulada then
    new.anulada_por := auth.uid();
    new.anulada_en := now();
  else
    new.anulada_por := old.anulada_por;
    new.anulada_en := old.anulada_en;
  end if;
  return new;
end;
$f$;

drop trigger if exists ctr_realizadas_proteger on public.ctr_realizadas;
create trigger ctr_realizadas_proteger before update on public.ctr_realizadas
  for each row execute function public.ctr_proteger_realizada();

-- ── F2 · Notas de tareas según aquello a lo que se refieren ─────────────────
-- Clave: '<tipo>:<entidad>:<id>' (derivarTareasAutomaticas en contratosVista.js).
create or replace function public.ctr_permiso_clave(p_clave text, p_editar boolean)
returns boolean language plpgsql security definer stable set search_path = public as $f$
declare
  v_rol text := public.app_rol('dashboard');
  v_entidad text := split_part(p_clave, ':', 2);
  v_texto text := split_part(p_clave, ':', 3);
  v_id bigint;
begin
  if v_rol = 'direccion' then return true; end if;
  if v_rol is distinct from 'compras' or v_texto !~ '^[0-9]{1,18}$' then return false; end if;
  v_id := v_texto::bigint;
  return case v_entidad
    when 'equipo'     then exists (select 1 from public.ctr_equipos where id = v_id)
    when 'obligacion' then case when p_editar then public.ctr_edita_obligacion(v_id) else public.ctr_ve_obligacion(v_id) end
    when 'contrato'   then case when p_editar then public.ctr_edita_contrato(v_id)   else public.ctr_ve_contrato(v_id)   end
    when 'documento'  then case when p_editar then public.ctr_edita_documento(v_id)  else public.ctr_ve_documento(v_id)  end
    else false
  end;
end;
$f$;
revoke all on function public.ctr_permiso_clave(text, boolean) from public, anon;
grant execute on function public.ctr_permiso_clave(text, boolean) to authenticated;

drop policy if exists ctr_tareas_notas_acceso on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_leer on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_crear on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_editar on public.ctr_tareas_notas;
drop policy if exists ctr_tareas_notas_borrar on public.ctr_tareas_notas;
create policy ctr_tareas_notas_leer on public.ctr_tareas_notas for select to authenticated
  using (public.ctr_permiso_clave(clave, false));
create policy ctr_tareas_notas_crear on public.ctr_tareas_notas for insert to authenticated
  with check (public.ctr_permiso_clave(clave, true));
create policy ctr_tareas_notas_editar on public.ctr_tareas_notas for update to authenticated
  using (public.ctr_permiso_clave(clave, true))
  with check (public.ctr_permiso_clave(clave, true));
create policy ctr_tareas_notas_borrar on public.ctr_tareas_notas for delete to authenticated
  using (public.ctr_permiso_clave(clave, true));

-- ── F3 · Periodo de renovación de las prórrogas tácitas ─────────────────────
alter table public.ctr_contratos add column if not exists renovacion_meses integer;
alter table public.ctr_contratos drop constraint if exists ctr_contratos_renovacion_meses_ck;
alter table public.ctr_contratos add constraint ctr_contratos_renovacion_meses_ck
  check (renovacion_meses is null or renovacion_meses between 1 and 120);

-- ── Guarda: si algo no ha quedado como debe, no se aplica nada ──────────────
do $g$
declare fallo text := ''; n int; t text;
begin
  foreach t in array array['ctr_contratos','ctr_grupos_equipos','ctr_equipos','ctr_obligaciones','ctr_realizadas','ctr_realizada_unidades','ctr_lecturas'] loop
    if has_table_privilege('authenticated', format('public.%I', t), 'DELETE') then
      fallo := fallo || format(' authenticated aún puede borrar en %s;', t); end if;
  end loop;
  if has_table_privilege('authenticated', 'public.ctr_realizada_unidades', 'UPDATE') then
    fallo := fallo || ' authenticated aún puede modificar ctr_realizada_unidades;'; end if;
  if has_column_privilege('authenticated', 'public.ctr_realizadas', 'fecha', 'UPDATE')
     or has_column_privilege('authenticated', 'public.ctr_realizadas', 'resultado', 'UPDATE') then
    fallo := fallo || ' authenticated aún puede reescribir fecha o resultado de una realizada;'; end if;
  if not has_column_privilege('authenticated', 'public.ctr_realizadas', 'anulada', 'UPDATE') then
    fallo := fallo || ' la app no podría anular realizadas;'; end if;
  -- Las tablas que la app sí borra siguen pudiendo
  if not has_table_privilege('authenticated', 'public.ctr_documentos', 'DELETE')
     or not has_table_privilege('authenticated', 'public.ctr_contrato_equipo', 'DELETE')
     or not has_table_privilege('authenticated', 'public.ctr_tareas', 'DELETE') then
    fallo := fallo || ' se ha quitado un borrado que la app usa (documentos, enlaces o tareas);'; end if;

  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'ctr_tareas_notas';
  if n <> 4 then fallo := fallo || format(' ctr_tareas_notas tiene %s políticas, se esperaban 4;', n); end if;
  select count(*) into n from pg_policies where schemaname = 'public' and tablename = 'ctr_tareas_notas'
    and (coalesce(case when cmd = 'INSERT' then with_check else qual end, 'true') = 'true'
         or coalesce(qual, '') like '%app_rol(%' and coalesce(qual, '') not like '%ctr_permiso_clave%');
  if n > 0 then fallo := fallo || ' alguna política de ctr_tareas_notas sigue abierta;'; end if;

  if has_function_privilege('anon', 'public.ctr_permiso_clave(text, boolean)', 'execute') then
    fallo := fallo || ' ctr_permiso_clave ejecutable sin sesión;'; end if;

  select count(*) into n from information_schema.role_table_grants
    where table_schema = 'public' and table_name like 'ctr\_%' and grantee in ('anon', 'PUBLIC');
  if n > 0 then fallo := fallo || format(' %s privilegios de anon/public sobre tablas ctr_;', n); end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public'
                 and table_name = 'ctr_contratos' and column_name = 'renovacion_meses') then
    fallo := fallo || ' falta ctr_contratos.renovacion_meses;'; end if;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'tablas ctr_ donde authenticated puede borrar' as comprobacion,
       (select string_agg(table_name, ', ' order by table_name) from information_schema.table_privileges
        where table_schema = 'public' and table_name like 'ctr\_%' and grantee = 'authenticated' and privilege_type = 'DELETE') as valor,
       'ctr_contrato_equipo, ctr_documento_contrato, ctr_documentos, ctr_hitos, ctr_tareas, ctr_tareas_notas (en cualquier orden)' as esperado
union all select 'columnas de ctr_realizadas que se pueden modificar',
       (select string_agg(column_name, ', ' order by column_name) from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'ctr_realizadas' and grantee = 'authenticated' and privilege_type = 'UPDATE'),
       'anulada, documento_id'
union all select 'políticas de ctr_tareas_notas',
       (select string_agg(policyname, ', ' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'ctr_tareas_notas'),
       'ctr_tareas_notas_borrar, ctr_tareas_notas_crear, ctr_tareas_notas_editar, ctr_tareas_notas_leer'
union all select 'columna renovacion_meses',
       (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'ctr_contratos' and column_name = 'renovacion_meses'),
       'integer'
union all select 'privilegios de anon sobre tablas ctr_',
       (select count(*)::text from information_schema.role_table_grants
        where table_schema = 'public' and table_name like 'ctr\_%' and grantee = 'anon'), '0';
