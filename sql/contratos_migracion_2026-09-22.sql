-- ============================================================================
-- MÓDULO DE CONTRATOS Y MANTENIMIENTO · MIGRACIÓN 1 de 2: TABLAS Y PERMISOS
-- Preparada el 22-sep-2026 · Proyecto Supabase compartido de FMV · rama modulo-contratos
-- ============================================================================
-- Crea las 13 tablas ctr_*, sus funciones de permiso, los triggers de autoría,
-- las políticas RLS por rol y vista, y el interruptor del lector de PDF.
-- El bucket privado va en la migración 2 de 2 (contratos_migracion_bucket_2026-09-22.sql).
-- Sigue la arquitectura v1.1 (04_Arquitectura/Arquitectura_modulo_contratos.md).
--
-- Reglas de acceso, en una frase cada una:
--   · Sin rol en la app 'dashboard' (toda la plantilla de Producción, anon) → nada.
--   · direccion  → lee y escribe todo el módulo.
--   · compras    → su vista ('compras_fabrica') completa; de la vista
--                  'administracion' ve SOLO los contratos mixtos (los que cubren
--                  algún equipo) y no puede editarlos ni cambiar la vista de nada.
--   · ctr_lecturas la lee solo direccion y la escribe solo la función de servidor.
--
-- Idempotente: se puede ejecutar dos veces sin duplicar nada. No toca ninguna
-- tabla existente (solo añade una clave en `configuracion`). Todo dentro de una
-- transacción con guarda final: si algo queda abierto, no se aplica nada.
--
-- Orden de ejecución:
--   1. este fichero
--   2. sql/contratos_migracion_bucket_2026-09-22.sql
--   3. sql/contratos_comprobacion_permisos.sql   (se hace pasar por cada rol)
-- Marcha atrás de todo: sql/contratos_MARCHA_ATRAS.sql
--
-- Cómo ejecutar: editor SQL de Supabase → Ctrl+A → Ctrl+V → Ctrl+Enter.
-- ============================================================================
begin;

-- ── 0. Requisito: app_rol() del paso 2 de seguridad (21-sep-2026) ───────────
do $r$
begin
  if to_regprocedure('public.app_rol(text)') is null then
    raise exception 'Falta public.app_rol(text): ejecutar antes sql/seguridad_paso2_cierre_por_app.sql';
  end if;
end;
$r$;

-- ── 1. Tablas ───────────────────────────────────────────────────────────────
-- Convenciones: prefijo ctr_, identificadores sin tildes, valores en castellano.
-- Los códigos C01/H05 del inventario se conservan en `codigo` (trazabilidad con el Excel).

create table if not exists public.ctr_contratos (
  id                bigserial primary key,
  codigo            text unique,                       -- C01, H05… (inventario); los nuevos, correlativo
  proveedor_nombre  text not null,
  proveedor_codigo  text,                              -- nº proveedor BC; enlace blando con proveedores.codigo
  categoria         text not null,                     -- Mantenimiento, Renting, Seguro, Licencia…
  vista             text not null check (vista in ('compras_fabrica','administracion')),
  vista_confirmada  boolean not null default false,
  objeto            text not null,
  nave              text,
  referencia        text,
  importe           numeric(12,2),
  periodicidad      text,                              -- mes, anual, único…
  importe_anual     numeric(12,2),                     -- normalizado a 12 meses, sin IVA
  importe_declarado numeric(12,2),                     -- lo que dijo compras por correo (discrepancias)
  inicio            date,
  inicio_precision  text check (inicio_precision in ('dia','mes','año')),
  fin               date,
  fin_precision     text check (fin_precision in ('dia','mes','año')),
  renovacion        text check (renovacion in ('tácita','expresa','no consta')),
  preaviso_dias     integer check (preaviso_dias is null or preaviso_dias >= 0),
  estado_documental text not null,                     -- Vigente, Por confirmar, Vencido, Sin contrato, Histórico…
  vivo              boolean not null default true,     -- false = histórico/sustituido: el motor no avisa (v1.1)
  cuenta_gasto      text,                              -- cuenta BC (fase 3)
  observaciones     text,
  creado_por        uuid references auth.users(id) on delete set null,
  modificado_por    uuid references auth.users(id) on delete set null,
  creado_en         timestamptz not null default now(),
  modificado_en     timestamptz not null default now()
);
create index if not exists ctr_contratos_vista_idx on public.ctr_contratos (vista);
create index if not exists ctr_contratos_proveedor_codigo_idx on public.ctr_contratos (proveedor_codigo);

