# Arquitectura — Gestión Documental FMV

**Cliente:** FMV
**Proyecto:** Gestión Documental — Automatización de facturas de compra
**Fecha:** 23/02/2026
**Fase:** 04_Arquitectura
**Base:** [01_Discovery.md](./01_Discovery.md) | [02_Product.md](./02_Product.md)

---

## 1. Visión general

La gestión documental se integra como **una pestaña más dentro de la sección Finanzas** del FMV Dashboard existente. El frontend vive en Vercel (React), los datos de estado en Supabase, y el servicio de procesamiento (Python) corre en el servidor de FMV donde están los ficheros.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FMV DASHBOARD (Vercel)                          │
│  React + Vite + Tailwind                                           │
│                                                                     │
│  Sidebar: Finanzas                                                  │
│    ├─ PyG                                                           │
│    ├─ Servicios Ext.                                                │
│    ├─ Financiación                                                  │
│    ├─ Proveedores                                                   │
│    ├─ Cash Flow                                                     │
│    ├─ Presupuesto                                                   │
│    ├─ Cuentas Anuales                                               │
│    └─ 📄 Gestión Documental  ← NUEVO                               │
│                                                                     │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTPS
               ▼
┌──────────────────────────┐     ┌────────────────────────────────────┐
│   SUPABASE               │     │   SERVIDOR FMV                     │
│                          │     │                                    │
│  ├─ Auth (JWT)           │     │  ┌──────────────────────────────┐  │
│  ├─ PostgreSQL           │     │  │  SERVICIO PYTHON (FastAPI)   │  │
│  │  ├─ proveedores  ◄────┼─────┼──│  Watchdog → Pipeline         │  │
│  │  ├─ doc_batches  NEW  │     │  │        │                     │  │
│  │  └─ doc_documents NEW │     │  │        ▼                     │  │
│  └─ Storage              │     │  │  OpenAI GPT-4o mini          │  │
│     └─ previews/ NEW     │     │  └──────────────────────────────┘  │
│                          │     │                                    │
└──────────────────────────┘     │  \\entrada\    \\salida\[AÑO]\     │
                                 └────────────────────────────────────┘
```

### Decisiones clave

| Decisión | Justificación |
|----------|---------------|
| **Frontend en Vercel** (dashboard existente) | No crear app separada — Erika ya usa el dashboard |
| **Estado en Supabase** (no SQLite) | Coherencia con el resto del dashboard, accesible desde Vercel |
| **Previews en Supabase Storage** | Para que el frontend pueda mostrar imágenes de los documentos |
| **Servicio Python en servidor FMV** | Necesita acceso directo a carpetas de red para leer/mover PDFs |
| **Maestro proveedores desde Supabase** | Ya existe la tabla `proveedores` con código y nombre |
| **Sincronización Python → Supabase** | El servicio Python escribe en Supabase tras procesar cada lote |

---

## 2. Integración en el Dashboard existente

### 2.1 Nueva tab en constants.js

```javascript
// En TABS, añadir:
{ id: 'gestionDocumental', label: 'Gest. Documental', icon: '📄' }

// En NAVIGATION_SECTIONS.finanzas.tabs, añadir:
'gestionDocumental'

// En TABS_POR_ROL.direccion, añadir:
'gestionDocumental'
```

### 2.2 Nuevo case en App.jsx

```javascript
case 'gestionDocumental': return <GestionDocumentalTab />
```

### 2.3 Nuevos componentes React

```
src/components/GestionDocumental/
├── GestionDocumentalTab.jsx      ← Contenedor principal (KPIs + lista lotes)
├── BatchList.jsx                 ← Tabla de lotes procesados
├── BatchReview.jsx               ← Pantalla de revisión de un lote
├── DocumentTable.jsx             ← Tabla de documentos del lote
├── DocumentPreview.jsx           ← Vista previa imagen + datos extraídos
└── EditForm.jsx                  ← Formulario edición de datos extraídos
```

### 2.4 Estado: contexto independiente

Para no sobrecargar el `DataContext` existente, la gestión documental usa su propio contexto:

```javascript
// src/context/GestionDocumentalContext.jsx
const GestionDocumentalContext = createContext()

