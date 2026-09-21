-- ============================================================================
-- DIAGNÓSTICO DE SEGURIDAD — solo lectura, no cambia nada
-- ============================================================================
-- Pregunta que responde: ¿qué puede leer o escribir un usuario autenticado
-- cualquiera (p. ej. un jefe de sección de FMV Producción) en el proyecto
-- Supabase compartido, llamando a la API con su propia sesión?
--
-- Es UNA sola sentencia (el editor de Supabase solo muestra la última).
-- Ejecutar en SQL Editor → descargar el resultado como CSV.
--
-- Columna `riesgo`:
--   ALTO   tabla sin RLS, política abierta a anon, o bucket público
--   MEDIO  política `true` para cualquier autenticado (no mira el rol ni la app)
--   ok     la política comprueba algo (rol, usuario, función)
--   info   dato de contexto
-- ============================================================================
WITH tablas AS (
  SELECT c.oid, c.relname AS tabla, c.relrowsecurity AS rls,
         COALESCE(s.n_live_tup, 0) AS filas
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
privilegios AS (
  SELECT table_name AS tabla, grantee,
         string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privs
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  GROUP BY table_name, grantee
)
-- 1) Tablas sin RLS: todo el que tenga GRANT lee y escribe sin filtro
SELECT '1 tabla sin RLS' AS seccion, t.tabla AS objeto,
       'filas≈' || t.filas || ' · ' || COALESCE(
         (SELECT string_agg(p.grantee || ': ' || p.privs, ' | ') FROM privilegios p WHERE p.tabla = t.tabla),
         'sin privilegios para anon/authenticated') AS detalle,
       CASE WHEN EXISTS (SELECT 1 FROM privilegios p WHERE p.tabla = t.tabla) THEN 'ALTO' ELSE 'ok' END AS riesgo
FROM tablas t WHERE NOT t.rls

UNION ALL
-- 2) Tablas con RLS pero sin ninguna política (nadie entra salvo la clave de servicio)
SELECT '2 RLS sin políticas', t.tabla, 'filas≈' || t.filas, 'info'
FROM tablas t
WHERE t.rls AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tabla)

UNION ALL
-- 3) Política a política
SELECT '3 política', p.tablename || ' · ' || p.policyname,
       p.cmd || ' → ' || array_to_string(p.roles, ',') ||
       ' · USING ' || COALESCE(p.qual, '—') || ' · CHECK ' || COALESCE(p.with_check, '—'),
       CASE
         WHEN (p.roles && ARRAY['anon','public']::name[])
              AND (COALESCE(p.qual, 'true') = 'true' AND COALESCE(p.with_check, 'true') = 'true') THEN 'ALTO'
         WHEN COALESCE(p.qual, 'true') = 'true' AND COALESCE(p.with_check, 'true') = 'true' THEN 'MEDIO'
         ELSE 'ok'
       END
FROM pg_policies p WHERE p.schemaname = 'public'

UNION ALL
-- 4) Buckets de Storage
SELECT '4 bucket', b.id,
       'público=' || b.public || ' · límite=' || COALESCE(b.file_size_limit::text, 'sin límite'),
       CASE WHEN b.public THEN 'ALTO' ELSE 'ok' END
FROM storage.buckets b

UNION ALL
-- 5) Políticas de Storage
SELECT '5 política storage', p.policyname,
       p.cmd || ' → ' || array_to_string(p.roles, ',') ||
       ' · USING ' || COALESCE(p.qual, '—') || ' · CHECK ' || COALESCE(p.with_check, '—'),
       CASE WHEN p.roles && ARRAY['anon','public']::name[] THEN 'ALTO' ELSE 'info' END
FROM pg_policies p WHERE p.schemaname = 'storage' AND p.tablename = 'objects'

UNION ALL
-- 6) Funciones SECURITY DEFINER que puede ejecutar anon o authenticated (saltan la RLS)
SELECT '6 función definer', pr.proname || '(' || pg_get_function_identity_arguments(pr.oid) || ')',
       'anon=' || has_function_privilege('anon', pr.oid, 'EXECUTE') ||
       ' · authenticated=' || has_function_privilege('authenticated', pr.oid, 'EXECUTE'),
       CASE WHEN has_function_privilege('anon', pr.oid, 'EXECUTE') THEN 'ALTO' ELSE 'info' END
FROM pg_proc pr JOIN pg_namespace n ON n.oid = pr.pronamespace
WHERE n.nspname = 'public' AND pr.prosecdef

UNION ALL
-- 7) Contexto: cuántos usuarios hay por app y rol (quién es «cualquier autenticado»)
SELECT '7 usuarios', app || ' · ' || role, count(*)::text || ' usuarios', 'info'
FROM public.app_user_roles GROUP BY app, role

ORDER BY 1, 4, 2;
