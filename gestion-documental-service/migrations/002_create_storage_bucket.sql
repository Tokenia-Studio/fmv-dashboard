-- ============================================
-- GESTIÓN DOCUMENTAL - Migración 002
-- Crear bucket de Storage para previews
-- Ejecutar en Supabase SQL Editor
-- Fecha: 24/02/2026
-- ============================================

-- Crear bucket público para las previews de documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'doc-previews',
    'doc-previews',
    true,
    5242880,  -- 5MB por imagen
    ARRAY['image/png', 'image/jpeg']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquier usuario autenticado puede leer
CREATE POLICY "public_read_previews" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'doc-previews');

-- Política: solo service_role puede insertar (Python service)
-- (service_key bypasea RLS, pero por seguridad añadimos política explícita)
CREATE POLICY "service_insert_previews" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'doc-previews');

-- Política: service_role puede eliminar
CREATE POLICY "service_delete_previews" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'doc-previews');
