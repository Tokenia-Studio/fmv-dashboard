-- ============================================
-- TABLA PRESUPUESTOS - FMV Dashboard
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Crear tabla de presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cuenta VARCHAR(3) NOT NULL,
  importe DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(año, mes, cuenta)
);

-- Crear índice por año
CREATE INDEX IF NOT EXISTS idx_presupuestos_año ON presupuestos(año);

-- Crear índice por cuenta
CREATE INDEX IF NOT EXISTS idx_presupuestos_cuenta ON presupuestos(cuenta);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_presupuestos_updated_at ON presupuestos;
CREATE TRIGGER update_presupuestos_updated_at
    BEFORE UPDATE ON presupuestos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden hacer todo" ON presupuestos
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Comentarios
COMMENT ON TABLE presupuestos IS 'Presupuesto mensual por cuenta contable (3 dígitos)';
COMMENT ON COLUMN presupuestos.año IS 'Año del presupuesto';
COMMENT ON COLUMN presupuestos.mes IS 'Mes (1-12)';
COMMENT ON COLUMN presupuestos.cuenta IS 'Código de cuenta a 3 dígitos (ej: 700, 621)';
COMMENT ON COLUMN presupuestos.importe IS 'Importe presupuestado para el mes';