create table if not exists public.ctr_grupos_equipos (
  id             bigserial primary key,
  nombre         text not null,
  tipo           text not null,                        -- Extintores, Eslingas…
  nave           text,
  observaciones  text,
  creado_por     uuid references auth.users(id) on delete set null,
  modificado_por uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now()
);

create table if not exists public.ctr_equipos (
  id             bigserial primary key,
  grupo_id       bigint references public.ctr_grupos_equipos(id) on delete set null,
  nombre         text not null,
  tipo           text not null,                        -- Grupo de soldadura, Elevación, Contra incendios…
  num_interno    text,
  modelo         text,
  num_serie      text,
  identificacion text,
  nave           text,
  asignado_a     text,
  estado         text not null default 'activo' check (estado in ('activo','baja','cedido','en reparación')),
  regimen        text not null default 'propio' check (regimen in ('propio','renting','alquiler')),
  activo_fijo_bc text,                                 -- obligatorio en pantalla solo si regimen = 'propio'
  sin_plan       boolean not null default false,       -- «decidir si se contrata mantenimiento»
  observaciones  text,
  creado_por     uuid references auth.users(id) on delete set null,
  modificado_por uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now()
);
create index if not exists ctr_equipos_num_serie_idx on public.ctr_equipos (num_serie);  -- el lector casa certificados por nº de serie
create index if not exists ctr_equipos_grupo_idx on public.ctr_equipos (grupo_id);

create table if not exists public.ctr_contrato_equipo (   -- N—M; su existencia hace «mixto» a un contrato
  contrato_id bigint not null references public.ctr_contratos(id) on delete cascade,
  equipo_id   bigint not null references public.ctr_equipos(id)   on delete cascade,
  primary key (contrato_id, equipo_id)
);
create index if not exists ctr_contrato_equipo_equipo_idx on public.ctr_contrato_equipo (equipo_id);

create table if not exists public.ctr_obligaciones (
  id                        bigserial primary key,
  equipo_id                 bigint references public.ctr_equipos(id)        on delete cascade,
  grupo_id                  bigint references public.ctr_grupos_equipos(id) on delete cascade,
  contrato_id               bigint references public.ctr_contratos(id)      on delete set null,
  tipo                      text not null check (tipo in ('Calibración','Revisión','Inspección','Certificación')),
  etiqueta                  text not null,
  periodicidad_meses        integer check (periodicidad_meses is null or periodicidad_meses > 0),
  proveedor_nombre          text,
  precio                    numeric(12,2),
  pedido_pcp                text,
  primera_fecha             date,                      -- fecha base cuando aún no hay ninguna realizada
  primera_fecha_precision   text check (primera_fecha_precision in ('dia','mes','año')),
  mes_habitual              smallint check (mes_habitual between 1 and 12),
  fecha_anunciada           date,
  fecha_anunciada_precision text check (fecha_anunciada_precision in ('dia','mes','año')),
  activa                    boolean not null default true,
  creado_por                uuid references auth.users(id) on delete set null,
  modificado_por            uuid references auth.users(id) on delete set null,
  creado_en                 timestamptz not null default now(),
  modificado_en             timestamptz not null default now(),
  -- cuelga de algo. OJO: borrar un contrato con obligaciones que solo cuelgan de él
  -- falla por esta restricción (contrato_id pasa a null): la app borra antes las obligaciones.
  constraint ctr_obligaciones_cuelga_de_algo check (num_nonnulls(equipo_id, grupo_id, contrato_id) >= 1)
);
create index if not exists ctr_obligaciones_equipo_idx   on public.ctr_obligaciones (equipo_id);
create index if not exists ctr_obligaciones_grupo_idx    on public.ctr_obligaciones (grupo_id);
create index if not exists ctr_obligaciones_contrato_idx on public.ctr_obligaciones (contrato_id);

