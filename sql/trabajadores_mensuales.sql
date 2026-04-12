-- ============================================
-- TABLA: trabajadores_mensuales
-- Número de trabajadores por mes y año
-- ============================================

CREATE TABLE IF NOT EXISTS trabajadores_mensuales (
  id BIGSERIAL PRIMARY KEY,
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  trabajadores INTEGER NOT NULL CHECK (trabajadores >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(año, mes)
);

-- RLS
ALTER TABLE trabajadores_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read trabajadores"
  ON trabajadores_mensuales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trabajadores"
  ON trabajadores_mensuales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trabajadores"
  ON trabajadores_mensuales FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete trabajadores"
  ON trabajadores_mensuales FOR DELETE
  TO authenticated
  USING (true);
