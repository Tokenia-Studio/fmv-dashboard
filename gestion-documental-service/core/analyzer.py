"""Analiza páginas escaneadas usando GPT-4o mini (visión) para extraer datos.

Optimizaciones de velocidad:
- Procesamiento PARALELO (todas las páginas a la vez, con semáforo)
- Imágenes JPEG comprimidas (en vez de PNG pesados)
- detail: "low" por defecto (4x menos tokens)
- response_format: json_object (respuesta más limpia y rápida)
- Post-proceso local para detección de continuaciones
"""

from __future__ import annotations
import asyncio
import base64
import json
import logging
import time
from datetime import date
from pathlib import Path

from openai import AsyncOpenAI

from .models import PageResult, TipoDocumento

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente experto en clasificación de documentos contables de COMPRA españoles.
Estos son documentos que la empresa FABRICACIONES METÁLICAS VALDEPINTO S.L. (FMV) RECIBE de sus proveedores.

Tu tarea: clasificar el tipo de documento, identificar al PROVEEDOR (quien EMITE), y extraer datos clave.

═══════════════════════════════════════
1. IDENTIFICACIÓN DEL PROVEEDOR
═══════════════════════════════════════
- FMV / Fabricaciones Metálicas Valdepinto / Valdepinto / CIF B80652688 = COMPRADOR (nunca proveedor)
- El PROVEEDOR es la OTRA empresa (quien emite/vende)
- En facturas: emisor (cabecera, arriba/izquierda, logo) = proveedor
- En albaranes: remitente/origen = proveedor
- Si solo ves FMV y ninguna otra empresa → proveedor = null

═══════════════════════════════════════
2. CLASIFICACIÓN DEL DOCUMENTO (tipo)
═══════════════════════════════════════
FACTURA:
- Contiene la palabra "FACTURA" en cabecera (o "Fra.", "Invoice")
- Tiene número de factura, importes con IVA/base imponible, datos fiscales
- Puede referenciar números de albarán en sus líneas de detalle

ALBARÁN:
- Contiene la palabra "ALBARÁN" en cabecera (o "Nota de entrega", "Delivery note")
- Tiene número de albarán propio
- Lista materiales/productos entregados con cantidades
- NO tiene desglose de IVA ni importes totales con impuestos
- A veces tiene precios unitarios pero NO base imponible/cuota IVA

═══════════════════════════════════════
3. DETECCIÓN DE CONTINUACIÓN (es_continuacion_anterior)
═══════════════════════════════════════
Marcar TRUE cuando:
- La página NO tiene cabecera/logo del emisor (empieza directamente con líneas de tabla)
- Dice "Página 2 de 3", "Hoja 2", "Continuación", etc.
- La tabla de líneas continúa sin encabezado de columnas nuevo
- No hay un nuevo número de documento (ni factura ni albarán)

Marcar FALSE cuando:
- Tiene cabecera con logo/nombre de empresa
- Tiene un nuevo número de factura o albarán
- Es claramente un documento independiente

═══════════════════════════════════════
4. EXTRACCIÓN DE NÚMEROS DE ALBARÁN
═══════════════════════════════════════
numero_albaran: El número propio del albarán (solo si tipo=albaran).
  Buscar patrones: "Albarán nº", "N/A:", "Alb.", "Nº:", seguido de un código.

numeros_albaran_referenciados: SOLO para facturas.
  Buscar en las LÍNEAS DE DETALLE de la factura referencias a albaranes:
  - "Alb.", "Albarán", "N/A", "Nº Alb.", "Ref. albarán"
  - Pueden aparecer como columna, como texto entre líneas, o agrupados
  - Extraer CADA número de albarán individual (no agrupar)
  - Ejemplo: si la factura dice "Alb. 12345" y "Alb. 12346" → ["12345", "12346"]
  - Incluir el formato EXACTO del número como aparece (con prefijos, barras, etc.)

═══════════════════════════════════════
5. RESPUESTA
═══════════════════════════════════════
Responde con JSON:

{
  "tipo": "factura" | "albaran" | "desconocido",
  "proveedor": "razón social del EMISOR (nunca FMV) o null",
  "proveedor_nif": "CIF/NIF del EMISOR o null",
  "numero_factura": "número de factura o null",
  "numero_albaran": "número propio del albarán o null",
  "numeros_albaran_referenciados": ["nºs albarán citados en la factura"] o [],
  "numero_pedido": "número de pedido o null",
  "fecha": "YYYY-MM-DD o null",
  "es_continuacion_anterior": true | false,
  "confianza": 0.0 a 1.0
}

