-- ============================================
-- TABLA: notas_compras
-- Bloc de notas libre compartido para Ppto Compras
-- (single-row: siempre id=1)
-- ============================================

CREATE TABLE IF NOT EXISTS notas_compras (
  id INTEGER PRIMARY KEY DEFAULT 1,
  contenido TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row_only CHECK (id = 1)
);

-- Inicializar fila única (idempotente)
INSERT INTO notas_compras (id, contenido)
VALUES (1, '')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE notas_compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notas_compras"
  ON notas_compras FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update notas_compras"
  ON notas_compras FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notas_compras"
  ON notas_compras FOR INSERT
  TO authenticated
  WITH CHECK (true);
