-- ============================================================================
-- Contratos · descartar tareas, editar documentos y cerrar realizadas después (20/10/2026)
-- ============================================================================
-- Sale del piloto con Sachi (20/10/2026) y de lo decidido por Carlos ese día:
--
--   1. DESCARTAR TAREAS AUTOMÁTICAS que no aplican. Pueden compras y dirección (cada uno
--      las que ya puede tocar: la regla de ctr_tareas_notas no cambia). Motivo obligatorio;
--      quién y cuándo lo pone la base de datos, no el navegador. «Fuera de plazo» y
--      «Resultado no apto» NO se descartan: se quitan solas al resolverlas. La tarea guarda
--      el texto que tenía al descartarla: si la situación cambia, la app la vuelve a enseñar.
--   2. EDITAR LA FICHA DE UN DOCUMENTO ya subido (fecha, tipo, rol…). Solo esas columnas:
--      la ruta del PDF y el nombre original quedan fijos.
--      HUECO QUE CIERRA (visto el 20/10/2026 al preparar esta pantalla): hasta hoy
--      authenticated podía cambiar CUALQUIER columna de ctr_documentos, también la ruta.
--      El almacén deja leer un PDF a quien ve la ficha que apunta a él, así que compras
--      podía apuntar una ficha suya a un PDF sin ficha (F7) y leerlo, fuera de su vista.
--   3. CERRAR UNA REALIZADA DESPUÉS (F4): ya se podía poner el documento de cierre a una
--      realizada que no lo tenía; ahora, además, solo con un documento que quien lo pone
--      puede ver (si no, se podría «colgar» de una realizada propia un documento ajeno).
--   4. F10 (memoria del 06/10/2026, sin cerrar hasta hoy): compras podía también CREAR una
--      ficha nueva con la ruta de un PDF sin ficha y abrirlo. El almacén pasa a exigir que
--      la ficha sea de quien subió el PDF (o de la carga inicial).
--   5. RESPONSABLE POR DEFECTO de las tareas automáticas por vista (P2: Sachi en Equipos y
--      mantenimiento, Erika en Servicios). Va en `configuracion`, no en el JavaScript.
--
-- No toca datos de negocio. Cómo ejecutarlo: SQL Editor de Supabase, rol «postgres»,
-- Ctrl+A, Ctrl+V, Ctrl+Enter. Si la guarda final encuentra algo mal, aborta y no se
-- aplica nada.
-- Marcha atrás: contratos_tareas_documentos_2026-10-20_MARCHA_ATRAS.sql
-- Después: contratos_tareas_documentos_2026-10-20_comprobacion.sql (suplanta a cada rol)
-- y, como siempre, las comprobaciones anteriores del módulo.
-- ============================================================================

begin;

do $r$
begin
  if not exists (select 1 from pg_policies
                 where schemaname = 'public' and tablename = 'ctr_documento_contrato'
                   and policyname = 'ctr_documento_contrato_escribir'
                   and with_check like '%ctr_ve_documento(documento_id)%') then
    raise exception 'Falta ejecutar antes contratos_documentos_por_contrato_2026-10-06.sql';
  end if;
  if to_regprocedure('public.ctr_permiso_clave(text, boolean)') is null then
    raise exception 'Falta ejecutar antes contratos_qa_2026-09-24.sql';
  end if;
end;
$r$;

-- ── 1. Descartar tareas automáticas ─────────────────────────────────────────
alter table public.ctr_tareas_notas add column if not exists motivo_descarte  text;
alter table public.ctr_tareas_notas add column if not exists descartada_texto text;   -- texto de la tarea al descartarla
alter table public.ctr_tareas_notas add column if not exists descartada_por   uuid references auth.users(id) on delete set null;
alter table public.ctr_tareas_notas add column if not exists descartada_en    timestamptz;