confianza: 0.9-1.0 si ves datos claros, 0.5-0.8 si hay ambigüedad, <0.5 si no estás seguro."""


def _encode_image(image_path: str) -> str:
    """Codifica imagen en base64 para la API de OpenAI."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _get_api_image_path(preview_path: str) -> str:
    """Dada la ruta de un PNG de preview, devuelve la ruta del JPEG para API.

    page_001.png → page_001_api.jpg
    Si el JPEG no existe, usa el PNG original.
    """
    p = Path(preview_path)
    jpg_path = p.parent / f"{p.stem}_api.jpg"
    if jpg_path.exists():
        return str(jpg_path)
    return preview_path


def _get_mime_type(image_path: str) -> str:
    """Devuelve el MIME type según la extensión."""
    if image_path.lower().endswith(".jpg") or image_path.lower().endswith(".jpeg"):
        return "image/jpeg"
    return "image/png"


def _parse_response(raw: str, page_number: int) -> dict:
    """Parsea la respuesta JSON de OpenAI, tolerando formatos imperfectos."""
    text = raw.strip()
    # Quitar bloques de código markdown si los hay
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.warning(f"Página {page_number}: respuesta no es JSON válido: {text[:200]}")
        return {
            "tipo": "desconocido",
            "proveedor": None,
            "numero_factura": None,
            "numero_albaran": None,
            "numero_pedido": None,
            "fecha": None,
            "es_continuacion_anterior": False,
            "confianza": 0.0,
        }

    # GPT a veces devuelve la cadena "null" en vez de JSON null
    for key in ("proveedor", "proveedor_nif", "numero_factura", "numero_albaran",
                "numero_pedido", "fecha"):
        if isinstance(data.get(key), str) and data[key].strip().lower() == "null":
            data[key] = None

    return data


_FMV_PATTERNS = [
    "fabricaciones metalicas valdepinto",
    "fabricaciones metálicas valdepinto",
    "fmv",
    "valdepinto",
]
_FMV_NIFS = {"B80652688", "B67803304"}


def _filter_fmv(data: dict) -> dict:
    """Si GPT puso a FMV como proveedor, lo anula."""
    proveedor = (data.get("proveedor") or "").lower().strip()
    nif = (data.get("proveedor_nif") or "").upper().strip()

    is_fmv = any(pat in proveedor for pat in _FMV_PATTERNS) or nif in _FMV_NIFS
    if is_fmv:
        data["proveedor"] = None
        data["proveedor_nif"] = None
    return data


def _to_page_result(data: dict, page_number: int, image_path: str) -> PageResult:
    """Convierte el dict parseado de OpenAI en un PageResult."""
    fecha = None
    if data.get("fecha"):
        try:
            fecha = date.fromisoformat(data["fecha"])
        except (ValueError, TypeError):
            pass

    tipo_raw = data.get("tipo", "desconocido")
    try:
        tipo = TipoDocumento(tipo_raw)
    except ValueError:
        tipo = TipoDocumento.DESCONOCIDO

    return PageResult(
        page_number=page_number,
        tipo=tipo,
        proveedor=data.get("proveedor"),
        proveedor_nif=data.get("proveedor_nif"),
        numero_factura=data.get("numero_factura"),
        numero_albaran=data.get("numero_albaran"),
        numero_pedido=data.get("numero_pedido"),
        numeros_albaran_ref=data.get("numeros_albaran_referenciados") or [],
        fecha=fecha,
        es_continuacion_anterior=bool(data.get("es_continuacion_anterior", False)),
        confianza=float(data.get("confianza", 0.0)),
        image_path=image_path,
    )


