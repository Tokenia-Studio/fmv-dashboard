-- SEGURIDAD-OK: marcha atrás; reproduce a propósito las reglas inseguras anteriores al 21-sep-2026
-- ============================================================================
-- MARCHA ATRÁS del paso 1 de seguridad (21-sep-2026)
-- Devuelve producción EXACTAMENTE al estado anterior, que era inseguro.
-- Usar solo si alguna app deja de funcionar, y solo el bloque que haga falta.
-- ============================================================================
begin;

-- 2 · Si Producción no puede recargar datos (lo más probable que haya que deshacer)
create or replace function public.prod_truncate_carga_tables()
returns void language plpgsql security definer
as $f$
begin
  truncate prod_ordenes, prod_rutas, prod_componentes, prod_tiempos, prod_productos restart identity;
end;
$f$;
grant execute on function public.prod_truncate_carga_tables() to anon, authenticated;

-- 4 · Si Producción no puede leer o editar la plantilla
drop policy if exists prod_personas_leer     on public.prod_personas;
drop policy if exists prod_personas_escribir on public.prod_personas;
create policy prod_personas_all on public.prod_personas for all to public using (true) with check (true);

-- 5 · Si alguna pantalla no lee el calendario laboral
create policy "Todos pueden leer calendario" on public.prod_calendario for select to public using (true);

-- 1, 3 y 6 · No deberían hacer falta: nadie usa esas funciones, esa tabla ni ese bucket
-- grant execute on function public.delete_user(uuid) to anon, authenticated;
-- grant execute on function public.prod_list_auth_users() to anon, authenticated;
-- create policy "Users can read all roles" on public.user_roles for select to public using (true);
-- create policy "Users can insert roles"   on public.user_roles for insert to public with check (true);
-- create policy "Users can update roles"   on public.user_roles for update to public using (true);
-- create policy "Users can delete roles"   on public.user_roles for delete to public using (true);
-- update storage.buckets set public = true where id = 'doc-previews';
-- create policy public_read_previews on storage.objects for select to public using (bucket_id = 'doc-previews');

commit;
select 'marcha atrás aplicada' as resultado;
