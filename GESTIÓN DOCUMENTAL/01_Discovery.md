# Discovery — Gestión Documental FMV

**Cliente:** FMV
**Proyecto:** Gestión Documental — Automatización de facturas de compra
**Fecha:** 23/02/2026
**Fuente:** Reunión con Erika (Contable FMV)
**Fase:** 01_Discovery

---

## 1. Contexto

Erika, contable de FMV, gestiona todas las facturas de compra de la empresa. El proceso actual es intensivamente manual: escaneo, renombrado, archivado en carpeta de red y adjuntado uno a uno en Business Central (BC). Esto consume una parte significativa de su jornada y es propenso a errores.

---

## 2. Proceso actual (AS-IS)

```
Factura llega (papel/PDF)
    │
    ▼
Imprime factura ──→ Puntea albaranes (físicos o en BC)
    │                    │
    │                    ├─ Albarán OK → Continúa
    │                    └─ Albarán NO → Escala a Raúl/Sachi
    ▼
Contabiliza en Business Central
    │  (apunta nº proveedor + nº factura)
    ▼
Escanea (impresora arriba 1 a 1 / escaneadora abajo en lote)
    │
    ▼
Separa PDFs con NAPS2 (extrae página por página)
    │
    ▼
Renombra manualmente: [nº proveedor] - [nº factura]
    │
    ▼
Guarda en carpeta de red: \\servidor\Compras\Facturas de compra\[AÑO]\
    │
    ▼
Abre BC → Histórico facturas compra → Filtra por fecha
    │
    ▼
Adjunta PDF manualmente a cada factura en BC
    │
    ▼
Archiva factura física + albaranes en carpeta del proveedor
```

### Herramientas actuales

| Herramienta | Uso |
|-------------|-----|
| Business Central | ERP — contabilización, histórico de facturas |
| NAPS2 | Separación de PDFs escaneados |
| Impresora (planta alta) | Escaneo individual (lenta) |
| Escaneadora (planta baja) | Escaneo en lote (más rápida) |
| Carpeta de red | `\\servidor\Compras\Facturas de compra\[AÑO]\` |

### Convención de nombrado actual

```
[nº proveedor] - [nº factura del proveedor]
```

Ejemplo: `10234 - FA2026-001.pdf`

---

## 3. Pain Points

| # | Problema | Severidad | Frecuencia |
|---|----------|-----------|------------|
| P1 | Renombrar PDFs manualmente (nº proveedor + nº factura) | Alta | Cada factura |
| P2 | ~~Adjuntar PDF a BC~~ — Descartado, no hay API en BC | — | — |
| P3 | Escaneo lento con impresora de arriba | Media | Diario |
| P4 | Tiene que bajar a planta baja para lotes grandes | Media | Semanal |
| P5 | Albaranes no siempre se escanean (falta trazabilidad) | Media | Frecuente |
| P6 | El diario de BC muestra info mínima (solo nº factura + proveedor) | Baja | Al consultar |
| P7 | Si falta albarán → proceso de escalado manual a Raúl/Sachi | Media | Ocasional |

---

## 4. Requisitos detectados

### 4.1 Automatización del renombrado (resuelve P1)

- Al escanear un lote de facturas, el sistema debe **reconocer automáticamente** (OCR):
  - Nº de proveedor (o nombre → mapear a nº)
  - Nº de factura del proveedor
- **Renombrar** el PDF según convención: `[nº proveedor] - [nº factura].pdf`
- Debe funcionar con facturas escaneadas (imagen) y PDFs nativos

### 4.2 Clasificación automática en carpetas (resuelve P1, P4)

- Una vez renombrado, **mover automáticamente** a:
  - `\\servidor\Compras\Facturas de compra\[AÑO]\`
- Opcionalmente crear subcarpetas por proveedor

### ~~4.3 Adjuntado automático a Business Central~~ — DESCARTADO

> No hay API disponible en BC para adjuntar documentos. El adjuntado en BC seguirá siendo manual. La solución se centra en que el fichero ya esté correctamente nombrado y en la carpeta del servidor, de modo que adjuntarlo en BC sea solo un clic.

### 4.3 Separación inteligente de lotes — CRÍTICO (mejora sobre NAPS2)

- Erika escanea **todo mezclado en el mismo lote**: facturas y albaranes juntos
- El sistema debe **detectar automáticamente** dónde empieza/termina cada documento
- **Clasificar** cada documento separado como factura o albarán
- Separar en PDFs individuales sin intervención manual

### 4.5 Control de albaranes (resuelve P5, P7)

- Verificar que cada factura tiene sus albaranes escaneados
- Alertar si falta un albarán asociado
- Dashboard de estado: facturas pendientes de completar

---

## 5. Solución propuesta (TO-BE)

```
Escaneo en lote (todo mezclado: facturas + albaranes)
    │
    ▼
CARPETA DE ENTRADA en servidor (vigilada)
    │
    ▼
[Motor OCR + IA]
    ├─ Detecta separación entre documentos (dónde empieza/termina cada uno)
    ├─ Clasifica: factura vs albarán
    ├─ Extrae: nº proveedor, nº factura, fecha
    └─ Asocia albaranes con su factura
    │
    ▼
Separa en PDFs individuales + Renombra automáticamente
    │
    ▼
