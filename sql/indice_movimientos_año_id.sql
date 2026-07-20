-- ============================================
-- Índice para la carga paginada de movimientos por año
-- ============================================
-- Problema (20/07/2026): la carga de movimientos de 2026 devolvía HTTP 500
-- de forma intermitente en alguna de sus 16 páginas. Al fallar una sola
-- página, getByYear() abortaba el año entero y el dashboard calculaba con
-- 0 movimientos de 2026 sin avisar (rol compras se quedaba sin datos).
--
-- Causa probable: statement timeout. La consulta que hace el cliente es
--   SELECT * FROM movimientos WHERE año = X ORDER BY id LIMIT 5000 OFFSET N
-- y sin un índice compuesto (año, id) el planificador tiene que ordenar
-- grandes volúmenes en cada página. Medido con service_role (que salta RLS):
-- primera página 2.078 ms, siguientes 400-500 ms. Con RLS por medio, el
-- predicado adicional puede impedir el uso del índice y superar el límite.
--
-- Ejecutar una vez en el SQL Editor de Supabase. Es idempotente.
-- CONCURRENTLY evita bloquear la tabla mientras se crea (no puede ir dentro
-- de una transacción; si el editor da error por eso, quitar CONCURRENTLY).

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movimientos_año_id
  ON movimientos (año, id);

-- Comprobación posterior: el plan debe usar el índice y no un Seq Scan.
-- EXPLAIN ANALYZE
--   SELECT * FROM movimientos WHERE año = 2026 ORDER BY id LIMIT 5000 OFFSET 0;
