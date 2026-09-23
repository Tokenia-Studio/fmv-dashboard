-- ============================================================================
-- MARCHA ATRÁS de sql/saldos_cerrados_2026-09-23.sql
-- ============================================================================
-- Borra la tabla de saldos de años cerrados. La app no se rompe: si la tabla no
-- existe o está vacía para un año, lee ese año completo del diario (`movimientos`),
-- como antes del snapshot de abril (más lento, mismos importes).
-- ============================================================================
begin;
drop table if exists public.saldos_cerrados;
commit;

select 'saldos_cerrados existe' as comprobacion,
       case when to_regclass('public.saldos_cerrados') is null then 'no' else 'SÍ' end as valor,
       'no' as esperado;
