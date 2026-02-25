"""Pipeline principal: orquesta todo el flujo de procesamiento de un lote."""

from __future__ import annotations
import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

from .config import AppConfig
from .models import Batch, Document, EstadoBatch, EstadoDocumento, TipoDocumento
from .splitter import split_pdf_to_images
from .analyzer import analyze_pages
from .grouper import group_pages_into_documents
from .associator import associate_delivery_notes
from .merger import merge_documents
from .supplier_lookup import lookup_suppliers, Supplier
from .archiver import archive_documents, move_original_to_processed

logger = logging.getLogger(__name__)


async def process_pdf(
    pdf_path: str | Path,
    config: AppConfig,
    maestro: list[Supplier] | None = None,
    supabase_sync=None,
) -> Batch:
    """Procesa un PDF escaneado: split → analyze → group → associate → merge → lookup → archive.

    Args:
        pdf_path: Ruta al PDF de entrada.
        config: Configuración de la aplicación.
        maestro: Lista de proveedores para lookup. Si None, se salta el lookup.
        supabase_sync: Cliente SupabaseSync para persistir resultados. Opcional.

    Returns:
        Batch con los documentos procesados.
    """
    pdf_path = Path(pdf_path).resolve()
    logger.info(f"=== Procesando lote: {pdf_path.name} ===")

    batch = Batch(fichero_origen=pdf_path.name)

    # 1. Mover PDF a carpeta 'procesando' para evitar reprocesamiento
    procesando_dir = Path(config.paths.procesando).resolve()
    procesando_dir.mkdir(parents=True, exist_ok=True)
    processing_path = procesando_dir / pdf_path.name

    if pdf_path != processing_path:
        shutil.move(str(pdf_path), str(processing_path))
        logger.info(f"Movido a procesando: {processing_path}")

    # Directorio temporal para imágenes y PDFs intermedios
    with tempfile.TemporaryDirectory(prefix="gesdoc_") as temp_dir:
        try:
            # 2. Split PDF en imágenes
            image_paths = split_pdf_to_images(
                pdf_path=processing_path,
                output_dir=temp_dir,
                dpi=config.processing.dpi,
            )
            batch.total_paginas = len(image_paths)

            if not image_paths:
                logger.warning("PDF sin páginas — moviendo a errores")
                _move_to_errors(processing_path, config)
                batch.estado = EstadoBatch.ARCHIVADO
                return batch

            # 3. Analizar cada página con GPT-4o mini
            page_results = await analyze_pages(
                image_paths=image_paths,
                api_key=config.openai.api_key,
                model=config.openai.model,
                max_concurrent=config.openai.max_concurrent,
                timeout=config.openai.timeout,
                max_retries=config.openai.max_retries,
            )

            # 4. Agrupar páginas en documentos
            documents = group_pages_into_documents(
                page_results=page_results,
                confidence_threshold=config.processing.confidence_threshold,
            )

            # 5. Asociar albaranes con facturas
            documents = associate_delivery_notes(documents)

            # 6. Generar PDFs unificados (factura + albaranes)
            merge_output_dir = Path(temp_dir) / "merged"
            documents = merge_documents(
                documents=documents,
                source_pdf_path=processing_path,
                output_dir=merge_output_dir,
            )

            # 7. Lookup de proveedores (fuzzy match contra maestro)
            if maestro:
                documents = lookup_suppliers(
                    documents=documents,
                    maestro=maestro,
                    match_threshold=config.processing.supplier_match_threshold,
                )

            # 8. Archivar: renombrar y mover a carpeta destino
            documents = archive_documents(documents, config)

            # 9. Mover original a procesados (backup)
            move_original_to_processed(processing_path, config)

            # Finalizar batch
            batch.documents = documents
            batch.total_documentos = len(documents)
            batch.estado = EstadoBatch.PENDIENTE_REVISION

            # 9b. Subir previews a Supabase Storage (antes de borrar temp dir)
            if supabase_sync:
                try:
                    preview_urls = supabase_sync.upload_previews(batch.id, image_paths)
                    logger.info(f"Subidas {len(preview_urls)} previews a Supabase Storage")
                except Exception as e:
                    logger.error(f"Error subiendo previews: {e}")

            # 10. Persistir en Supabase
            if supabase_sync:
                try:
                    supabase_sync.save_batch(batch)
                    supabase_sync.log(batch.id, "info",
                        f"Procesado: {batch.total_documentos} docs de {batch.total_paginas} pags")
                except Exception as e:
                    logger.error(f"Error guardando en Supabase: {e}")

            logger.info(
                f"=== Lote completado: {batch.total_documentos} documentos "
                f"de {batch.total_paginas} páginas ==="
            )

        except Exception as e:
            logger.error(f"Error procesando {pdf_path.name}: {e}", exc_info=True)
            _move_to_errors(processing_path, config)
            batch.estado = EstadoBatch.ARCHIVADO

            if supabase_sync:
                try:
                    supabase_sync.log(batch.id, "error", str(e))
                except Exception:
                    pass

            raise

    return batch


def _move_to_errors(pdf_path: Path, config: AppConfig) -> None:
    """Mueve un PDF problemático a la carpeta de errores."""
    errores_dir = Path(config.paths.errores)
    errores_dir.mkdir(parents=True, exist_ok=True)
    dest = errores_dir / pdf_path.name
    counter = 1
    while dest.exists():
        dest = errores_dir / f"{pdf_path.stem}_{counter}{pdf_path.suffix}"
        counter += 1
    shutil.move(str(pdf_path), str(dest))
    logger.info(f"Movido a errores: {dest}")