alter table public.ctr_tareas_notas drop constraint if exists ctr_tareas_notas_descarte_ck;
alter table public.ctr_tareas_notas add constraint ctr_tareas_notas_descarte_ck check (
  motivo_descarte is null
  or (char_length(btrim(motivo_descarte)) between 3 and 500 and descartada_texto is not null));

create or replace function public.ctr_tareas_notas_descarte()
returns trigger language plpgsql as $f$
begin
  if new.motivo_descarte is not null then
    new.motivo_descarte := btrim(new.motivo_descarte);
    if split_part(new.clave, ':', 1) in ('plazo', 'noapto') then
      raise exception 'Esta tarea no se puede descartar: se quita sola al resolverla' using errcode = '42501';
    end if;
    new.descartada_por := auth.uid();
    new.descartada_en := now();
    if tg_op = 'UPDATE' then
      if old.motivo_descarte = new.motivo_descarte and old.descartada_texto is not distinct from new.descartada_texto then
        new.descartada_por := old.descartada_por;   -- se ha cambiado otra columna: el descarte sigue siendo de quien lo hizo
        new.descartada_en := old.descartada_en;
      end if;
    end if;
  else
    new.descartada_texto := null;
    new.descartada_por := null;
    new.descartada_en := null;
  end if;
  return new;
end;
$f$;

drop trigger if exists ctr_tareas_notas_descarte on public.ctr_tareas_notas;
create trigger ctr_tareas_notas_descarte before insert or update on public.ctr_tareas_notas
  for each row execute function public.ctr_tareas_notas_descarte();

-- ── 2. De un documento ya subido solo se cambia la ficha, nunca a qué PDF apunta ──
revoke update on table public.ctr_documentos from authenticated;
grant update (tipo, rol, fecha, fecha_precision, referencia, descripcion, legible, equipo_id, obligacion_id)
  on table public.ctr_documentos to authenticated;

-- ── 3. El documento de cierre de una realizada tiene que poder verlo quien lo pone ──
-- Solo para las llamadas de la app (rol authenticated): las cargas con la clave de
-- servicio o desde el editor SQL no pasan por aquí.
create or replace function public.ctr_realizada_documento_visible()
returns trigger language plpgsql as $f$
begin
  if current_user <> 'authenticated' or new.documento_id is null then return new; end if;
  if tg_op = 'UPDATE' then
    if new.documento_id is not distinct from old.documento_id then return new; end if;
  end if;
  if not public.ctr_ve_documento(new.documento_id) then
    raise exception 'Ese documento no está a tu alcance: no se puede poner como cierre' using errcode = '42501';
  end if;
  return new;
end;
$f$;

drop trigger if exists ctr_realizadas_documento_visible on public.ctr_realizadas;
create trigger ctr_realizadas_documento_visible before insert or update of documento_id on public.ctr_realizadas
  for each row execute function public.ctr_realizada_documento_visible();

-- ── 4. F10 · Una ficha solo abre el PDF que subió quien la creó ────────────────
-- Cierra la otra vía de F10 (memoria del 06/10/2026): compras podía CREAR una ficha
-- nueva con la ruta de un PDF sin ficha y, colgándola de un equipo, abrirlo. Ahora el
-- almacén exige además que la ficha sea de quien subió el PDF. Las fichas sin autor
-- (carga inicial y cargas con la clave de servicio, o de un usuario ya borrado) siguen
-- abriendo su PDF; las que crea la app siempre llevan autor (lo pone el trigger), así
-- que nadie puede fabricar una ficha «sin autor». Dirección lo ve todo, como siempre.
create or replace function public.ctr_pdf_visible(p_ruta text, p_owner text)
returns boolean language sql security definer stable set search_path = public as $f$
  select exists (
    select 1 from public.ctr_documentos d
    where d.ruta = p_ruta and public.ctr_ve_documento(d.id)
      and (d.subido_por is null or d.subido_por::text = p_owner or public.app_rol('dashboard') = 'direccion'));
