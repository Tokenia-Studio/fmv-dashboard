"""Separa un PDF en imágenes por página.

Genera dos versiones:
- PNG a DPI completo para previews (subida a Supabase)
- JPEG comprimido a DPI reducido para análisis con OpenAI (más rápido y barato)
"""

from __future__ import annotations
import logging
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)

# DPI para análisis OpenAI (menor = más rápido, 150 es suficiente para vision)
ANALYSIS_DPI = 150
JPEG_QUALITY = 80


def split_pdf_to_images(
    pdf_path: str | Path,
    output_dir: str | Path,
    dpi: int = 200,
) -> list[str]:
    """Convierte cada página del PDF en imágenes.

    Genera:
    - page_001.png (a `dpi`) → para previews en Supabase
    - page_001_api.jpg (a 150 DPI, JPEG q80) → para enviar a OpenAI

    Args:
        pdf_path: Ruta al PDF de entrada.
        output_dir: Directorio donde guardar las imágenes.
        dpi: Resolución de las imágenes de preview.

    Returns:
        Lista de rutas a las imágenes PNG (previews), ordenadas por página.
    """
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF no encontrado: {pdf_path}")

    doc = fitz.open(str(pdf_path))
    image_paths: list[str] = []

    zoom_preview = dpi / 72
    zoom_api = ANALYSIS_DPI / 72
    matrix_preview = fitz.Matrix(zoom_preview, zoom_preview)
    matrix_api = fitz.Matrix(zoom_api, zoom_api)

    logger.info(f"Procesando {pdf_path.name}: {len(doc)} páginas (preview={dpi}DPI, API={ANALYSIS_DPI}DPI)")

    for page_num in range(len(doc)):
        page = doc[page_num]

        # PNG para preview (calidad completa)
        pix_preview = page.get_pixmap(matrix=matrix_preview)
        png_name = f"page_{page_num + 1:03d}.png"
        png_path = output_dir / png_name
        pix_preview.save(str(png_path))
        image_paths.append(str(png_path))

        # JPEG para API de OpenAI (comprimido, menor resolución)
        pix_api = page.get_pixmap(matrix=matrix_api)
        jpg_name = f"page_{page_num + 1:03d}_api.jpg"
        jpg_path = output_dir / jpg_name
        # Convertir pixmap a PIL Image para guardar como JPEG con compresión
        img = Image.frombytes("RGB", [pix_api.width, pix_api.height], pix_api.samples)
        img.save(str(jpg_path), "JPEG", quality=JPEG_QUALITY, optimize=True)

        logger.debug(f"  Página {page_num + 1}/{len(doc)} → {png_name} + {jpg_name}")

    doc.close()
    logger.info(f"Split completado: {len(image_paths)} páginas generadas")

    return image_paths