def _postprocess_continuations(results: list[PageResult]) -> list[PageResult]:
    """Post-proceso local: refuerza la detección de continuaciones.

    Si una página tiene es_continuacion_anterior=True pero tiene datos
    que la hacen parecer un documento nuevo, se corrige.

    Si una página NO tiene cabecera (sin proveedor, sin nº doc) y la anterior
    sí tenía, se marca como continuación.
    """
    if len(results) <= 1:
        return results

    for i in range(1, len(results)):
        curr = results[i]
        prev = results[i - 1]

        # Caso 1: GPT dice continuación pero tiene su propio nº de documento → NO es continuación
        if curr.es_continuacion_anterior:
            has_own_number = (
                (curr.numero_factura and curr.numero_factura != prev.numero_factura) or
                (curr.numero_albaran and curr.numero_albaran != prev.numero_albaran)
            )
            if has_own_number:
                curr.es_continuacion_anterior = False
                logger.debug(
                    f"  Página {curr.page_number}: corregido continuación→nuevo "
                    f"(tiene nº propio: fac={curr.numero_factura}, alb={curr.numero_albaran})"
                )

        # Caso 2: GPT dice NO continuación pero no tiene datos propios
        # y el proveedor coincide → probablemente SÍ es continuación
        if not curr.es_continuacion_anterior and prev.tipo != TipoDocumento.DESCONOCIDO:
            no_own_data = (
                not curr.numero_factura and
                not curr.numero_albaran and
                not curr.proveedor and
                curr.tipo == prev.tipo
            )
            if no_own_data and curr.confianza < 0.7:
                curr.es_continuacion_anterior = True
                logger.debug(
                    f"  Página {curr.page_number}: corregido nuevo→continuación "
                    f"(sin datos propios, baja confianza)"
                )

    return results


async def _analyze_single_page(
    client: AsyncOpenAI,
    image_path: str,
    page_number: int,
    model: str,
    timeout: int,
    max_retries: int,
) -> PageResult:
    """Analiza una sola página con la API de visión de OpenAI.

    Usa JPEG comprimido + detail:low para máxima velocidad.
    """
    # Usar JPEG comprimido si está disponible
    api_image = _get_api_image_path(image_path)
    b64 = _encode_image(api_image)
    mime = _get_mime_type(api_image)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": f"Analiza esta página (página {page_number}):"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime};base64,{b64}",
                        "detail": "auto",
                    },
                },
            ],
        },
    ]

    for attempt in range(max_retries):
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=500,
                    temperature=0.1,
                    response_format={"type": "json_object"},
                ),
                timeout=timeout,
            )

            raw_text = response.choices[0].message.content or ""
            data = _parse_response(raw_text, page_number)
            data = _filter_fmv(data)
            result = _to_page_result(data, page_number, image_path)

            logger.info(
                f"  Pág {page_number}: {result.tipo.value} | "
                f"prov={result.proveedor or '-'} | "
                f"fac={result.numero_factura or '-'} | "
                f"alb={result.numero_albaran or '-'} | "
                f"conf={result.confianza:.0%}"
            )
            return result

        except asyncio.TimeoutError:
            logger.warning(f"  Página {page_number}: timeout (intento {attempt + 1}/{max_retries})")
        except Exception as e:
            logger.warning(f"  Página {page_number}: error (intento {attempt + 1}/{max_retries}): {e}")

        if attempt < max_retries - 1:
            await asyncio.sleep(2 ** attempt)

    logger.error(f"  Página {page_number}: todos los intentos fallaron")
    return PageResult(
        page_number=page_number,
        tipo=TipoDocumento.DESCONOCIDO,
        confianza=0.0,
        image_path=image_path,
    )


async def _retry_with_high_detail(
    client: AsyncOpenAI,
    result: PageResult,
    model: str,
    timeout: int,
) -> PageResult:
    """Re-analiza una página con detail:high + PNG original.

    Acepta el nuevo resultado si:
    - Mejora la confianza, O
    - Extrae más datos (nºs de albarán referenciados, proveedor, etc.)
    """
    image_path = result.image_path
    if not image_path:
        return result

    # Para retry usar el PNG original (mayor calidad)
    b64 = _encode_image(image_path)

    hint = ""
    if result.tipo == TipoDocumento.FACTURA:
        hint = (
            " IMPORTANTE: Si es una factura, busca con mucho cuidado TODOS los "
            "numeros de albaran referenciados en las lineas de detalle. "
            "Los numeros suelen tener 4-6 digitos."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        f"Analiza esta pagina con MAXIMO detalle (pagina {result.page_number}).{hint}"
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{b64}",
                        "detail": "high",
                    },
                },
            ],
        },
    ]

    try:
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=600,
                temperature=0.1,
                response_format={"type": "json_object"},
            ),
            timeout=timeout * 2,
        )

        raw_text = response.choices[0].message.content or ""
        data = _parse_response(raw_text, result.page_number)
        data = _filter_fmv(data)
        new_result = _to_page_result(data, result.page_number, image_path)

        # Aceptar si mejora confianza O extrae más datos
        better_confidence = new_result.confianza >= result.confianza
        more_data = (
            len(new_result.numeros_albaran_ref) > len(result.numeros_albaran_ref) or
            (new_result.proveedor and not result.proveedor) or
            (new_result.proveedor_nif and not result.proveedor_nif)
        )

        if better_confidence or more_data:
            refs = new_result.numeros_albaran_ref
            logger.info(
                f"  Pag {result.page_number} RETRY-HD: {new_result.tipo.value} | "
                f"conf={result.confianza:.0%}->{new_result.confianza:.0%} | "
                f"alb_ref={refs if refs else '-'}"
            )
            return new_result
        else:
            logger.info(f"  Pag {result.page_number} RETRY-HD: sin mejora, manteniendo original")
            return result

    except Exception as e:
        logger.warning(f"  Pag {result.page_number} RETRY-HD fallo: {e}")
        return result