const initialState = {
  batches: [],
  currentBatch: null,
  documents: [],
  stats: { procesados: 0, pendientes: 0, tasa_acierto: 0 },
  loading: false
}

export function GestionDocumentalProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  // ...
}

export function useGestionDocumental() {
  return useContext(GestionDocumentalContext)
}
```

---

## 3. Base de datos (Supabase — nuevas tablas)

Se añaden 3 tablas a la base de datos PostgreSQL existente en Supabase:

```sql
-- Lotes escaneados
CREATE TABLE doc_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fichero_origen TEXT NOT NULL,
    fecha_procesamiento TIMESTAMPTZ DEFAULT NOW(),
    total_paginas INTEGER,
    total_documentos INTEGER,
    estado TEXT CHECK(estado IN ('procesando','pendiente_revision','archivado'))
        DEFAULT 'procesando',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos individuales extraídos
CREATE TABLE doc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES doc_batches(id) ON DELETE CASCADE,
    tipo TEXT CHECK(tipo IN ('factura','albaran','desconocido')),
    proveedor_nombre TEXT,              -- Nombre extraído por OCR
    proveedor_codigo TEXT,              -- Código del maestro (lookup)
    numero_factura TEXT,
    numero_albaran TEXT,
    numero_pedido TEXT,
    fecha_documento DATE,
    paginas JSONB,                      -- [1, 2, 3]
    confianza REAL,
    estado TEXT CHECK(estado IN ('ok','revisar','corregido','archivado'))
        DEFAULT 'ok',
    ruta_destino TEXT,
    fichero_nombre TEXT,
    factura_asociada_id UUID REFERENCES doc_documents(id),
    preview_url TEXT,                   -- URL en Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de procesamiento
