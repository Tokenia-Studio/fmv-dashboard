# Producto — Gestión Documental FMV

**Cliente:** FMV
**Proyecto:** Gestión Documental — Automatización de facturas de compra
**Fecha:** 23/02/2026
**Fase:** 02_Product
**Base:** [01_Discovery.md](./01_Discovery.md)

---

## 1. Visión del producto

**Una herramienta que permite a Erika escanear un lote completo de facturas y albaranes mezclados, y obtener automáticamente cada documento separado, clasificado, renombrado y archivado en la carpeta correcta del servidor.**

De ~15 minutos por lote (escanear + separar + renombrar + archivar) a ~2 minutos (escanear + revisar resultado).

---

## 2. Usuarios

| Usuario | Rol | Interacción |
|---------|-----|-------------|
| **Erika** | Contable | Usuario principal — escanea, revisa, corrige, adjunta en BC |
| **Raúl / Sachi** | Almacén | Destinatarios de incidencias (albaranes faltantes) |
| **Carlos** | Dirección financiera | Visibilidad del estado de documentación |

---

## 3. User Stories

### Epic 1: Procesamiento automático de lotes

| ID | User Story | Prioridad | Criterios de aceptación |
|----|-----------|-----------|------------------------|
| **US-01** | Como Erika, quiero dejar un PDF escaneado en una carpeta del servidor y que el sistema lo procese automáticamente, para no tener que hacer nada más que escanear. | Must | - El sistema detecta PDFs nuevos en la carpeta de entrada<br>- Inicia procesamiento en <30 segundos<br>- No requiere intervención manual para arrancar |
| **US-02** | Como Erika, quiero que el sistema separe un PDF de múltiples páginas en documentos individuales, para no tener que usar NAPS2 manualmente. | Must | - Detecta correctamente dónde empieza/termina cada documento<br>- Genera un PDF por documento<br>- Funciona con facturas de 1-3 páginas y albaranes de 1 página mezclados |
| **US-03** | Como Erika, quiero que el sistema identifique si cada documento es una factura o un albarán, para que se clasifiquen correctamente. | Must | - Clasifica con >95% de acierto<br>- Los tipos son: factura, albarán, otro/desconocido |
| **US-04** | Como Erika, quiero que el sistema extraiga automáticamente el nombre del proveedor, nº de factura y fecha de cada documento, para no tener que leerlos yo. | Must | - Extrae proveedor con >90% de acierto<br>- Extrae nº factura con >90% de acierto<br>- Extrae fecha con >95% de acierto |
| **US-05** | Como Erika, quiero que el sistema renombre cada PDF según la convención `[nº proveedor] - [nº factura].pdf`, para que estén listos para archivar. | Must | - Mapea nombre de proveedor → nº proveedor usando el maestro existente<br>- Aplica la convención de nombrado<br>- Si no puede mapear, usa el nombre tal cual + flag de revisión |
| **US-06** | Como Erika, quiero que el sistema asocie cada albarán con su factura correspondiente y los junte en un único PDF, para tener trazabilidad completa sin trabajo manual. | Must | - Detecta nº de factura/pedido en el albarán<br>- Asocia albarán → factura del mismo proveedor<br>- Genera un PDF unificado: factura + sus albaranes<br>- Si no puede asociar, lo deja suelto como `ALB - [nº albarán].pdf` + flag de revisión |

### Epic 2: Archivado automático

| ID | User Story | Prioridad | Criterios de aceptación |
|----|-----------|-----------|------------------------|
| **US-07** | Como Erika, quiero que los documentos procesados (factura + albaranes unidos) se muevan automáticamente a una subcarpeta del proveedor dentro de la carpeta de salida del servidor, para no tener que moverlos yo. | Must | - Crea subcarpeta `[nº proveedor] - [nombre proveedor]/` si no existe<br>- Mueve el PDF unificado (factura+albaranes) a la subcarpeta correcta<br>- Organiza por año |

### Epic 3: Revisión y corrección