async def analyze_pages(
    image_paths: list[str],
    api_key: str,
    model: str = "gpt-4o-mini",
    max_concurrent: int = 10,
    timeout: int = 30,
    max_retries: int = 3,
) -> list[PageResult]:
    """Analiza todas las páginas de un lote EN PARALELO.

    Estrategia en 3 fases:
    1. Enviar TODAS las páginas a la vez (con semáforo de concurrencia) usando
       JPEG + detail:low para máxima velocidad.
    2. Re-analizar con detail:high las páginas con confianza < 0.6
    3. Post-procesar continuaciones localmente (sin API)

    Args:
        image_paths: Lista de rutas a las imágenes PNG (previews).
        api_key: API key de OpenAI.
        model: Modelo a usar.
        max_concurrent: Máximo de llamadas concurrentes.
        timeout: Timeout por llamada en segundos.
        max_retries: Reintentos por página.

    Returns:
        Lista de PageResult ordenada por número de página.
    """
    client = AsyncOpenAI(api_key=api_key)
    semaphore = asyncio.Semaphore(max_concurrent)

    total = len(image_paths)
    logger.info(f"Analizando {total} páginas con {model} (max {max_concurrent} en paralelo)")
    t0 = time.time()

    # ── FASE 1: Análisis paralelo con detail:low + JPEG ──

    async def analyze_with_semaphore(image_path: str, page_number: int) -> PageResult:
        async with semaphore:
            return await _analyze_single_page(
                client=client,
                image_path=image_path,
                page_number=page_number,
                model=model,
                timeout=timeout,
                max_retries=max_retries,
            )

    tasks = [
        analyze_with_semaphore(image_path, i + 1)
        for i, image_path in enumerate(image_paths)
    ]
    results = await asyncio.gather(*tasks)
    results = list(results)

    t1 = time.time()
    logger.info(f"Fase 1 completada en {t1 - t0:.1f}s ({total} páginas)")

    # ── FASE 2: Retry con detail:high para páginas que necesitan más detalle ──
    # - Baja confianza (<0.6)
    # - Facturas sin nºs de albarán referenciados (necesitan leer líneas de detalle)

    LOW_CONFIDENCE = 0.6
    needs_retry = []
    for i, r in enumerate(results):
        if r.confianza < LOW_CONFIDENCE:
            needs_retry.append(i)
        elif r.tipo == TipoDocumento.FACTURA and not r.numeros_albaran_ref:
            needs_retry.append(i)

    low_conf_indices = list(set(needs_retry))

    if low_conf_indices:
        logger.info(
            f"Fase 2: re-analizando {len(low_conf_indices)} páginas con detail:high "
            f"(baja confianza o facturas sin albaranes ref.)"
        )

        retry_semaphore = asyncio.Semaphore(3)  # Menos concurrencia para high detail

        async def retry_with_semaphore(idx: int) -> tuple[int, PageResult]:
            async with retry_semaphore:
                new_result = await _retry_with_high_detail(
                    client=client,
                    result=results[idx],
                    model=model,
                    timeout=timeout,
                )
                return idx, new_result

        retry_tasks = [retry_with_semaphore(i) for i in low_conf_indices]
        retry_results = await asyncio.gather(*retry_tasks)

        for idx, new_result in retry_results:
            results[idx] = new_result

        t2 = time.time()
        logger.info(f"Fase 2 completada en {t2 - t1:.1f}s")

    # ── FASE 3: Post-proceso local de continuaciones ──

    results = _postprocess_continuations(results)

    elapsed = time.time() - t0
    logger.info(
        f"Análisis completado: {total} páginas en {elapsed:.1f}s "
        f"({elapsed / total:.1f}s/pág)"
    )
    return results