CREATE TABLE doc_processing_log (
    id BIGSERIAL PRIMARY KEY,
    batch_id UUID REFERENCES doc_batches(id) ON DELETE CASCADE,
    nivel TEXT CHECK(nivel IN ('info','warn','error')),
    mensaje TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: solo rol 'direccion' puede ver/editar
ALTER TABLE doc_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "direccion_full_access" ON doc_batches
    FOR ALL USING (true);  -- Ajustar con auth.uid() si se necesita
CREATE POLICY "direccion_full_access" ON doc_documents
    FOR ALL USING (true);
CREATE POLICY "direccion_full_access" ON doc_processing_log
    FOR ALL USING (true);
```

### Supabase Storage — nuevo bucket

```
previews/                        ← Imágenes de vista previa
  └── {batch_id}/
      ├── page_001.png
      ├── page_002.png
      └── ...
```

---

## 4. Servicio Python (servidor FMV)

### 4.1 Responsabilidades

El servicio Python es el **motor de procesamiento**. Corre en el servidor donde están los ficheros y:

1. Vigila la carpeta de entrada
2. Procesa los PDFs (split, OCR, clasificación, merge)
3. Mueve los ficheros a la carpeta de salida
4. Escribe los resultados en Supabase
5. Sube las previews a Supabase Storage
6. Expone un endpoint `/health` para monitorización

### 4.2 Pipeline de procesamiento

```
process(pdf_path)
    │
    ├─ 1. split_pages(pdf_path) → [page_1.png, page_2.png, ...]
    │      PyMuPDF: separa PDF en imágenes PNG (300 DPI)
    │
    ├─ 2. upload_previews(pages, batch_id) → sube PNGs a Supabase Storage
    │
    ├─ 3. analyze_pages(pages) → [PageResult, ...]
    │      GPT-4o mini (visión) × N páginas en paralelo (async)
    │      Retorna: {tipo, proveedor, nº_factura, fecha, es_continuacion, confianza}
    │
    ├─ 4. group_documents(page_results) → [Document, ...]
    │      Agrupa páginas consecutivas del mismo documento
    │
    ├─ 5. associate_delivery_notes(documents) → [Document, ...]
    │      Asocia albaranes con su factura (mismo proveedor + nº factura/pedido)
    │
    ├─ 6. merge_pdfs(documents) → genera PDFs unificados (factura + albaranes)
    │
    ├─ 7. lookup_supplier(documents) → consulta tabla proveedores de Supabase
    │      Fuzzy match nombre OCR → nombre maestro → código proveedor
    │
    ├─ 8. rename_and_move(documents) → archiva en carpeta destino del servidor
    │      Confianza ≥ 0.80 → \\salida\[AÑO]\[proveedor]\
    │      Confianza < 0.80 → \\pendientes_revision\
    │
    └─ 9. save_to_supabase(batch, documents) → persiste en PostgreSQL
```

### 4.3 Módulo de IA (OpenAI Vision)

| Aspecto | Detalle |
|---------|---------|
| **Modelo** | `gpt-4o-mini` (visión) |
| **Fallback** | `gpt-4o` si confianza < 0.80 |
| **Input** | Imagen PNG de la página (300 DPI) |
| **Output** | JSON estructurado |
| **Concurrencia** | Hasta 5 llamadas en paralelo (`asyncio`) |
| **Retry** | 3 intentos con backoff exponencial |
| **Timeout** | 30s por página |

#### Prompt del sistema

```
Eres un asistente de clasificación de documentos contables.
Analiza esta imagen de un documento escaneado y extrae la siguiente información.

Responde SOLO con JSON válido, sin explicaciones:

{
  "tipo": "factura" | "albaran" | "desconocido",
  "proveedor": "nombre del proveedor o null",
  "numero_factura": "número de factura o null",
  "numero_albaran": "número de albarán o null",
  "numero_pedido": "número de pedido o null",
  "fecha": "YYYY-MM-DD o null",
  "es_continuacion_anterior": true | false,
  "confianza": 0.0 a 1.0
}

Reglas:
- es_continuacion_anterior = true si esta página es la continuación
  del mismo documento que la página anterior (misma factura/albarán)
- Si no puedes identificar un campo con certeza, pon null
- confianza refleja tu certeza general sobre la extracción
```

### 4.4 Maestro de proveedores

| Aspecto | Detalle |
|---------|---------|
| **Fuente** | Tabla `proveedores` en Supabase (ya existe) |
| **Campos** | `codigo` (nº proveedor), `nombre` |
| **Matching** | Fuzzy match con `thefuzz` (nombre OCR → nombre maestro) |
| **Umbral** | Score ≥ 80 → match automático. < 80 → flag revisión |
| **Cache** | Se carga al arrancar el servicio, se refresca cada hora |

```python
# Pseudocódigo
async def lookup_supplier(ocr_name: str) -> tuple[str | None, float]:
    maestro = await supabase.table('proveedores').select('codigo, nombre').execute()
    best_match, score = process.extractOne(ocr_name, [p['nombre'] for p in maestro.data])
    if score >= 80:
        supplier = next(p for p in maestro.data if p['nombre'] == best_match)
        return supplier['codigo'], score / 100
    return None, score / 100
```

### 4.5 Estructura del código Python

```
gestion-documental-service/
├── main.py                     ← Entry point: arranca watcher + health endpoint
├── config.yaml                 ← Configuración (rutas, umbrales)
├── requirements.txt
├── .env                        ← OPENAI_API_KEY + SUPABASE_URL + SUPABASE_KEY
│
├── core/
│   ├── watcher.py              ← Watchdog: vigila carpeta entrada
│   ├── pipeline.py             ← Orquestador del flujo completo
│   ├── splitter.py             ← Split PDF en páginas PNG (PyMuPDF)
│   ├── analyzer.py             ← Llamadas a GPT-4o mini (visión)
│   ├── grouper.py              ← Agrupa páginas en documentos
│   ├── associator.py           ← Asocia albaranes ↔ facturas
│   ├── merger.py               ← Junta factura + albaranes en un PDF
│   ├── supplier_lookup.py      ← Fuzzy match contra maestro (Supabase)
│   └── archiver.py             ← Renombra y mueve a destino
│
├── infra/
│   └── supabase_client.py      ← Cliente Supabase (DB + Storage)
│
└── tests/
    ├── test_pipeline.py
    ├── test_analyzer.py
    ├── test_grouper.py
    └── sample_pdfs/            ← PDFs de prueba
```

---

## 5. Estructura de carpetas (servidor)

```
\\servidor\GestionDocumental\
├── entrada\                    ← Erika deja aquí los PDFs escaneados
├── procesando\                 ← PDFs en proceso (lock)
├── salida\                     ← Destino final
│   └── 2026\
│       ├── 10234 - REPSOL\
│       │   ├── 10234 - FR-2026-0847.pdf    (factura + albaranes unidos)
│       │   └── 10234 - FR-2026-0848.pdf
│       ├── 10567 - VAL PINTO\
│       │   └── 10567 - VP-1234.pdf
│       └── ...
├── pendientes_revision\        ← Documentos con baja confianza
├── procesados\                 ← Backup de PDFs originales ya procesados
└── errores\                    ← PDFs corruptos o fallidos
```

---

## 6. Comunicación entre componentes

```
┌───────────────────┐    lee/escribe    ┌────────────────────┐
│  Frontend React   │◄────────────────►│  Supabase          │
│  (Vercel)         │    (supabase-js)  │  PostgreSQL        │
│                   │                   │  + Storage         │
└───────────────────┘                   └────────┬───────────┘
                                                 │
                                        escribe  │  lee maestro
                                                 │
                                        ┌────────▼───────────┐
                                        │  Servicio Python   │
                                        │  (Servidor FMV)    │
                                        └────────────────────┘
                                                 │
                                        lee/mueve│
                                                 │
                                        ┌────────▼───────────┐
                                        │  Carpetas de red   │
                                        │  (\\servidor\...)   │
                                        └────────────────────┘
```

**Flujo de datos:**

1. **Python → Supabase**: Escribe lotes y documentos tras procesar
2. **Python → Supabase Storage**: Sube previews de páginas
3. **React → Supabase**: Lee lotes, documentos, previews para la UI
4. **React → Supabase**: Escribe correcciones de Erika (PATCH documento)
5. **Python ← Supabase**: Lee maestro de proveedores para fuzzy match
6. **Python → Carpetas**: Lee PDFs de entrada, mueve a salida/pendientes

### Endpoint de confirmación (caso especial)

Cuando Erika confirma un lote desde el dashboard, el frontend necesita que el servicio Python mueva los ficheros pendientes a su destino final. Opciones:

| Opción | Mecanismo |
|--------|-----------|
| **A. Polling** | Python revisa cada 30s si hay lotes con estado `archivado` y mueve ficheros pendientes |
| **B. Supabase Realtime** | Python escucha cambios en `doc_batches` vía websocket |
| **C. Webhook** | Frontend llama a un endpoint del servicio Python directamente |

**Recomendación: Opción A (polling)** — la más simple. Python ya corre un loop, solo añade un check periódico. No requiere exponer el servicio Python a internet.

---

## 7. Configuración

```yaml
# config.yaml (servicio Python en servidor FMV)
paths:
  entrada: "\\\\servidor\\GestionDocumental\\entrada"
  procesando: "\\\\servidor\\GestionDocumental\\procesando"
  salida: "\\\\servidor\\GestionDocumental\\salida"
  pendientes: "\\\\servidor\\GestionDocumental\\pendientes_revision"
  procesados: "\\\\servidor\\GestionDocumental\\procesados"
  errores: "\\\\servidor\\GestionDocumental\\errores"

openai:
  model: "gpt-4o-mini"
  fallback_model: "gpt-4o"
  max_concurrent: 5
  timeout: 30
  max_retries: 3

processing:
  confidence_threshold: 0.80
  supplier_match_threshold: 80
  dpi: 300
  wait_stability_seconds: 5
  archive_poll_interval: 30          # Segundos entre checks de archivado
```

```env
# .env (servicio Python)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://ryjavkyudanppnobbhkr.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          # Service role key (no anon)
```

---

## 8. Dependencias

### Python (servicio en servidor)

```
# requirements.txt
pymupdf>=1.24               # Split PDF + merge
openai>=1.30                 # API OpenAI (visión)
supabase>=2.4                # Cliente Supabase (DB + Storage)
thefuzz>=0.22                # Fuzzy matching proveedores
python-Levenshtein>=0.25     # Acelerador para thefuzz
watchdog>=4.0                # Vigilar carpeta
pydantic>=2.7                # Validación de datos
pyyaml>=6.0                  # Config
Pillow>=10.3                 # Procesamiento de imágenes
python-dotenv>=1.0           # Cargar .env
```

### React (nuevos componentes en dashboard existente)

Sin dependencias nuevas — usa `@supabase/supabase-js` que ya está instalado.

---

## 9. Supabase helpers (nuevo módulo en lib/supabase.js)

```javascript
// Añadir a lib/supabase.js

export const documental = {
  // Lotes
  getBatches: () =>
    supabase.from('doc_batches').select('*').order('created_at', { ascending: false }),

  getBatch: (id) =>
    supabase.from('doc_batches').select('*, doc_documents(*)').eq('id', id).single(),

  updateBatchStatus: (id, estado) =>
    supabase.from('doc_batches').update({ estado }).eq('id', id),

  // Documentos
  updateDocument: (id, data) =>
    supabase.from('doc_documents').update(data).eq('id', id),

  // Confirmar y archivar
  archiveBatch: async (id) => {
    // Marca documentos como archivados
    await supabase.from('doc_documents')
      .update({ estado: 'archivado' })
      .eq('batch_id', id)
      .in('estado', ['ok', 'corregido'])
    // Marca lote como archivado (Python moverá los ficheros)
    return supabase.from('doc_batches').update({ estado: 'archivado' }).eq('id', id)
  },

  // Previews
  getPreviewUrl: (batchId, page) =>
    supabase.storage.from('previews').getPublicUrl(`${batchId}/page_${String(page).padStart(3, '0')}.png`),

  // Stats
  getStats: async () => {
    const { data } = await supabase.from('doc_batches').select('estado')
    return {
      procesados: data.filter(b => b.estado === 'archivado').length,
      pendientes: data.filter(b => b.estado === 'pendiente_revision').length,
      total: data.length
    }
  }
}
```

---

## 10. Despliegue

### Servicio Python (servidor FMV)

| Aspecto | Detalle |
|---------|---------|
| **Entorno** | Servidor Windows de FMV |
| **Instalación** | Python 3.11+ con venv |
| **Ejecución** | Servicio Windows (`nssm`) |
| **Arranque** | Automático con el servidor |
| **Logs** | Fichero rotativo + tabla `doc_processing_log` en Supabase |
| **Monitorización** | Stats visibles en el dashboard |

```bash
# Instalación (una vez)
cd \\servidor\GestionDocumental\service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Configurar .env con API keys

# Instalar como servicio Windows
nssm install GestionDocumental "\\servidor\GestionDocumental\service\venv\Scripts\python.exe" main.py
nssm start GestionDocumental
```

### Frontend (Vercel — ya desplegado)

Solo requiere push de los nuevos componentes al repo. Vercel redeploy automático.

---

## 11. Seguridad

| Riesgo | Mitigación |
|--------|-----------|
| API keys expuestas | `.env` en servidor, variables de entorno en Vercel |
| Acceso a datos documentales | RLS en Supabase + Auth existente |
| Servicio Python expuesto | No expuesto a internet — solo escribe en Supabase |
| PDFs maliciosos | Validar que es PDF real antes de procesar |
| Sobreescritura de ficheros | Sufijo `_2`, `_3` si ya existe |
| Pérdida de datos | Original conservado en `\procesados\` |

---

## 12. Plan de implementación

| Fase | Entregable | Dónde |
|------|-----------|-------|
| **F1** | Tablas Supabase + Storage bucket | Supabase |
| **F2** | Servicio Python: splitter + analyzer + grouper | Servidor FMV |
| **F3** | Servicio Python: associator + merger + supplier lookup | Servidor FMV |
| **F4** | Servicio Python: archiver + watcher + sync Supabase | Servidor FMV |
| **F5** | Frontend: tab + componentes revisión de lote | Dashboard React |
| **F6** | Testing con PDFs reales de Erika | End-to-end |
| **F7** | Despliegue servicio en servidor FMV | Producción |

---

## 13. Siguiente paso

→ **Fase 05_Desarrollo**: Empezar por F1 (tablas Supabase) + F2 (core Python).

---

*Generado por TOKENIA Studio — 23/02/2026*