| ID | User Story | Prioridad | Criterios de aceptación |
|----|-----------|-----------|------------------------|
| **US-08** | Como Erika, quiero ver un resumen del lote procesado antes de que se archive definitivamente, para poder corregir errores. | Should | - Muestra lista de documentos procesados con: tipo, proveedor, nº factura, destino<br>- Permite corregir cualquier campo antes de confirmar<br>- Botón "Confirmar y archivar" para mover todo |
| **US-09** | Como Erika, quiero que los documentos que el sistema no pueda clasificar se marquen para revisión manual, para que no se pierda nada. | Must | - Si confianza < umbral → marca como "Revisar"<br>- Los documentos "Revisar" no se archivan hasta que Erika los valide<br>- Se mueven a una subcarpeta `/pendientes_revision/` |
| **US-10** | Como Erika, quiero poder ver el documento original (imagen) junto a los datos extraídos, para verificar que es correcto. | Should | - Vista previa del PDF/imagen<br>- Datos extraídos al lado<br>- Editar y guardar |

### Epic 4: Dashboard y visibilidad

| ID | User Story | Prioridad | Criterios de aceptación |
|----|-----------|-----------|------------------------|
| **US-11** | Como Carlos, quiero ver un dashboard con el estado de la gestión documental, para saber si está al día. | Could | - Nº documentos procesados este mes<br>- Nº pendientes de revisión<br>- Tasa de acierto del OCR<br>- Últimos lotes procesados |

---

## 4. Flujo funcional detallado

### 4.1 Flujo principal (Happy Path)

```
Erika escanea lote (facturas + albaranes mezclados)
    │
    ▼
Deja el PDF en \\servidor\GestionDocumental\entrada\
    │
    ▼
[Sistema detecta nuevo fichero] ──→ Inicia procesamiento
    │
    ▼
Split: separa PDF en páginas individuales (PyMuPDF)
    │
    ▼
Por cada página ──→ GPT-4o mini (visión):
    │   {tipo, proveedor, nº_factura, fecha, es_continuacion_anterior}
    │
    ▼
Agrupa páginas del mismo documento
    │
    ▼
Genera PDFs individuales por documento
    │
    ▼
Asocia albaranes con su factura (mismo proveedor + nº factura/pedido)
    │
    ▼
Junta factura + albaranes en un único PDF
    │
    ▼
Lookup: nombre proveedor → nº proveedor (maestro)
    │
    ▼
Renombra: [nº proveedor] - [nº factura].pdf (contiene factura + albaranes)
    │
    ▼
¿Confianza OK (>umbral)?
    ├─ SÍ → Mueve a \\servidor\GestionDocumental\salida\[AÑO]\[proveedor]\
    └─ NO → Mueve a \\servidor\GestionDocumental\pendientes_revision\
    │
    ▼
Erika revisa resumen del lote (web)
    ├─ Corrige errores si los hay
    └─ Confirma → archivado definitivo
    │
    ▼
Erika adjunta manualmente en BC (fichero ya listo)
```

### 4.2 Flujo de error

