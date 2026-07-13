-- ============================================
-- TIPOS FINANCIACION - Naturaleza editable de cada línea de deuda
-- (pestaña Financiación → tabla "Deuda viva por préstamo")
-- ============================================

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
