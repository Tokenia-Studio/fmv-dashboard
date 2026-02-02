-- ============================================
-- Tablas para Presupuesto Compras + Sistema Roles
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Tabla de roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'direccion',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON user_roles FOR SELECT USING (auth.uid() = user_id);

-- 2. Tabla albaranes y facturas
CREATE TABLE IF NOT EXISTS albaranes_facturas (
  id BIGSERIAL PRIMARY KEY,
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  fecha DATE,
  tipo_documento VARCHAR(50),
  no_documento VARCHAR(100),
  descripcion TEXT,
  importe DECIMAL(15,2),
  grupo_contable_prod VARCHAR(50),
  cuenta_mapeada VARCHAR(20),
  cod_proveedor VARCHAR(50),
  es_pendiente BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE albaranes_facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage albaranes" ON albaranes_facturas FOR ALL USING (auth.role() = 'authenticated');

-- 3. Tabla pedidos de compra
CREATE TABLE IF NOT EXISTS pedidos_compra (
  id BIGSERIAL PRIMARY KEY,
  año INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  no_documento VARCHAR(100),
  cod_proveedor VARCHAR(50),
  tipo VARCHAR(50),
  cuenta VARCHAR(20),
  descripcion TEXT,
  cantidad DECIMAL(15,2),
  cantidad_pendiente DECIMAL(15,2),
  importe DECIMAL(15,2),
  fecha_recepcion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pedidos_compra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage pedidos" ON pedidos_compra FOR ALL USING (auth.role() = 'authenticated');

-- 4. Tabla mapeo grupo contable -> cuenta
CREATE TABLE IF NOT EXISTS mapeo_grupo_cuenta (
  id BIGSERIAL PRIMARY KEY,
  grupo_contable VARCHAR(50) NOT NULL,
  cuenta VARCHAR(20),
  descripcion VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grupo_contable)
);

ALTER TABLE mapeo_grupo_cuenta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage mapeo" ON mapeo_grupo_cuenta FOR ALL USING (auth.role() = 'authenticated');

-- 5. Datos iniciales del mapeo
INSERT INTO mapeo_grupo_cuenta (grupo_contable, cuenta, descripcion) VALUES
  ('EMBALAJE', '602000000', 'Embalajes'),
  ('ENV. Y EMB', '602000000', 'Envases y embalajes'),
  ('FABRICA.', '601000000', 'Fabricacion'),
  ('ME', '600000000', 'Mercaderias'),
  ('MP', '601000000', 'Materias primas'),
  ('NO DEDUCIB', '629000000', 'No deducible'),
  ('O.SERVIC.', '629000000', 'Otros servicios'),
  ('PS', '600000000', 'Productos semiterminados'),
  ('PT', '600000000', 'Productos terminados'),
  ('SUB. Y RES', '602000001', 'Subproductos y residuos'),
  ('SUBCONTRA', '607000001', 'Subcontratacion'),
  ('TRANS_LD', '624000001', 'Transporte larga distancia'),
  ('TRANSPORTE', '624000000', 'Transportes'),
  ('UN', '600000001', 'Unidades'),
  ('ACTV. FIJO', '', 'Activo fijo - ignorar'),
  ('ALQUILER', '', 'Pendiente de configurar'),
  ('APROVISION', '', 'Pendiente de configurar'),
  ('ARRENDAMIE', '', 'Pendiente de configurar'),
  ('SUMINISTRO', '', 'Pendiente de configurar'),
  ('UTILLAJE', '', 'Pendiente de configurar')
ON CONFLICT (grupo_contable) DO NOTHING;

-- 6. Asignar rol de ejemplo (cambiar user_id por el real)
-- INSERT INTO user_roles (user_id, role) VALUES ('uuid-del-usuario', 'compras');