| Escenario | Comportamiento |
|-----------|---------------|
| No se puede leer la página (calidad baja) | Marca como "Revisar" + alerta |
| Proveedor no encontrado en maestro | Usa nombre OCR como carpeta + flag "proveedor desconocido" |
| Nº factura no detectado | Nombra como `[nº proveedor] - SIN_NUMERO_[timestamp].pdf` + flag |
| API OpenAI no disponible | Reintenta 3 veces, luego mueve a `pendientes_revision` |
| PDF corrupto o no es documento | Mueve a `\\errores\` con log |

---

## 5. Modelo de datos

### 5.1 Lote (Batch)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único del lote |
| fichero_origen | string | Nombre del PDF original escaneado |
| fecha_procesamiento | datetime | Cuándo se procesó |
| total_paginas | int | Páginas del PDF original |
| total_documentos | int | Documentos detectados |
| estado | enum | `procesando`, `pendiente_revision`, `archivado` |

### 5.2 Documento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | Identificador único |
| lote_id | UUID | FK al lote |
| tipo | enum | `factura`, `albaran`, `desconocido` |
| proveedor_nombre | string | Nombre extraído por OCR |
| proveedor_id | string | Nº proveedor (del maestro) |
| nº_factura | string | Nº factura extraído |
| fecha_documento | date | Fecha extraída |
| paginas | int[] | Páginas del PDF original que lo componen |
| confianza | float | Score de confianza de la extracción (0-1) |
| estado | enum | `ok`, `revisar`, `corregido`, `archivado` |
| ruta_destino | string | Ruta final en el servidor |
| fichero_nombre | string | Nombre final del fichero |

---

## 6. Reglas de negocio

| # | Regla |
|---|-------|
| RN-01 | La convención de nombrado es `[nº proveedor] - [nº factura].pdf` |
| RN-02 | Si el proveedor no está en el maestro, se usa el nombre OCR y se marca para revisión |
| RN-03 | Los albaranes se juntan con su factura en un único PDF (factura primero, albaranes detrás) |
| RN-03b | Si un albarán no puede asociarse a ninguna factura, se archiva suelto como `ALB - [nº albarán].pdf` + flag de revisión |
| RN-04 | La carpeta de salida se organiza: `salida/[AÑO]/[nº proveedor] - [nombre]/` |
| RN-05 | Documentos con confianza < 0.80 van a `pendientes_revision/` |
| RN-06 | Un documento "desconocido" nunca se archiva automáticamente |
| RN-07 | El sistema no borra el PDF original hasta que todos sus documentos estén archivados |
| RN-08 | Los PDFs originales procesados se mueven a `\\procesados\` como backup |

---

## 7. Interfaces

### 7.1 Pantalla: Revisión de lote

```
┌─────────────────────────────────────────────────────────┐
│  Gestión Documental — Lote: scan_20260223_1430.pdf      │
│  Estado: Pendiente de revisión  │  12 documentos        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────┬──────────┬────────────┬────────────┬────────┐  │
│  │ #   │ Tipo     │ Proveedor  │ Nº Factura │ Estado │  │
│  ├─────┼──────────┼────────────┼────────────┼────────┤  │
│  │ 1   │ Factura  │ REPSOL     │ FR-2026-08 │  ✓ OK  │  │
│  │ 2   │ Albarán  │ REPSOL     │ ALB-44210  │  ✓ OK  │  │
│  │ 3   │ Factura  │ VAL PINTO  │ VP-1234    │  ✓ OK  │  │
│  │ 4   │ Factura  │ ???        │ no detect. │ ⚠ REV  │  │
│  │ ... │          │            │            │        │  │
│  └─────┴──────────┴────────────┴────────────┴────────┘  │
│                                                         │
│  [Vista previa]          [Datos extraídos]              │
│  ┌──────────────┐        Tipo: Factura [v]              │
│  │              │        Proveedor: [________] 🔍       │
│  │  (imagen     │        Nº Factura: [________]         │
│  │   del doc)   │        Fecha: [__/__/____]            │
│  │              │        Confianza: 34%                  │
│  └──────────────┘                                       │
│                                                         │
│         [ Guardar corrección ]                          │
│                                                         │
│  ────────────────────────────────────────────────────── │
│  [ Confirmar y archivar todo ✓ ]    [ Descartar lote ]  │
└─────────────────────────────────────────────────────────┘
```

### 7.2 Pantalla: Dashboard (Could)

```
┌─────────────────────────────────────────────────────────┐
│  Gestión Documental — Dashboard                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Febrero 2026                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │   142    │  │    3     │  │   96%    │  │  180   │  │
│  │Archivados│  │Pendientes│  │ Acierto  │  │  Total │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  Últimos lotes:                                         │
│  • scan_0223_1430.pdf — 12 docs — ✓ Archivado          │
│  • scan_0222_0900.pdf — 8 docs  — ⚠ 1 pendiente        │
│  • scan_0221_1100.pdf — 15 docs — ✓ Archivado          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Requisitos no funcionales

| # | Requisito | Valor |
|---|-----------|-------|
| NF-01 | Tiempo de procesamiento por página | < 5 segundos |
| NF-02 | Tiempo total lote típico (20 páginas) | < 2 minutos |
| NF-03 | Disponibilidad | Horario laboral (L-V 8-18h) |
| NF-04 | Tasa de acierto mínima aceptable | > 90% en extracción |
| NF-05 | Tasa de acierto objetivo | > 95% en extracción |
| NF-06 | Formato de entrada soportado | PDF (escaneado e imagen) |
| NF-07 | Coste operativo máximo | < $5/mes en API |

---

## 9. Fuera de alcance (v1)

- Adjuntado automático en Business Central
- Contabilización automática
- OCR de facturas de venta (solo compra)
- Integración con email (facturas que llegan por correo)
- App móvil

---

## 10. Siguiente paso

→ **Fase 03_Diseño**: Wireframes detallados de la pantalla de revisión de lote.
→ **Fase 04_Arquitectura**: Diseño técnico del backend Python + integración OpenAI.

---

*Generado por TOKENIA Studio — 23/02/2026*