create table if not exists public.ctr_documentos (
  id               bigserial primary key,
  ruta             text not null unique,               -- ruta del objeto en el bucket 'contratos'
  nombre_original  text not null,
  tipo             text not null,                      -- contrato, oferta, renovación, póliza, pedido, anexo, domiciliación, factura, parte de visita, informe, certificado, manual, legalización, otro
  rol              text not null check (rol in ('origen','cierre','otro')),
  fecha            date,
  fecha_precision  text check (fecha_precision in ('dia','mes','año')),
  referencia       text,
  descripcion      text,
  legible          boolean not null default true,
  equipo_id        bigint references public.ctr_equipos(id)      on delete set null,
  obligacion_id    bigint references public.ctr_obligaciones(id) on delete set null,
  subido_por       uuid references auth.users(id) on delete set null,
  subido_en        timestamptz not null default now()
);
create index if not exists ctr_documentos_equipo_idx     on public.ctr_documentos (equipo_id);
create index if not exists ctr_documentos_obligacion_idx on public.ctr_documentos (obligacion_id);

create table if not exists public.ctr_documento_contrato (  -- un PDF puede respaldar varios contratos («C46 / H06»)
  documento_id bigint not null references public.ctr_documentos(id) on delete cascade,
  contrato_id  bigint not null references public.ctr_contratos(id)  on delete cascade,
  primary key (documento_id, contrato_id)
);
create index if not exists ctr_documento_contrato_contrato_idx on public.ctr_documento_contrato (contrato_id);

create table if not exists public.ctr_realizadas (        -- historial: nunca se pisa, se corrige con otra fila o anulando
  id             bigserial primary key,
  obligacion_id  bigint not null references public.ctr_obligaciones(id) on delete cascade,
  fecha          date not null check (fecha <= current_date),
  resultado      text check (resultado in ('apto','no apto','sin resultado')),
  nota           text,
  documento_id   bigint references public.ctr_documentos(id) on delete set null,   -- documento de cierre
  anulada        boolean not null default false,
  registrado_por uuid references auth.users(id) on delete set null,
  registrado_en  timestamptz not null default now()
);
create index if not exists ctr_realizadas_obligacion_idx on public.ctr_realizadas (obligacion_id);

create table if not exists public.ctr_realizada_unidades (  -- resultado unidad a unidad en los grupos
  realizada_id bigint not null references public.ctr_realizadas(id) on delete cascade,
  equipo_id    bigint not null references public.ctr_equipos(id)    on delete cascade,
  resultado    text not null check (resultado in ('apto','no apto')),
  primary key (realizada_id, equipo_id)
);

create table if not exists public.ctr_hitos (             -- US-012: pago aplazado, revisión de precios…
  id             bigserial primary key,
  contrato_id    bigint not null references public.ctr_contratos(id) on delete cascade,
  tipo           text not null check (tipo in ('Pago','Renegociación','Otro')),
  descripcion    text not null,
  fecha          date not null,
  importe        numeric(12,2),
  aviso_dias     integer not null default 30 check (aviso_dias >= 0),
  cerrado        boolean not null default false,
  nota_cierre    text,
  creado_por     uuid references auth.users(id) on delete set null,
  modificado_por uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now()
);
create index if not exists ctr_hitos_contrato_idx on public.ctr_hitos (contrato_id);

create table if not exists public.ctr_tareas (            -- solo las manuales y las del inventario; las automáticas se derivan
  id             bigserial primary key,
  tipo           text not null check (tipo in ('Falta documento','Discrepancia','Confirmar','Decidir','Otro')),
  texto          text not null,
  respuesta      text,
  responsable    text,
  estado         text not null default 'Abierta' check (estado in ('Abierta','En curso','Resuelta')),
  fecha_limite   date,
  origen         text not null default 'manual',          -- 'inventario 07/09/2026' | 'manual'
  vista          text not null check (vista in ('compras_fabrica','administracion')),
  contrato_id    bigint references public.ctr_contratos(id) on delete cascade,
  equipo_id      bigint references public.ctr_equipos(id)   on delete cascade,
  creado_por     uuid references auth.users(id) on delete set null,
  modificado_por uuid references auth.users(id) on delete set null,
  creado_en      timestamptz not null default now(),
  modificado_en  timestamptz not null default now()
);
create index if not exists ctr_tareas_contrato_idx on public.ctr_tareas (contrato_id);
create index if not exists ctr_tareas_equipo_idx   on public.ctr_tareas (equipo_id);

