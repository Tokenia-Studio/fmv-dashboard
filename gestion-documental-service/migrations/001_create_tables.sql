-- ============================================
-- GESTIÓN DOCUMENTAL - Migración 001
-- Crear tablas: doc_batches, doc_documents, doc_processing_log
-- Ejecutar en Supabase SQL Editor
-- Fecha: 24/02/2026
-- ============================================

-- ============================================
-- 1. TABLA: doc_batches (lotes escaneados)
-- ============================================
CREATE TABLE IF NOT EXISTS doc_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fichero_origen TEXT NOT NULL,
    fecha_procesamiento TIMESTAMPTZ DEFAULT NOW(),
    total_paginas INTEGER DEFAULT 0,
    total_documentos INTEGER DEFAULT 0,
    estado TEXT CHECK(estado IN ('procesando','pendiente_revision','archivado'))
        DEFAULT 'procesando',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doc_batches IS 'Lotes de documentos escaneados procesados por el servicio de gestión documental';
COMMENT ON COLUMN doc_batches.fichero_origen IS 'Nombre del PDF original escaneado';
COMMENT ON COLUMN doc_batches.estado IS 'procesando → pendiente_revision → archivado';

-- ============================================
-- 2. TABLA: doc_documents (documentos individuales)
-- ============================================
CREATE TABLE IF NOT EXISTS doc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES doc_batches(id) ON DELETE CASCADE,
    tipo TEXT CHECK(tipo IN ('factura','albaran','desconocido')),
    proveedor_nombre TEXT,
    proveedor_codigo TEXT,
    numero_factura TEXT,
    numero_albaran TEXT,
    numero_pedido TEXT,
    fecha_documento DATE,
    paginas JSONB DEFAULT '[]'::jsonb,
    confianza REAL DEFAULT 0.0,
    estado TEXT CHECK(estado IN ('ok','revisar','corregido','archivado'))
        DEFAULT 'ok',
    ruta_destino TEXT,
    fichero_nombre TEXT,
    factura_asociada_id UUID REFERENCES doc_documents(id),
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doc_documents IS 'Documentos individuales extraídos de un lote (facturas, albaranes)';
COMMENT ON COLUMN doc_documents.confianza IS 'Score de confianza del OCR (0.0 a 1.0)';
COMMENT ON COLUMN doc_documents.factura_asociada_id IS 'Para albaranes: ID de la factura a la que está asociado';

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_doc_documents_batch_id ON doc_documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_doc_documents_estado ON doc_documents(estado);
CREATE INDEX IF NOT EXISTS idx_doc_documents_tipo ON doc_documents(tipo);
CREATE INDEX IF NOT EXISTS idx_doc_documents_proveedor ON doc_documents(proveedor_codigo);

-- ============================================
-- 3. TABLA: doc_processing_log
-- ============================================
CREATE TABLE IF NOT EXISTS doc_processing_log (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID REFERENCES doc_batches(id) ON DELETE CASCADE,
    nivel TEXT CHECK(nivel IN ('info','warn','error')),
    mensaje TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE doc_processing_log IS 'Log de procesamiento del servicio de gestión documental';

CREATE INDEX IF NOT EXISTS idx_doc_processing_log_batch ON doc_processing_log(batch_id);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en las 3 tablas
ALTER TABLE doc_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_processing_log ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados tienen acceso completo
-- (El servicio Python usa service_key que bypasea RLS)
CREATE POLICY "authenticated_full_access_batches" ON doc_batches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_full_access_documents" ON doc_documents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_full_access_log" ON doc_processing_log
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================

-- Comprobar que las tablas se crearon correctamente
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('doc_batches', 'doc_documents', 'doc_processing_log')
ORDER BY table_name, ordinal_position;
