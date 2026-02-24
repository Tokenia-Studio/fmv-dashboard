"""Renombra y mueve documentos procesados a la carpeta destino del servidor."""

from __future__ import annotations
import logging
import shutil
import time
from datetime import datetime
from pathlib import Path

from .config import AppConfig
from .models import Document, EstadoDocumento, TipoDocumento

logger = logging.getLogger(__name__)


def archive_documents(
    documents: list[Document],
    config: AppConfig,
) -> list[Document]:
    """Renombra y mueve cada documento a su carpeta destino.

    - Confianza OK → \\salida\\[AÑO]\\[nº proveedor] - [nombre]\\
    - Confianza baja o revisar → \\pendientes_revision\\

    Convención de nombrado:
    - Facturas: [nº proveedor] - [nº factura].pdf
    - Albaranes sueltos: ALB - [nº albarán].pdf

    Args:
        documents: Lista de documentos con pdf_path y datos extraídos.
        config: Configuración con rutas.

    Returns:
        La misma lista con ruta_destino y fichero_nombre actualizados.
    """
    year = str(datetime.now().year)

    for doc in documents:
        if not doc.pdf_path:
            continue  # Albarán asociado sin PDF propio

        if doc.estado == EstadoDocumento.REVISAR or doc.estado == EstadoDocumento.CORREGIDO:
            # Mover a pendientes de revisión
            dest_dir = Path(config.paths.pendientes)
        else:
            # Mover a salida organizada
            dest_dir = _build_dest_dir(doc, config.paths.salida, year)

        dest_dir.mkdir(parents=True, exist_ok=True)

        # Generar nombre de fichero
        filename = _build_filename(doc)
        dest_path = dest_dir / filename

        # Evitar sobreescritura
        dest_path = _safe_path(dest_path)

        # Mover
        shutil.move(doc.pdf_path, str(dest_path))
        doc.ruta_destino = str(dest_path)
        doc.fichero_nombre = dest_path.name

        logger.info(f"  Archivado: {dest_path.name} → {dest_dir}")

    archivados = sum(1 for d in documents if d.ruta_destino)
    logger.info(f"Archivado completado: {archivados} documentos movidos")

    return documents


def move_original_to_processed(pdf_path: str | Path, config: AppConfig) -> None:
    """Mueve el PDF original escaneado a la carpeta de procesados (backup)."""
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        return

    procesados_dir = Path(config.paths.procesados)
    procesados_dir.mkdir(parents=True, exist_ok=True)

    dest = _safe_path(procesados_dir / pdf_path.name)
    shutil.move(str(pdf_path), str(dest))
    logger.info(f"Original movido a procesados: {dest.name}")


def _build_dest_dir(doc: Document, salida_base: str, year: str) -> Path:
    """Construye la ruta de destino: salida/[AÑO]/[nº proveedor] - [nombre]/"""
    base = Path(salida_base) / year

    if doc.proveedor_codigo and doc.proveedor_nombre:
        folder = f"{doc.proveedor_codigo} - {_sanitize(doc.proveedor_nombre)}"
    elif doc.proveedor_codigo:
        folder = doc.proveedor_codigo
    elif doc.proveedor_nombre:
        folder = _sanitize(doc.proveedor_nombre)
    else:
        folder = "SIN_PROVEEDOR"

    return base / folder


def _build_filename(doc: Document) -> str:
    """Genera el nombre del fichero según la convención."""
    if doc.tipo == TipoDocumento.FACTURA:
        proveedor = doc.proveedor_codigo or _sanitize(doc.proveedor_nombre or "SIN_PROV")
        factura = _sanitize(doc.numero_factura or f"SIN_NUMERO_{int(time.time())}")
        return f"{proveedor} - {factura}.pdf"

    elif doc.tipo == TipoDocumento.ALBARAN:
        albaran = _sanitize(doc.numero_albaran or f"SIN_NUMERO_{int(time.time())}")
        return f"ALB - {albaran}.pdf"

    else:
        return f"DOC_DESCONOCIDO_{int(time.time())}.pdf"


def _sanitize(text: str) -> str:
    """Limpia un texto para usarlo como nombre de fichero."""
    # Quitar caracteres no válidos en Windows
    forbidden = '<>:"/\\|?*'
    result = text.strip()
    for char in forbidden:
        result = result.replace(char, "_")
    return result


def _safe_path(path: Path) -> Path:
    """Si el fichero ya existe, añade sufijo _2, _3, etc."""
    if not path.exists():
        return path

    counter = 2
    while True:
        new_path = path.parent / f"{path.stem}_{counter}{path.suffix}"
        if not new_path.exists():
            return new_path
        counter += 1