create table if not exists public.ctr_tareas_notas (      -- lo que una persona añade a una tarea automática
  clave           text primary key,                      -- p. ej. 'cierre:obligacion:123'
  responsable     text,
  nota            text,
  pospuesta_hasta date,
  modificado_por  uuid references auth.users(id) on delete set null,
  modificado_en   timestamptz not null default now()
);

create table if not exists public.ctr_lecturas (          -- registro de lo enviado al lector (sin contenido del documento)
  id             bigserial primary key,
  documento_id   bigint references public.ctr_documentos(id) on delete set null,
  tipo_lectura   text not null,                          -- contrato | certificado | factura
  modelo         text not null,
  resultado      text not null,                          -- ok | error | sin datos
  tokens_entrada integer,
  tokens_salida  integer,
  usuario        uuid references auth.users(id) on delete set null,
  leido_en       timestamptz not null default now()
);

-- ── 2. Funciones de permiso ─────────────────────────────────────────────────
-- Todas SECURITY DEFINER (leen las tablas ctr_* sin pasar por su RLS, para
-- evitar la recursión) y cerradas a anon/public. Devuelven false para
-- cualquiera sin rol en la app 'dashboard'.

-- Rol en el Dashboard: 'direccion' | 'compras' | null
create or replace function public.ctr_rol()
returns text language sql security definer stable set search_path = public as $f$
  select public.app_rol('dashboard');
$f$;

