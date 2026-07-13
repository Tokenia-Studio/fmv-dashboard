-- ============================================
-- PENDIENTES 13/07/2026 - Ejecutar en Supabase SQL Editor
-- 1) Tabla tipos_financiacion (desplegable de tipo en Financiación)
-- 2) Columna horas_totales (horas manuales en Personal → Productividad)
-- ============================================

-- 1) Naturaleza editable de cada línea de deuda
CREATE TABLE IF NOT EXISTS tipos_financiacion (
  cuenta TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tipos_financiacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage tipos_financiacion" ON tipos_financiacion;
CREATE POLICY "Authenticated users can manage tipos_financiacion"
  ON tipos_financiacion FOR ALL
  USING (auth.role() = 'authenticated');

-- 2) Horas totales manuales por mes (NULL = usar cálculo automático
--    trabajadores × horas laborables del calendario)
ALTER TABLE trabajadores_mensuales
  ADD COLUMN IF NOT EXISTS horas_totales NUMERIC(10,2);
