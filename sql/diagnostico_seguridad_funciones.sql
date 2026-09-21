-- ============================================================================
-- DIAGNÓSTICO DE SEGURIDAD (2/2) — solo lectura, no cambia nada
-- Cuerpo real en producción de las funciones expuestas, contenido del bucket
-- público y uso de las tablas heredadas. Una sola sentencia.
-- ============================================================================
SELECT '1 función' AS seccion,
       p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS objeto,
       pg_get_functiondef(p.oid) AS detalle
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('delete_user', 'prod_list_auth_users', 'prod_truncate_carga_tables',
                    'prod_get_user_role', 'prod_can_edit', 'prod_can_mark_done')

UNION ALL
SELECT '2 bucket', bucket_id,
       count(*) || ' ficheros · ' || pg_size_pretty(COALESCE(sum((metadata->>'size')::bigint), 0)) ||
       ' · último: ' || COALESCE(max(created_at)::date::text, '—')
FROM storage.objects GROUP BY bucket_id

UNION ALL
SELECT '3 tabla heredada', 'user_roles', count(*) || ' filas' FROM public.user_roles
UNION ALL
SELECT '3 tabla heredada', 'prod_user_roles', count(*) || ' filas' FROM public.prod_user_roles
UNION ALL
SELECT '3 tabla heredada', 'prod_personas', count(*) || ' filas' FROM public.prod_personas

UNION ALL
-- ¿Quién depende de las tablas heredadas? (políticas o funciones que las nombran)
SELECT '4 dependencia', pol.tablename || ' · ' || pol.policyname,
       COALESCE(pol.qual, '') || ' ' || COALESCE(pol.with_check, '')
FROM pg_policies pol
WHERE pol.schemaname = 'public'
  AND (COALESCE(pol.qual, '') || COALESCE(pol.with_check, '')) ~ '(^|[^_])user_roles'
ORDER BY 1, 2;