$f$;
create or replace function public.ctr_pdf_editable(p_ruta text, p_owner text)
returns boolean language sql security definer stable set search_path = public as $f$
  select exists (
    select 1 from public.ctr_documentos d
    where d.ruta = p_ruta and public.ctr_edita_documento(d.id)
      and (d.subido_por is null or d.subido_por::text = p_owner or public.app_rol('dashboard') = 'direccion'));
$f$;
revoke all on function public.ctr_pdf_visible(text, text)  from public, anon;
revoke all on function public.ctr_pdf_editable(text, text) from public, anon;
grant execute on function public.ctr_pdf_visible(text, text)  to authenticated;
grant execute on function public.ctr_pdf_editable(text, text) to authenticated;

drop policy if exists ctr_storage_leer   on storage.objects;
drop policy if exists ctr_storage_borrar on storage.objects;
create policy ctr_storage_leer on storage.objects for select to authenticated
  using (bucket_id = 'contratos' and (
    public.ctr_pdf_visible(name, owner_id)
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));
create policy ctr_storage_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'contratos' and (
    public.ctr_pdf_editable(name, owner_id)
    or (owner_id = (select auth.uid())::text
        and not exists (select 1 from public.ctr_documentos d where d.ruta = name))));

-- ── 5. Responsable por defecto de las tareas automáticas ────────────────────
insert into public.configuracion (key, value)
values ('ctr_responsables_por_defecto', '{"compras_fabrica": "Sachi", "administracion": "Erika"}'::jsonb)
on conflict (key) do nothing;

-- ── Guarda: si algo no ha quedado como debe, no se aplica nada ──────────────
do $g$
declare fallo text := ''; n int; c text;
begin
  select count(*) into n from information_schema.columns
    where table_schema = 'public' and table_name = 'ctr_tareas_notas'
      and column_name in ('motivo_descarte', 'descartada_texto', 'descartada_por', 'descartada_en');
  if n <> 4 then fallo := fallo || ' faltan columnas de descarte en ctr_tareas_notas;'; end if;

  select count(*) into n from pg_trigger
    where not tgisinternal and tgname in ('ctr_tareas_notas_descarte', 'ctr_realizadas_documento_visible', 'ctr_realizadas_proteger', 'ctr_tareas_notas_autoria', 'ctr_documentos_autoria');
  if n <> 5 then fallo := fallo || format(' se esperaban 5 triggers del módulo y hay %s;', n); end if;

  -- La ruta y el nombre original ya no se tocan; la ficha sí
  foreach c in array array['ruta', 'nombre_original', 'subido_por', 'subido_en', 'id'] loop
    if has_column_privilege('authenticated', 'public.ctr_documentos', c, 'UPDATE') then
      fallo := fallo || format(' authenticated aún puede cambiar ctr_documentos.%s;', c); end if;
  end loop;
  foreach c in array array['tipo', 'rol', 'fecha', 'fecha_precision', 'referencia', 'descripcion', 'legible', 'equipo_id', 'obligacion_id'] loop
    if not has_column_privilege('authenticated', 'public.ctr_documentos', c, 'UPDATE') then
      fallo := fallo || format(' la app no podría cambiar ctr_documentos.%s;', c); end if;
  end loop;
  if has_table_privilege('anon', 'public.ctr_documentos', 'UPDATE') then
    fallo := fallo || ' anon puede modificar ctr_documentos;'; end if;

  -- Las reglas de acceso de las notas siguen siendo las del 24/09 (por clave)
  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename = 'ctr_tareas_notas' and roles::text[] = array['authenticated']
      and coalesce(qual, '') || coalesce(with_check, '') like '%ctr_permiso_clave(clave%';
  if n <> 4 then fallo := fallo || format(' las reglas de ctr_tareas_notas no son las esperadas (%s de 4);', n); end if;

  select count(*) into n from pg_policies
    where schemaname = 'public' and tablename like 'ctr\_%'
      and ('anon' = any(roles::text[]) or 'public' = any(roles::text[]));
  if n > 0 then fallo := fallo || format(' %s políticas ctr_ concedidas a anon/public;', n); end if;

  select count(*) into n from pg_class k join pg_namespace s on s.oid = k.relnamespace
    where s.nspname = 'public' and k.relname in ('ctr_tareas_notas', 'ctr_documentos', 'ctr_realizadas') and not k.relrowsecurity;
  if n > 0 then fallo := fallo || ' alguna de ctr_tareas_notas, ctr_documentos o ctr_realizadas sin RLS;'; end if;

  if not exists (select 1 from public.configuracion where key = 'ctr_responsables_por_defecto') then
    fallo := fallo || ' falta configuracion.ctr_responsables_por_defecto;'; end if;

  -- F10: el almacén pregunta por la ficha Y por quién subió el PDF
  select count(*) into n from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and roles::text[] = array['authenticated']
      and ((policyname = 'ctr_storage_leer'   and cmd = 'SELECT' and qual like '%ctr_pdf_visible(name, owner_id)%')
        or (policyname = 'ctr_storage_borrar' and cmd = 'DELETE' and qual like '%ctr_pdf_editable(name, owner_id)%')
        or (policyname = 'ctr_storage_subir'  and cmd = 'INSERT'));
  if n <> 3 then fallo := fallo || format(' las reglas del almacén no han quedado como se esperaba (%s de 3);', n); end if;
  foreach c in array array['public.ctr_pdf_visible(text, text)', 'public.ctr_pdf_editable(text, text)'] loop
    if has_function_privilege('anon', c, 'execute') then fallo := fallo || format(' %s ejecutable sin sesión;', c); end if;
    if not has_function_privilege('authenticated', c, 'execute') then fallo := fallo || format(' el almacén no podría usar %s;', c); end if;
  end loop;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado. La última fila es informativa: PDF del almacén que no tienen ficha (F7).
