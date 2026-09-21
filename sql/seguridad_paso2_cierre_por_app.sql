-- ============================================================================
-- SEGURIDAD · PASO 2 · CIERRE POR APP (preparado el 21-sep-2026)
-- Proyecto Supabase compartido de FMV (Dashboard + Producción + Comercial)
-- ============================================================================
-- Hoy 36 tablas aceptan a CUALQUIER usuario con sesión, sea de la app que
-- sea: un usuario de taller puede leer y borrar el diario contable o los costes
-- de personal; el usuario de compras del Dashboard puede escribir en Producción.
--
-- Este paso sustituye esas reglas por «tiene rol en la app dueña de la tabla»:
--   · Tablas del Dashboard  → rol en la app 'dashboard'  (direccion, compras)
--   · Tablas de Producción  → rol en la app 'produccion' (cualquiera de sus roles)
--   · Compartidas de verdad → rol en cualquiera de las dos
--       prod_calendario: lo lee el Dashboard (pestaña Personal); escribe Producción
--       series_estructuras, tiempos_estandar: las usan las dos apps
--   · doc_* (módulo documental retirado) y bucket doc-entrada → cerrados
--
-- Para los usuarios legítimos NO cambia nada: dentro de cada app, todos sus
-- roles siguen pudiendo lo mismo que hoy. Solo se corta el acceso cruzado.
-- Comercial no se ve afectada: trabaja en servidor con la clave de servicio.
--
-- Las políticas actuales se guardan en public.seg_backup_politicas_20260921
-- antes de borrarlas: la marcha atrás (seguridad_paso2_MARCHA_ATRAS.sql) las
-- reconstruye desde ahí, exactamente como estaban.
--
-- Rendimiento: la condición va como (select app_rol(...)) para que Postgres la
-- evalúe UNA vez por consulta y no una por fila (el diario tiene cientos de
-- miles de filas).
--
-- Cómo ejecutar: clic en el editor → Ctrl+A → Ctrl+V → Ctrl+Enter.
-- Ejecutar con tiempo para probar las dos apps justo después (lista al final).
-- ============================================================================
begin;

-- 0 ── Función de rol por app (la reutilizará el módulo de contratos) ────────
create or replace function public.app_rol(p_app text)
returns text
language sql
security definer
stable
set search_path = public
as $f$
  select role from public.app_user_roles
  where user_id = auth.uid() and app = p_app
  limit 1;
$f$;
revoke all on function public.app_rol(text) from public, anon;
grant execute on function public.app_rol(text) to authenticated;

-- Las tres funciones de rol de Producción dejan de estar disponibles sin sesión
revoke all on function public.prod_get_user_role() from public, anon;
revoke all on function public.prod_can_edit()      from public, anon;
revoke all on function public.prod_can_mark_done() from public, anon;
grant execute on function public.prod_get_user_role() to authenticated;
grant execute on function public.prod_can_edit()      to authenticated;
grant execute on function public.prod_can_mark_done() to authenticated;

-- 1 ── Copia de las políticas actuales (para la marcha atrás) ────────────────
create table if not exists public.seg_backup_politicas_20260921 (
  esquema text, tabla text, politica text, permisiva text, roles name[], cmd text,
  qual text, with_check text, guardado_en timestamptz default now()
);
alter table public.seg_backup_politicas_20260921 enable row level security;  -- sin políticas: solo clave de servicio
revoke all on public.seg_backup_politicas_20260921 from anon, authenticated;

-- (solo guarda si la copia está vacía: si se ejecuta dos veces no pisa el original)
insert into public.seg_backup_politicas_20260921 (esquema, tabla, politica, permisiva, roles, cmd, qual, with_check)
select schemaname::text, tablename::text, policyname::text, permissive, roles, cmd, qual, with_check
from pg_policies
where not exists (select 1 from public.seg_backup_politicas_20260921)
  and ((schemaname = 'public' and tablename = any (array[
    'archivos_cargados',
    'clientes',
    'configuracion',
    'datos_manuales',
    'movimientos',
    'notas_compras',
    'plan_cuentas',
    'planificacion_ordenes',
    'proveedores',
    'trabajadores_mensuales',
    'albaranes_facturas',
    'mapeo_grupo_cuenta',
    'pedidos_compra',
    'presupuestos',
    'tipos_financiacion',
    'prod_asignaciones',
    'prod_familias',
    'prod_fecha_of',
    'prod_fecha_pcp',
    'prod_grupos_trabajo',
    'prod_notas_pcp',
    'prod_notas_subcont',
    'prod_persona_ausencias',
    'prod_recibido_pcp',
    'prod_recibido_subcont',
    'prod_seccion_estado',
    'prod_seccion_nota_material',
    'prod_subcont_manual',
    'prod_taller_por_codigo',
    'prod_capacidad_centros',
    'series_estructuras',
    'tiempos_estandar',
    'prod_calendario',
    'doc_batches',
    'doc_documents',
    'doc_processing_log'
  ]::name[]))
  or (schemaname = 'storage' and tablename = 'objects'
      and policyname in ('Allow authenticated reads', 'Allow authenticated uploads')));

