-- Prueba local: simula producción ANTES del 20/10/2026 para ver que la comprobación nueva FALLA contra las reglas viejas.
-- Uso: node probar.mjs reglas_viejas_2026-10-20.sql !contratos_tareas_documentos_2026-10-20_comprobacion.sql (sin la migración del 20/10)
-- Simula producción ANTES del 20/10: columnas para que la comprobación pueda escribir, sin trigger,
-- y el almacén con su regla vieja (basta con ver la ficha). La función vacía solo pasa la guarda.
alter table public.ctr_tareas_notas add column motivo_descarte text, add column descartada_texto text,
  add column descartada_por uuid, add column descartada_en timestamptz;
create function public.ctr_tareas_notas_descarte() returns trigger language plpgsql as $f$ begin return new; end $f$;
create function public.ctr_pdf_visible(p_ruta text, p_owner text) returns boolean language sql security definer stable set search_path = public as $f$
  select exists (select 1 from public.ctr_documentos d where d.ruta = p_ruta and public.ctr_ve_documento(d.id)) $f$;
revoke all on function public.ctr_pdf_visible(text, text) from public, anon;
grant execute on function public.ctr_pdf_visible(text, text) to authenticated;
