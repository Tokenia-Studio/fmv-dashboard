"""Analiza páginas escaneadas usando GPT-4o mini (visión) para extraer datos."""

from __future__ import annotations
import asyncio
import base64
import json
import logging
from datetime import date
from pathlib import Path

from openai import AsyncOpenAI

from .models import PageResult, TipoDocumento

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Eres un asistente de clasificación de documentos contables.
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
  del mismo documento que la página anterior (misma factura/albarán).
  Indicadores: no tiene cabecera propia, continúa una tabla de líneas,
  dice "Página 2 de 3", etc.
- Si no puedes identificar un campo con certeza, pon null
- confianza refleja tu certeza general sobre la extracción (0.0 = nada, 1.0 = seguro)
- Para facturas, busca: nombre del emisor/proveedor, número de factura, fecha de emisión
- Para albaranes, busca: nombre del proveedor, número de albarán, número de pedido asociado"""


def _encode_image(image_path: str) -> str:
    """Codifica imagen en base64 para la API de OpenAI."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


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
        return json.loads(text)
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
        numero_factura=data.get("numero_factura"),
        numero_albaran=data.get("numero_albaran"),
        numero_pedido=data.get("numero_pedido"),
        fecha=fecha,
        es_continuacion_anterior=bool(data.get("es_continuacion_anterior", False)),
        confianza=float(data.get("confianza", 0.0)),
        image_path=image_path,
    )


async def _analyze_single_page(
    client: AsyncOpenAI,
    image_path: str,
    page_number: int,
    model: str,
    timeout: int,
    max_retries: int,
    previous_context: str | None = None,
) -> PageResult:
    """Analiza una sola página con la API de visión de OpenAI."""
    b64 = _encode_image(image_path)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Si hay contexto de la página anterior, ayuda a detectar continuaciones
    if previous_context:
        messages.append({
            "role": "user",
            "content": f"Contexto: la página anterior era: {previous_context}",
        })

    messages.append({
        "role": "user",
        "content": [
            {"type": "text", "text": f"Analiza esta página (página {page_number} del lote escaneado):"},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{b64}",
                    "detail": "high",
                },
            },
        ],
    })

    for attempt in range(max_retries):
        try:
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=500,
                    temperature=0.1,
                ),
                timeout=timeout,
            )

            raw_text = response.choices[0].message.content or ""
            data = _parse_response(raw_text, page_number)
            result = _to_page_result(data, page_number, image_path)

            logger.info(
                f"  Página {page_number}: tipo={result.tipo.value}, "
                f"proveedor={result.proveedor}, "
                f"factura={result.numero_factura}, "
                f"confianza={result.confianza:.2f}"
            )
            return result

        except asyncio.TimeoutError:
            logger.warning(f"  Página {page_number}: timeout (intento {attempt + 1}/{max_retries})")
        except Exception as e:
            logger.warning(f"  Página {page_number}: error (intento {attempt + 1}/{max_retries}): {e}")

        if attempt < max_retries - 1:
            await asyncio.sleep(2 ** attempt)  # Backoff exponencial

    # Si todos los intentos fallan
    logger.error(f"  Página {page_number}: todos los intentos fallaron")
    return PageResult(
        page_number=page_number,
        tipo=TipoDocumento.DESCONOCIDO,
        confianza=0.0,
        image_path=image_path,
    )


async def analyze_pages(
    image_paths: list[str],
    api_key: str,
    model: str = "gpt-4o-mini",
    max_concurrent: int = 5,
    timeout: int = 30,
    max_retries: int = 3,
) -> list[PageResult]:
    """Analiza todas las páginas de un lote en paralelo.

    Procesa las páginas en orden pero con concurrencia limitada.
    Pasa contexto de la página anterior para mejorar la detección de continuaciones.

    Args:
        image_paths: Lista de rutas a las imágenes PNG.
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
    results: list[PageResult] = []

    logger.info(f"Analizando {len(image_paths)} páginas con {model} (max {max_concurrent} concurrentes)")

    # Procesamos secuencialmente para poder pasar contexto de página anterior,
    # pero con semáforo para limitar llamadas concurrentes al API
    for i, image_path in enumerate(image_paths):
        page_number = i + 1

        # Contexto de la página anterior (si existe)
        previous_context = None
        if results:
            prev = results[-1]
            previous_context = (
                f"tipo={prev.tipo.value}, proveedor={prev.proveedor}, "
                f"factura={prev.numero_factura}, albaran={prev.numero_albaran}"
            )

        async with semaphore:
            result = await _analyze_single_page(
                client=client,
                image_path=image_path,
                page_number=page_number,
                model=model,
                timeout=timeout,
                max_retries=max_retries,
                previous_context=previous_context,
            )
            results.append(result)

    logger.info(f"Análisis completado: {len(results)} páginas procesadas")
    return results
