const postgres = require('postgres');

const sql = postgres({
  host: '2a05:d01c:30c:9d08:9a0a:7903:ec6a:bbae',
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: 'HQqwbrDr2nWfJS3F',
  ssl: 'require',
});

async function run() {
  console.log('Conectando a Supabase PostgreSQL...');

  // Test connection
  const test = await sql`SELECT current_database() as db, current_user as usr`;
  console.log('Conectado:', test[0].db, 'como', test[0].usr);

  // =============================================
  // 1. TABLA: doc_batches
  // =============================================
  console.log('\n1. Creando doc_batches...');
  await sql`
    CREATE TABLE IF NOT EXISTS doc_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fichero_origen TEXT NOT NULL,
      fecha_procesamiento TIMESTAMPTZ DEFAULT NOW(),
      total_paginas INTEGER DEFAULT 0,
      total_documentos INTEGER DEFAULT 0,
      estado TEXT CHECK(estado IN ('procesando','pendiente_revision','archivado'))
        DEFAULT 'procesando',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('   doc_batches OK');

  // =============================================
  // 2. TABLA: doc_documents
  // =============================================
  console.log('2. Creando doc_documents...');
  await sql`
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
    )
  `;
  console.log('   doc_documents OK');

  // Índices
  console.log('3. Creando índices...');
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_documents_batch_id ON doc_documents(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_documents_estado ON doc_documents(estado)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_documents_tipo ON doc_documents(tipo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_documents_proveedor ON doc_documents(proveedor_codigo)`;
  console.log('   Índices OK');

  // =============================================
  // 3. TABLA: doc_processing_log
  // =============================================
  console.log('4. Creando doc_processing_log...');
  await sql`
    CREATE TABLE IF NOT EXISTS doc_processing_log (
      id BIGSERIAL PRIMARY KEY,
      batch_id UUID REFERENCES doc_batches(id) ON DELETE CASCADE,
      nivel TEXT CHECK(nivel IN ('info','warn','error')),
      mensaje TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_doc_processing_log_batch ON doc_processing_log(batch_id)`;
  console.log('   doc_processing_log OK');

  // =============================================
  // 4. RLS
  // =============================================
  console.log('5. Habilitando RLS...');
  await sql`ALTER TABLE doc_batches ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE doc_documents ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE doc_processing_log ENABLE ROW LEVEL SECURITY`;

  // Políticas (DROP IF EXISTS + CREATE para idempotencia)
  const tables = ['doc_batches', 'doc_documents', 'doc_processing_log'];
  for (const table of tables) {
    await sql`
      DO $$ BEGIN
        DROP POLICY IF EXISTS "authenticated_full_access" ON ${sql(table)};
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$
    `;
    await sql.unsafe(`
      CREATE POLICY "authenticated_full_access" ON ${table}
        FOR ALL TO authenticated USING (true) WITH CHECK (true)
    `);
  }
  console.log('   RLS OK');

  // =============================================
  // 5. Storage bucket
  // =============================================
  console.log('6. Creando bucket doc-previews...');
  await sql`
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'doc-previews',
      'doc-previews',
      true,
      5242880,
      ARRAY['image/png', 'image/jpeg']::text[]
    )
    ON CONFLICT (id) DO NOTHING
  `;
  console.log('   Bucket OK');

  // Storage policies
  console.log('7. Políticas de storage...');
  await sql.unsafe(`
    DO $$ BEGIN
      DROP POLICY IF EXISTS "public_read_previews" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `);
  await sql.unsafe(`
    CREATE POLICY "public_read_previews" ON storage.objects
      FOR SELECT TO public USING (bucket_id = 'doc-previews')
  `);

  await sql.unsafe(`
    DO $$ BEGIN
      DROP POLICY IF EXISTS "service_insert_previews" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `);
  await sql.unsafe(`
    CREATE POLICY "service_insert_previews" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'doc-previews')
  `);

  await sql.unsafe(`
    DO $$ BEGIN
      DROP POLICY IF EXISTS "service_delete_previews" ON storage.objects;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$
  `);
  await sql.unsafe(`
    CREATE POLICY "service_delete_previews" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'doc-previews')
  `);
  console.log('   Storage policies OK');

  // =============================================
  // 6. Verificación
  // =============================================
  console.log('\n=== VERIFICACIÓN ===');
  const tables_check = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'doc_%'
    ORDER BY table_name
  `;
  console.log('Tablas creadas:', tables_check.map(t => t.table_name).join(', '));

  const bucket_check = await sql`
    SELECT id, public FROM storage.buckets WHERE id = 'doc-previews'
  `;
  console.log('Bucket:', bucket_check.length > 0 ? 'doc-previews (público)' : 'NO CREADO');

  await sql.end();
  console.log('\n=== MIGRACIÓN COMPLETADA ===');
}

run().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
