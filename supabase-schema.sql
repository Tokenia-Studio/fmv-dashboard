-- ============================================
-- FMV DASHBOARD - Schema de Base de Datos
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. TABLA DE MOVIMIENTOS CONTABLES
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  cuenta VARCHAR(20) NOT NULL,
  grupo VARCHAR(2) NOT NULL,
  subcuenta VARCHAR(3) NOT NULL,
  debe DECIMAL(15,2) DEFAULT 0,
  haber DECIMAL(15,2) DEFAULT 0,
  neto DECIMAL(15,2) DEFAULT 0,
  cod_procedencia VARCHAR(50),
  descripcion TEXT,
  documento VARCHAR(100),
  mes VARCHAR(7) NOT NULL, -- formato: YYYY-MM
  año INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_año ON movimientos(año);
CREATE INDEX IF NOT EXISTS idx_movimientos_mes ON movimientos(mes);
CREATE INDEX IF NOT EXISTS idx_movimientos_cuenta ON movimientos(cuenta);
CREATE INDEX IF NOT EXISTS idx_movimientos_grupo ON movimientos(grupo);

-- 2. TABLA DE PROVEEDORES
-- ============================================
CREATE TABLE IF NOT EXISTS proveedores (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_codigo ON proveedores(codigo);

-- 3. TABLA DE ARCHIVOS CARGADOS
-- ============================================
CREATE TABLE IF NOT EXISTS archivos_cargados (
  id BIGSERIAL PRIMARY KEY,
  año INTEGER UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  movimientos INTEGER DEFAULT 0,
  total_debe DECIMAL(15,2) DEFAULT 0,
  total_haber DECIMAL(15,2) DEFAULT 0,
  fecha_carga TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE CONFIGURACION
-- ============================================
CREATE TABLE IF NOT EXISTS configuracion (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE DATOS MANUALES (para indicadores)
-- ============================================
CREATE TABLE IF NOT EXISTS datos_manuales (
  id BIGSERIAL PRIMARY KEY,
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL, -- 1-12
  trabajadores INTEGER,
  horas_trabajadas DECIMAL(10,2),
  dias_laborables INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(año, mes)
);

CREATE INDEX IF NOT EXISTS idx_datos_manuales_año ON datos_manuales(año);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos_cargados ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_manuales ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITICAS PARA MOVIMIENTOS
-- ============================================
CREATE POLICY "movimientos_select" ON movimientos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "movimientos_insert" ON movimientos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "movimientos_update" ON movimientos
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "movimientos_delete" ON movimientos
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLITICAS PARA PROVEEDORES
-- ============================================
CREATE POLICY "proveedores_select" ON proveedores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "proveedores_insert" ON proveedores
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "proveedores_update" ON proveedores
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "proveedores_delete" ON proveedores
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLITICAS PARA ARCHIVOS_CARGADOS
-- ============================================
CREATE POLICY "archivos_select" ON archivos_cargados
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "archivos_insert" ON archivos_cargados
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "archivos_update" ON archivos_cargados
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "archivos_delete" ON archivos_cargados
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLITICAS PARA CONFIGURACION
-- ============================================
CREATE POLICY "config_select" ON configuracion
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_insert" ON configuracion
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "config_update" ON configuracion
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "config_delete" ON configuracion
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- POLITICAS PARA DATOS_MANUALES
-- ============================================
CREATE POLICY "datos_select" ON datos_manuales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "datos_insert" ON datos_manuales
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "datos_update" ON datos_manuales
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "datos_delete" ON datos_manuales
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- STORAGE BUCKET
-- ============================================
-- Crear manualmente en Storage > New Bucket:
-- Nombre: excels
-- Public: No
-- File size limit: 50MB

-- Politicas de storage (ejecutar despues de crear el bucket)
/*
CREATE POLICY "excels_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'excels');
CREATE POLICY "excels_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'excels');
CREATE POLICY "excels_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'excels');
CREATE POLICY "excels_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'excels');
*/