Mueve a carpeta de salida en servidor (\\servidor\...\[AÑO]\)
    │
    ▼
Erika adjunta manualmente en BC (ya con el fichero correcto y nombrado)
```

> **Nota:** El adjuntado en BC sigue siendo manual (no hay API), pero el trabajo previo de escanear, separar, clasificar, renombrar y archivar queda automatizado.

---

## 6. Priorización (MoSCoW)

| Prioridad | Requisito |
|-----------|-----------|
| **Must** | Separación automática de lotes (facturas + albaranes mezclados) |
| **Must** | OCR + renombrado automático de facturas |
| **Must** | Clasificación y archivado en carpeta del servidor por año |
| **Should** | Clasificación factura vs albarán + asociación |
| **Could** | Subcarpetas por proveedor |
| **Could** | Control de albaranes + alertas |
| **Won't** | Adjuntado automático a BC (no hay API) |
| **Won't** | Contabilización automática en BC |

---

## 7. Preguntas abiertas

| # | Pregunta | Para quién |
|---|----------|------------|
| Q1 | ~~¿BC tiene API para adjuntar documentos?~~ — **Resuelto: NO** | — |
| Q2 | ~~¿La carpeta de red es accesible?~~ — **Resuelto: SÍ, directamente en el servidor** | — |
| Q3 | ~~¿Maestro de proveedores exportable?~~ — **Resuelto: SÍ, ya existe en el proyecto** | — |
| Q4 | ~~¿Volumen mensual?~~ — **Resuelto: ~180 facturas + albaranes/mes** | — |
| Q5 | ~~¿Albaranes junto a factura o separados?~~ — **Resuelto: Todo mezclado en el mismo lote** | — |
| Q6 | ~~¿Subcarpetas por proveedor?~~ — **Resuelto: SÍ, subcarpetas por proveedor en carpeta dedicada. Luego Erika distribuye manualmente** | — |
| Q7 | ~~¿Formato nº factura?~~ — **Resuelto: códigos-letras (formato variable por proveedor)** | — |
| Q8 | Ruta exacta de la carpeta de entrada en el servidor — **Pendiente de definir** | IT / Erika |
| Q9 | Ruta exacta de la carpeta de salida (destino final) — **Pendiente de definir** | IT / Erika |

---

## 8. Análisis Determinista vs IA

| Paso | Tipo | Detalle |
|------|------|---------|
| Vigilar carpeta de entrada | Determinista | Watchdog/polling detecta ficheros nuevos |
| Separar PDF en páginas | Determinista | PyMuPDF — split mecánico |
| **Detectar límites entre documentos** | **IA** | Cada página se analiza: ¿es documento nuevo o continuación del anterior? |
| **Clasificar: factura vs albarán** | **IA** | Analizar contenido para determinar tipo |
| **Extraer nº factura, nombre proveedor, fecha** | **IA/OCR** | Leer texto y extraer campos clave |
| Mapear nombre proveedor → nº proveedor | Determinista | Lookup contra maestro de proveedores (ya existe) |
| Renombrar fichero | Determinista | `[nº proveedor] - [nº factura].pdf` |
| Crear subcarpeta por proveedor | Determinista | mkdir si no existe |
| Mover a carpeta destino | Determinista | File move |

**Resumen: 3 pasos requieren IA (detección de límites, clasificación, extracción). El resto es lógica determinista.**

La IA se resuelve con una llamada por página a **GPT-4o mini (visión)** que devuelve:

```json
{
  "tipo": "factura | albaran",
  "proveedor": "NOMBRE PROVEEDOR",
  "nº_factura": "FA2026-001",
  "fecha": "2026-02-15",
  "es_continuacion_anterior": true | false
}
```

### Motor de IA: GPT-4o mini

- **Coste estimado:** ~$0.12/mes (360 páginas/mes)
- **Fallback:** GPT-4o (~$2.2/mes) si la tasa de acierto baja del 95%
- **Justificación:** Las facturas son documentos estructurados — no requieren el modelo más potente. GPT-4o mini tiene visión suficiente para extraer campos de cabecera.

### Datos de dimensionamiento

- **Volumen:** ~180 facturas + albaranes / mes
- **Formato nº factura:** códigos-letras (variable por proveedor)
- **Maestro proveedores:** disponible en el proyecto
- **Destino:** subcarpetas por proveedor en carpeta dedicada del servidor

---

## 9. Stack técnico sugerido

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| IA/OCR | **GPT-4o mini (visión)** — fallback: GPT-4o | Extracción, clasificación y detección de límites (~$0.12/mes) |
| Separación PDF | PyMuPDF / pdf2image | Split mecánico de páginas |
| Backend | Python (watchdog + procesamiento) | Vigilar carpeta entrada en servidor + orquestar flujo |
| API OpenAI | openai Python SDK | Llamadas de visión por página |
| Frontend/Dashboard | React + Tailwind (integrar en FMV Dashboard) | Revisión y corrección antes de archivar |
| Almacenamiento | Carpeta de red en servidor (existente) | Sin cambio de infra |

---

## 9. Siguiente paso

→ **Fase 02_Product**: Definir user stories y especificación funcional detallada basada en este discovery.

---

*Generado por TOKENIA Studio — 23/02/2026*
