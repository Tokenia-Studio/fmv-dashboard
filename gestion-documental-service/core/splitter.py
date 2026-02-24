"""Separa un PDF en imágenes PNG individuales por página."""

from __future__ import annotations
import logging
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)


def split_pdf_to_images(pdf_path: str | Path, output_dir: str | Path, dpi: int = 300) -> list[str]:
    """Convierte cada página del PDF en una imagen PNG.

    Args:
        pdf_path: Ruta al PDF de entrada.
        output_dir: Directorio donde guardar las imágenes.
        dpi: Resolución de las imágenes generadas.

    Returns:
        Lista de rutas a las imágenes generadas, ordenadas por página.
    """
    pdf_path = Path(pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF no encontrado: {pdf_path}")

    doc = fitz.open(str(pdf_path))
    image_paths: list[str] = []

    zoom = dpi / 72  # 72 es la resolución base de PDF
    matrix = fitz.Matrix(zoom, zoom)

    logger.info(f"Procesando {pdf_path.name}: {len(doc)} páginas a {dpi} DPI")

    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=matrix)

        image_name = f"page_{page_num + 1:03d}.png"
        image_path = output_dir / image_name

        pix.save(str(image_path))
        image_paths.append(str(image_path))

        logger.debug(f"  Página {page_num + 1}/{len(doc)} → {image_name}")

    doc.close()
    logger.info(f"Split completado: {len(image_paths)} imágenes generadas")

    return image_paths