-- 2 ── Fuera todas las políticas de esas tablas (por bucle: no dependo de sus nombres)
do $d$
declare r record;
begin
  for r in select p.tablename, p.policyname from pg_policies p
           where p.schemaname = 'public' and p.tablename = any (array[
    'archivos_cargados',
    'clientes',
    'configuracion',
    'datos_manuales',
    'movimientos',
    'notas_compras',
    'plan_cuentas',
    'planificacion_ordenes',
    'proveedores',
    'trabajadores_mensuales',
    'albaranes_facturas',
    'mapeo_grupo_cuenta',
    'pedidos_compra',
    'presupuestos',
    'tipos_financiacion',
    'prod_asignaciones',
    'prod_familias',
    'prod_fecha_of',
    'prod_fecha_pcp',
    'prod_grupos_trabajo',
    'prod_notas_pcp',
    'prod_notas_subcont',
    'prod_persona_ausencias',
    'prod_recibido_pcp',
    'prod_recibido_subcont',
    'prod_seccion_estado',
    'prod_seccion_nota_material',
    'prod_subcont_manual',
    'prod_taller_por_codigo',
    'prod_capacidad_centros',
    'series_estructuras',
    'tiempos_estandar',
    'prod_calendario',
    'doc_batches',
    'doc_documents',
    'doc_processing_log'
  ]::name[])
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$d$;
drop policy if exists "Allow authenticated reads"   on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;
-- 3 ── Tablas del Dashboard ──────────────────────────────────────────────────
create policy archivos_cargados_acceso on public.archivos_cargados for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy clientes_acceso on public.clientes for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy configuracion_acceso on public.configuracion for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy datos_manuales_acceso on public.datos_manuales for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy movimientos_acceso on public.movimientos for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy notas_compras_acceso on public.notas_compras for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy plan_cuentas_acceso on public.plan_cuentas for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy planificacion_ordenes_acceso on public.planificacion_ordenes for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy proveedores_acceso on public.proveedores for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy trabajadores_mensuales_acceso on public.trabajadores_mensuales for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy albaranes_facturas_acceso on public.albaranes_facturas for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy mapeo_grupo_cuenta_acceso on public.mapeo_grupo_cuenta for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy pedidos_compra_acceso on public.pedidos_compra for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy presupuestos_acceso on public.presupuestos for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);
create policy tipos_financiacion_acceso on public.tipos_financiacion for all to authenticated
  using ((select public.app_rol('dashboard')) is not null) with check ((select public.app_rol('dashboard')) is not null);

-- 4 ── Tablas de Producción ────────────────────────────────────────────────
create policy prod_asignaciones_acceso on public.prod_asignaciones for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_familias_acceso on public.prod_familias for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_fecha_of_acceso on public.prod_fecha_of for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_fecha_pcp_acceso on public.prod_fecha_pcp for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_grupos_trabajo_acceso on public.prod_grupos_trabajo for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_notas_pcp_acceso on public.prod_notas_pcp for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_notas_subcont_acceso on public.prod_notas_subcont for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_persona_ausencias_acceso on public.prod_persona_ausencias for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_recibido_pcp_acceso on public.prod_recibido_pcp for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_recibido_subcont_acceso on public.prod_recibido_subcont for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_seccion_estado_acceso on public.prod_seccion_estado for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_seccion_nota_material_acceso on public.prod_seccion_nota_material for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_subcont_manual_acceso on public.prod_subcont_manual for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_taller_por_codigo_acceso on public.prod_taller_por_codigo for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);
create policy prod_capacidad_centros_acceso on public.prod_capacidad_centros for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);

-- 5 ── Compartidas ─────────────────────────────────────────────────────────
create policy series_estructuras_acceso on public.series_estructuras for all to authenticated
  using (((select public.app_rol('dashboard')) is not null or (select public.app_rol('produccion')) is not null)) with check (((select public.app_rol('dashboard')) is not null or (select public.app_rol('produccion')) is not null));
create policy tiempos_estandar_acceso on public.tiempos_estandar for all to authenticated
  using (((select public.app_rol('dashboard')) is not null or (select public.app_rol('produccion')) is not null)) with check (((select public.app_rol('dashboard')) is not null or (select public.app_rol('produccion')) is not null));
create policy prod_calendario_leer on public.prod_calendario for select to authenticated
  using (((select public.app_rol('dashboard')) is not null or (select public.app_rol('produccion')) is not null));
create policy prod_calendario_escribir on public.prod_calendario for all to authenticated
  using ((select public.app_rol('produccion')) is not null) with check ((select public.app_rol('produccion')) is not null);

-- 6 ── doc_* quedan con RLS activa y sin políticas (módulo retirado) ────────
alter table public.doc_batches enable row level security;
alter table public.doc_documents enable row level security;
alter table public.doc_processing_log enable row level security;