-- ¿Puede ver este contrato?  direccion: todo · compras: su vista + los mixtos
create or replace function public.ctr_ve_contrato(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then exists (
      select 1 from public.ctr_contratos c
      where c.id = p_id and (
        c.vista = 'compras_fabrica'
        or exists (select 1 from public.ctr_contrato_equipo ce where ce.contrato_id = c.id)))
    else false end;
$f$;

-- ¿Puede editar este contrato?  direccion: todo · compras: solo los de su vista
create or replace function public.ctr_edita_contrato(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then exists (
      select 1 from public.ctr_contratos c where c.id = p_id and c.vista = 'compras_fabrica')
    else false end;
$f$;

-- Obligación por sus enlaces (sirve para WITH CHECK sobre la fila nueva).
-- Cuelga de equipo o grupo → ambos roles. Solo de contrato → según el contrato.
create or replace function public.ctr_ve_obligacion_fila(p_equipo bigint, p_grupo bigint, p_contrato bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then (p_equipo is not null or p_grupo is not null or public.ctr_ve_contrato(p_contrato))
    else false end;
$f$;

create or replace function public.ctr_edita_obligacion_fila(p_equipo bigint, p_grupo bigint, p_contrato bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then (p_equipo is not null or p_grupo is not null or public.ctr_edita_contrato(p_contrato))
    else false end;
$f$;

create or replace function public.ctr_ve_obligacion(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select coalesce((select public.ctr_ve_obligacion_fila(o.equipo_id, o.grupo_id, o.contrato_id)
                   from public.ctr_obligaciones o where o.id = p_id), false);
$f$;

create or replace function public.ctr_edita_obligacion(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select coalesce((select public.ctr_edita_obligacion_fila(o.equipo_id, o.grupo_id, o.contrato_id)
                   from public.ctr_obligaciones o where o.id = p_id), false);
$f$;

-- Documento: direccion todo. compras: si está ligado a un equipo, a una obligación
-- que ve o a algún contrato que ve; o si lo ha subido él y aún no está enlazado.
create or replace function public.ctr_ve_documento(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then exists (
      select 1 from public.ctr_documentos d
      where d.id = p_id and (
        d.equipo_id is not null
        or (d.obligacion_id is not null and public.ctr_ve_obligacion(d.obligacion_id))
        or exists (select 1 from public.ctr_documento_contrato dc
                   where dc.documento_id = d.id and public.ctr_ve_contrato(dc.contrato_id))
        or (d.subido_por = auth.uid() and d.equipo_id is null and d.obligacion_id is null
            and not exists (select 1 from public.ctr_documento_contrato dc where dc.documento_id = d.id))))
    else false end;
$f$;

-- Editar/borrar un documento: como verlo, pero sin que respalde ningún contrato que no pueda editar.
create or replace function public.ctr_edita_documento(p_id bigint)
returns boolean language sql security definer stable set search_path = public as $f$
  select case public.app_rol('dashboard')
    when 'direccion' then true
    when 'compras' then public.ctr_ve_documento(p_id)
      and not exists (select 1 from public.ctr_documento_contrato dc
                      where dc.documento_id = p_id and not public.ctr_edita_contrato(dc.contrato_id))
    else false end;
$f$;

revoke all on function public.ctr_rol()                                       from public, anon;
revoke all on function public.ctr_ve_contrato(bigint)                         from public, anon;
revoke all on function public.ctr_edita_contrato(bigint)                      from public, anon;
revoke all on function public.ctr_ve_obligacion_fila(bigint,bigint,bigint)    from public, anon;
revoke all on function public.ctr_edita_obligacion_fila(bigint,bigint,bigint) from public, anon;
revoke all on function public.ctr_ve_obligacion(bigint)                       from public, anon;
revoke all on function public.ctr_edita_obligacion(bigint)                    from public, anon;
revoke all on function public.ctr_ve_documento(bigint)                        from public, anon;
revoke all on function public.ctr_edita_documento(bigint)                     from public, anon;
grant execute on function public.ctr_rol()                                       to authenticated;
grant execute on function public.ctr_ve_contrato(bigint)                         to authenticated;
grant execute on function public.ctr_edita_contrato(bigint)                      to authenticated;
grant execute on function public.ctr_ve_obligacion_fila(bigint,bigint,bigint)    to authenticated;
grant execute on function public.ctr_edita_obligacion_fila(bigint,bigint,bigint) to authenticated;
grant execute on function public.ctr_ve_obligacion(bigint)                       to authenticated;
grant execute on function public.ctr_edita_obligacion(bigint)                    to authenticated;
grant execute on function public.ctr_ve_documento(bigint)                        to authenticated;
grant execute on function public.ctr_edita_documento(bigint)                     to authenticated;

-- ── 3. Triggers ─────────────────────────────────────────────────────────────
-- Autoría: quién crea y quién modifica, sin fiarse de lo que mande el navegador.
create or replace function public.ctr_autoria()
returns trigger language plpgsql as $f$
begin
  if tg_op = 'INSERT' then
    new.creado_por := auth.uid();
    new.creado_en := now();
  else
    new.creado_por := old.creado_por;     -- no se puede reescribir
    new.creado_en := old.creado_en;
  end if;
  new.modificado_por := auth.uid();
  new.modificado_en := now();
  return new;
end;
$f$;

create or replace function public.ctr_autoria_subida()   -- ctr_documentos: subido_por / subido_en
returns trigger language plpgsql as $f$
begin
  if tg_op = 'INSERT' then
    new.subido_por := auth.uid();
    new.subido_en := now();
  else
    new.subido_por := old.subido_por;
    new.subido_en := old.subido_en;
  end if;
  return new;
end;
$f$;

create or replace function public.ctr_autoria_registro()  -- ctr_realizadas: registrado_por / registrado_en
returns trigger language plpgsql as $f$
begin
  if tg_op = 'INSERT' then
    new.registrado_por := auth.uid();
    new.registrado_en := now();
  else
    new.registrado_por := old.registrado_por;
    new.registrado_en := old.registrado_en;
  end if;
  return new;
end;
$f$;

create or replace function public.ctr_autoria_nota()      -- ctr_tareas_notas
returns trigger language plpgsql as $f$
begin
  new.modificado_por := auth.uid();
  new.modificado_en := now();
  return new;
end;
$f$;

-- Solo direccion cambia la vista de un contrato (compras no puede «traerse» un contrato ni cedérselo a Administración)
create or replace function public.ctr_proteger_vista()
returns trigger language plpgsql as $f$
begin
  if new.vista is distinct from old.vista and public.app_rol('dashboard') is distinct from 'direccion' then
    raise exception 'Solo dirección puede cambiar la vista de un contrato' using errcode = '42501';
  end if;
  return new;
end;
$f$;

do $t$
declare t text;
begin
  foreach t in array array['ctr_contratos','ctr_grupos_equipos','ctr_equipos','ctr_obligaciones','ctr_hitos','ctr_tareas'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_autoria', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.ctr_autoria()', t || '_autoria', t);
  end loop;
end;
$t$;
drop trigger if exists ctr_documentos_autoria on public.ctr_documentos;
create trigger ctr_documentos_autoria before insert or update on public.ctr_documentos
  for each row execute function public.ctr_autoria_subida();
drop trigger if exists ctr_realizadas_autoria on public.ctr_realizadas;
create trigger ctr_realizadas_autoria before insert or update on public.ctr_realizadas
  for each row execute function public.ctr_autoria_registro();
drop trigger if exists ctr_tareas_notas_autoria on public.ctr_tareas_notas;
create trigger ctr_tareas_notas_autoria before insert or update on public.ctr_tareas_notas
  for each row execute function public.ctr_autoria_nota();
drop trigger if exists ctr_contratos_proteger_vista on public.ctr_contratos;
create trigger ctr_contratos_proteger_vista before update on public.ctr_contratos
  for each row execute function public.ctr_proteger_vista();

-- ── 4. RLS y privilegios ────────────────────────────────────────────────────
-- Supabase da por defecto todos los privilegios a anon/authenticated sobre las
-- tablas nuevas de public: se retiran y se conceden explícitamente (cambio de
-- Supabase del 30/10/2026: sin GRANT explícito la API deja de exponer la tabla).
do $p$
declare t text;
begin
  foreach t in array array[
    'ctr_contratos','ctr_grupos_equipos','ctr_equipos','ctr_contrato_equipo','ctr_obligaciones',
    'ctr_realizadas','ctr_realizada_unidades','ctr_hitos','ctr_documentos','ctr_documento_contrato',
    'ctr_tareas','ctr_tareas_notas','ctr_lecturas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon', t);
    if t = 'ctr_lecturas' then
      execute format('grant select on table public.%I to authenticated', t);
    else
      execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    end if;
  end loop;
  -- secuencias de los bigserial
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'S' and c.relname like 'ctr\_%' loop
    execute format('revoke all on sequence public.%I from public, anon', t);
    execute format('grant usage, select on sequence public.%I to authenticated', t);
  end loop;
  -- políticas anteriores del módulo (por si se re-ejecuta): fuera, se recrean abajo
  for t in select policyname || '|' || tablename from pg_policies
           where schemaname = 'public' and tablename like 'ctr\_%' loop
    execute format('drop policy if exists %I on public.%I', split_part(t, '|', 1), split_part(t, '|', 2));
  end loop;
end;
$p$;

-- Contratos
create policy ctr_contratos_leer on public.ctr_contratos for select to authenticated
  using (public.ctr_ve_contrato(id));
create policy ctr_contratos_crear on public.ctr_contratos for insert to authenticated
  with check ((select public.app_rol('dashboard')) = 'direccion'
              or ((select public.app_rol('dashboard')) = 'compras' and vista = 'compras_fabrica'));
create policy ctr_contratos_editar on public.ctr_contratos for update to authenticated
  using (public.ctr_edita_contrato(id))
  with check ((select public.app_rol('dashboard')) = 'direccion'
              or ((select public.app_rol('dashboard')) = 'compras' and vista = 'compras_fabrica'));
create policy ctr_contratos_borrar on public.ctr_contratos for delete to authenticated
  using (public.ctr_edita_contrato(id));

-- Equipos y grupos: ambos roles, todo
create policy ctr_grupos_equipos_acceso on public.ctr_grupos_equipos for all to authenticated
  using ((select public.app_rol('dashboard')) in ('direccion','compras'))
  with check ((select public.app_rol('dashboard')) in ('direccion','compras'));
create policy ctr_equipos_acceso on public.ctr_equipos for all to authenticated
  using ((select public.app_rol('dashboard')) in ('direccion','compras'))
  with check ((select public.app_rol('dashboard')) in ('direccion','compras'));

-- Contrato—equipo: leer si ve el contrato; escribir solo si lo edita
-- (si no, compras podría hacerse visible cualquier contrato enlazándole un equipo)
create policy ctr_contrato_equipo_leer on public.ctr_contrato_equipo for select to authenticated
  using (public.ctr_ve_contrato(contrato_id));
create policy ctr_contrato_equipo_escribir on public.ctr_contrato_equipo for all to authenticated
  using (public.ctr_edita_contrato(contrato_id))
  with check (public.ctr_edita_contrato(contrato_id));

-- Obligaciones y realizadas
create policy ctr_obligaciones_leer on public.ctr_obligaciones for select to authenticated
  using (public.ctr_ve_obligacion_fila(equipo_id, grupo_id, contrato_id));
create policy ctr_obligaciones_escribir on public.ctr_obligaciones for all to authenticated
  using (public.ctr_edita_obligacion_fila(equipo_id, grupo_id, contrato_id))
  with check (public.ctr_edita_obligacion_fila(equipo_id, grupo_id, contrato_id));

create policy ctr_realizadas_leer on public.ctr_realizadas for select to authenticated
  using (public.ctr_ve_obligacion(obligacion_id));
create policy ctr_realizadas_escribir on public.ctr_realizadas for all to authenticated
  using (public.ctr_edita_obligacion(obligacion_id))
  with check (public.ctr_edita_obligacion(obligacion_id));

create policy ctr_realizada_unidades_leer on public.ctr_realizada_unidades for select to authenticated
  using (public.ctr_ve_obligacion((select r.obligacion_id from public.ctr_realizadas r where r.id = realizada_id)));
create policy ctr_realizada_unidades_escribir on public.ctr_realizada_unidades for all to authenticated
  using (public.ctr_edita_obligacion((select r.obligacion_id from public.ctr_realizadas r where r.id = realizada_id)))
  with check (public.ctr_edita_obligacion((select r.obligacion_id from public.ctr_realizadas r where r.id = realizada_id)));

-- Hitos y documento—contrato: según el contrato
create policy ctr_hitos_leer on public.ctr_hitos for select to authenticated
  using (public.ctr_ve_contrato(contrato_id));
create policy ctr_hitos_escribir on public.ctr_hitos for all to authenticated
  using (public.ctr_edita_contrato(contrato_id))
  with check (public.ctr_edita_contrato(contrato_id));

create policy ctr_documento_contrato_leer on public.ctr_documento_contrato for select to authenticated
  using (public.ctr_ve_contrato(contrato_id));
create policy ctr_documento_contrato_escribir on public.ctr_documento_contrato for all to authenticated
  using (public.ctr_edita_contrato(contrato_id))
  with check (public.ctr_edita_contrato(contrato_id));

-- Documentos: la ficha se crea antes de enlazarla (subido_por lo pone el trigger)
create policy ctr_documentos_leer on public.ctr_documentos for select to authenticated
  using (public.ctr_ve_documento(id));
create policy ctr_documentos_crear on public.ctr_documentos for insert to authenticated
  with check ((select public.app_rol('dashboard')) = 'direccion'
              or ((select public.app_rol('dashboard')) = 'compras'
                  and (equipo_id is not null
                       or (obligacion_id is not null and public.ctr_edita_obligacion(obligacion_id))
                       or (equipo_id is null and obligacion_id is null))));
create policy ctr_documentos_editar on public.ctr_documentos for update to authenticated
  using (public.ctr_edita_documento(id))
  with check ((select public.app_rol('dashboard')) = 'direccion'
              or ((select public.app_rol('dashboard')) = 'compras'
                  and (obligacion_id is null or public.ctr_edita_obligacion(obligacion_id))));
create policy ctr_documentos_borrar on public.ctr_documentos for delete to authenticated
  using (public.ctr_edita_documento(id));

-- Tareas: direccion todo · compras lee las de su vista y las de contratos que ve; escribe solo en su vista
create policy ctr_tareas_leer on public.ctr_tareas for select to authenticated
  using ((select public.app_rol('dashboard')) = 'direccion'
         or ((select public.app_rol('dashboard')) = 'compras'
             and (vista = 'compras_fabrica' or (contrato_id is not null and public.ctr_ve_contrato(contrato_id)))));
create policy ctr_tareas_escribir on public.ctr_tareas for all to authenticated
  using ((select public.app_rol('dashboard')) = 'direccion'
         or ((select public.app_rol('dashboard')) = 'compras' and vista = 'compras_fabrica'))
  with check ((select public.app_rol('dashboard')) = 'direccion'
              or ((select public.app_rol('dashboard')) = 'compras' and vista = 'compras_fabrica'));

create policy ctr_tareas_notas_acceso on public.ctr_tareas_notas for all to authenticated
  using ((select public.app_rol('dashboard')) in ('direccion','compras'))
  with check ((select public.app_rol('dashboard')) in ('direccion','compras'));

-- Lecturas: solo lee direccion; escribe solo la función de servidor (clave de servicio, sin política)
create policy ctr_lecturas_leer on public.ctr_lecturas for select to authenticated
  using ((select public.app_rol('dashboard')) = 'direccion');

-- ── 5. Interruptor del lector (apagado hasta el visto bueno de Daniel, P9) ──
insert into public.configuracion (key, value) values ('ctr_lector_activo', 'false'::jsonb)
on conflict (key) do nothing;

-- ── Guarda: si algo queda abierto, no se aplica nada ────────────────────────
do $g$
declare fallo text := ''; n int;
begin
  select count(*) into n from pg_tables where schemaname = 'public' and tablename like 'ctr\_%' and rowsecurity;
  if n <> 13 then fallo := fallo || format(' hay %s tablas ctr_ con RLS, se esperaban 13;', n); end if;

  select count(*) into n from pg_tables t where t.schemaname = 'public' and t.tablename like 'ctr\_%'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename);
  if n > 0 then fallo := fallo || format(' %s tablas ctr_ sin ninguna política;', n); end if;

  -- Las políticas FOR INSERT no tienen USING (qual queda NULL): en ellas lo que
  -- filtra es el WITH CHECK, así que se mira ese; en el resto, el USING.
  select count(*) into n from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'
    and (coalesce(case when cmd = 'INSERT' then with_check else qual end, 'true') = 'true'
         or qual like '%auth.role()%' or with_check like '%auth.role()%'
         or 'anon' = any(roles::text[]) or 'public' = any(roles::text[]));
  if n > 0 then fallo := fallo || format(' %s políticas ctr_ abiertas (true, auth.role() o anon);', n); end if;

  select count(*) into n from information_schema.role_table_grants
    where table_schema = 'public' and table_name like 'ctr\_%' and grantee in ('anon', 'PUBLIC');
  if n > 0 then fallo := fallo || format(' %s privilegios de anon/public sobre tablas ctr_;', n); end if;

  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', p.oid, 'execute');
  if n > 0 then fallo := fallo || format(' %s funciones ctr_ ejecutables sin sesión;', n); end if;

  if not exists (select 1 from public.configuracion where key = 'ctr_lector_activo') then
    fallo := fallo || ' falta configuracion.ctr_lector_activo;'; end if;

  if fallo <> '' then raise exception 'MIGRACIÓN ABORTADA, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'tablas ctr_ con RLS' as comprobacion,
       (select count(*)::text from pg_tables where schemaname = 'public' and tablename like 'ctr\_%' and rowsecurity) as valor,
       '13' as esperado
union all select 'políticas sobre tablas ctr_',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'ctr\_%'), '26'
union all select 'privilegios de anon sobre tablas ctr_',
       (select count(*)::text from information_schema.role_table_grants
        where table_schema = 'public' and table_name like 'ctr\_%' and grantee = 'anon'), '0'
union all select 'funciones ctr_ ejecutables sin sesión',
       (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
        where s.nspname = 'public' and p.proname like 'ctr\_%' and p.prorettype <> 'trigger'::regtype
          and has_function_privilege('anon', p.oid, 'execute')), '0'
union all select 'lector de PDF activo',
       (select value::text from public.configuracion where key = 'ctr_lector_activo'), 'false';

-- ============================================================================
-- SIGUIENTE: sql/contratos_migracion_bucket_2026-09-22.sql (bucket privado) y
-- después sql/contratos_comprobacion_permisos.sql. Las tablas quedan vacías: la
-- carga inicial es el bloque 1.3.
-- ============================================================================
