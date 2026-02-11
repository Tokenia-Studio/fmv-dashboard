-- ============================================
-- MIGRATION: Tables for Seguimiento Estructuras
-- Run this in Supabase SQL Editor
-- ============================================

-- Table: series_estructuras
-- Stores processed production series data as JSON
CREATE TABLE IF NOT EXISTS series_estructuras (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data TEXT NOT NULL,                    -- JSON array of series
  total_series INTEGER DEFAULT 0,
  fecha_carga TIMESTAMPTZ DEFAULT NOW(),
  usuario TEXT
);

-- Enable RLS
ALTER TABLE series_estructuras ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read/write
CREATE POLICY "Authenticated users can manage series_estructuras"
  ON series_estructuras
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Table: tiempos_estandar
-- Stores theoretical standard times per model as JSON
CREATE TABLE IF NOT EXISTS tiempos_estandar (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data TEXT NOT NULL,                    -- JSON with lateral/bastidor standard times
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tiempos_estandar ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read/write
CREATE POLICY "Authenticated users can manage tiempos_estandar"
  ON tiempos_estandar
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