-- Guarda ─────────────────────────────────────────────────────────────────────
do $g$
declare fallo text := ''; n int;
begin
  select count(*) into n from public.seg_backup_politicas_20260921;
  if n = 0 then fallo := fallo || ' no se ha guardado ninguna política en la copia;'; end if;

  select count(*) into n from pg_policies
  where schemaname = 'public'
    and (coalesce(qual, 'true') = 'true' or qual like '%auth.role()%')
    and (coalesce(with_check, 'true') = 'true' or with_check like '%auth.role()%');
  if n > 0 then fallo := fallo || ' quedan ' || n || ' políticas abiertas a cualquier autenticado;'; end if;

  select count(*) into n from unnest(array[
    'archivos_cargados',
    'clientes',
    'configuracion',
    'datos_manuales',
    'movimientos',
    'notas_compras',
    'plan_cuentas',
    'planificacion_ordenes',
    'proveedores',
    'trabajadores_mensuales',
    'albaranes_facturas',
    'mapeo_grupo_cuenta',
    'pedidos_compra',
    'presupuestos',
    'tipos_financiacion',
    'prod_asignaciones',
    'prod_familias',
    'prod_fecha_of',
    'prod_fecha_pcp',
    'prod_grupos_trabajo',
    'prod_notas_pcp',
    'prod_notas_subcont',
    'prod_persona_ausencias',
    'prod_recibido_pcp',
    'prod_recibido_subcont',
    'prod_seccion_estado',
    'prod_seccion_nota_material',
    'prod_subcont_manual',
    'prod_taller_por_codigo',
    'prod_capacidad_centros',
    'series_estructuras',
    'tiempos_estandar',
    'prod_calendario'
  ]) t where not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t::name);
  if n > 0 then fallo := fallo || ' ' || n || ' tablas en uso se han quedado sin política (la app dejaría de leerlas);'; end if;

  if has_function_privilege('anon', 'public.app_rol(text)', 'execute') then fallo := fallo || ' app_rol abierta a anon;'; end if;
  if not has_function_privilege('authenticated', 'public.prod_get_user_role()', 'execute') then
    fallo := fallo || ' prod_get_user_role cerrada para usuarios con sesión (Producción dejaría de funcionar);'; end if;
  if not has_function_privilege('authenticated', 'public.prod_can_edit()', 'execute') then
    fallo := fallo || ' prod_can_edit cerrada para usuarios con sesión;'; end if;

  if fallo <> '' then raise exception 'PASO 2 ABORTADO, no se ha aplicado nada:%', fallo; end if;
end;
$g$;

commit;

-- Resultado (lo único que muestra el editor)
select 'políticas guardadas en la copia' as comprobacion, count(*)::text as valor, 'más de 70' as esperado
  from public.seg_backup_politicas_20260921
union all select 'políticas abiertas a cualquier autenticado',
  (select count(*)::text from pg_policies where schemaname = 'public'
    and (coalesce(qual, 'true') = 'true' or qual like '%auth.role()%')
    and (coalesce(with_check, 'true') = 'true' or with_check like '%auth.role()%')), '0'
union all select 'tablas en uso con política',
  (select count(distinct tablename)::text from pg_policies where schemaname = 'public' and tablename = any (array[
    'archivos_cargados',
    'clientes',
    'configuracion',
    'datos_manuales',
    'movimientos',
    'notas_compras',
    'plan_cuentas',
    'planificacion_ordenes',
    'proveedores',
    'trabajadores_mensuales',
    'albaranes_facturas',
    'mapeo_grupo_cuenta',
    'pedidos_compra',
    'presupuestos',
    'tipos_financiacion',
    'prod_asignaciones',
    'prod_familias',
    'prod_fecha_of',
    'prod_fecha_pcp',
    'prod_grupos_trabajo',
    'prod_notas_pcp',
    'prod_notas_subcont',
    'prod_persona_ausencias',
    'prod_recibido_pcp',
    'prod_recibido_subcont',
    'prod_seccion_estado',
    'prod_seccion_nota_material',
    'prod_subcont_manual',
    'prod_taller_por_codigo',
    'prod_capacidad_centros',
    'series_estructuras',
    'tiempos_estandar',
    'prod_calendario'
  ]::name[])), '33'
union all select 'funciones de rol ejecutables sin sesión',
  (select count(*)::text from (values ('public.app_rol(text)'), ('public.prod_get_user_role()'),
     ('public.prod_can_edit()'), ('public.prod_can_mark_done()')) f(s)
   where has_function_privilege('anon', f.s, 'execute')), '0';

-- ============================================================================
-- PROBAR JUSTO DESPUÉS
--   Dashboard · direccion : entrar, que cargue el PyG (el diario), pestaña Personal
--                           (usa prod_calendario), Presupuesto, Usuarios
--   Dashboard · compras   : entrar, Servicios Ext., Proveedores, Ppto Compras (guardar una nota)
--   Producción · planificación o dirección : entrar, una carga de datos, Capacidad, Asignaciones
--   Producción · sección  : entrar, marcar un Hecho y escribir una nota de material
--   Producción · taller   : entrar y ver Secciones
-- Si algo falla: sql/seguridad_paso2_MARCHA_ATRAS.sql
-- ============================================================================
