-- ============================================
-- MAESTRO DE CLIENTES (08/09/2026)
-- Ejecutar en Supabase SQL Editor
--
-- Motivo: el diario de Business Central trae "Cód. procedencia mov."
-- que en cuentas 43x/44x es el número de CLIENTE, no de proveedor.
-- BC numera clientes y proveedores en series independientes, así que
-- resolver esos códigos contra el maestro de proveedores daba nombres
-- equivocados (000182 = STADLER como cliente, COMELAR como proveedor).
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes(codigo);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_select" ON clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON clientes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clientes_update" ON clientes
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "clientes_delete" ON clientes
  FOR DELETE TO authenticated USING (true);