-- Con el cambio 2 nadie puede ya apuntarles una ficha, pero conviene saber cuántos hay.
with sin_ficha as (
  select o.name from storage.objects o
  where o.bucket_id = 'contratos' and o.name not like '\_lectura/%'
    and not exists (select 1 from public.ctr_documentos d where d.ruta = o.name)
)
select 'columnas de ctr_documentos que la app puede cambiar' as comprobacion,
       (select string_agg(column_name, ', ' order by column_name) from information_schema.column_privileges
        where table_schema = 'public' and table_name = 'ctr_documentos' and grantee = 'authenticated' and privilege_type = 'UPDATE') as valor,
       'descripcion, equipo_id, fecha, fecha_precision, legible, obligacion_id, referencia, rol, tipo' as esperado
union all select 'triggers nuevos',
       (select string_agg(tgname, ', ' order by tgname) from pg_trigger where tgname in ('ctr_tareas_notas_descarte', 'ctr_realizadas_documento_visible')),
       'ctr_realizadas_documento_visible, ctr_tareas_notas_descarte'
union all select 'políticas sobre tablas ctr_',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'),
       '29'
union all select 'regla de lectura del almacén',
       (select qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'ctr_storage_leer'),
       'ctr_pdf_visible(name, owner_id) o PDF propio sin ficha'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')),
       '0'
union all select 'responsables por defecto',
       (select value::text from public.configuracion where key = 'ctr_responsables_por_defecto'),
       '{"administracion": "Erika", "compras_fabrica": "Sachi"}'
union all select 'PDF en el almacén que se han quedado sin ficha',
       (select (select count(*) from sin_ficha)::text
               || coalesce(': ' || (select string_agg(name, ' · ' order by name) from (select name from sin_ficha order by name limit 15) s), '')),
       'informativo: lo ideal es 0 (F7)';

-- SIGUIENTE: sql/contratos_tareas_documentos_2026-10-20_comprobacion.sql
