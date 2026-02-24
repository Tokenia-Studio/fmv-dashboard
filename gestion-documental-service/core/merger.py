"""Junta facturas con sus albaranes asociados en un único PDF."""

from __future__ import annotations
import logging
from pathlib import Path

import fitz  # PyMuPDF

from .models import Document, TipoDocumento

logger = logging.getLogger(__name__)


def merge_documents(
    documents: list[Document],
    source_pdf_path: str | Path,
    output_dir: str | Path,
) -> list[Document]:
    """Genera PDFs individuales por documento, uniendo factura + albaranes.

    Para cada factura que tiene albaranes asociados, genera un PDF único con:
    - Primero las páginas de la factura
    - Después las páginas de cada albarán asociado

    Para documentos sin asociaciones, genera un PDF con solo sus páginas.

    Args:
        documents: Lista de documentos con asociaciones ya establecidas.
        source_pdf_path: Ruta al PDF original escaneado (en carpeta procesando).
        output_dir: Directorio donde guardar los PDFs generados.

    Returns:
        La misma lista de documentos con pdf_path actualizado.
    """
    source_pdf_path = Path(source_pdf_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    source_doc = fitz.open(str(source_pdf_path))

    # Identificar albaranes ya asociados (no generan PDF propio)
    associated_albaran_ids = {
        d.factura_asociada_id
        for d in documents
        if d.factura_asociada_id
    }
    # Invertir: IDs de albaranes que están asociados a alguna factura
    albaranes_asociados = {
        d.id for d in documents if d.factura_asociada_id is not None
    }

    for doc in documents:
        if doc.id in albaranes_asociados:
            # Este albarán se incluirá en el PDF de su factura, no genera PDF propio
            continue

        # Recoger páginas: las del documento + las de sus albaranes asociados
        pages: list[int] = list(doc.paginas)

        if doc.tipo == TipoDocumento.FACTURA:
            # Buscar albaranes asociados a esta factura
            for other in documents:
                if other.factura_asociada_id == doc.id:
                    pages.extend(other.paginas)
                    logger.debug(
                        f"  Uniendo albarán {other.numero_albaran or '?'} "
                        f"({len(other.paginas)} págs) a factura {doc.numero_factura or '?'}"
                    )

        # Generar PDF con las páginas seleccionadas
        output_pdf = fitz.open()
        for page_num in pages:
            # page_num es 1-indexed, PyMuPDF usa 0-indexed
            if 0 < page_num <= len(source_doc):
                output_pdf.insert_pdf(source_doc, from_page=page_num - 1, to_page=page_num - 1)

        # Nombre temporal (se renombrará en archiver)
        temp_name = f"doc_{doc.id[:8]}.pdf"
        output_path = output_dir / temp_name
        output_pdf.save(str(output_path))
        output_pdf.close()

        doc.pdf_path = str(output_path)

        logger.info(
            f"  PDF generado: {temp_name} ({len(pages)} páginas) — "
            f"tipo={doc.tipo.value}, proveedor={doc.proveedor_nombre}"
        )

    source_doc.close()

    # Contar resultados
    pdfs_generados = sum(1 for d in documents if d.pdf_path)
    logger.info(f"Merge completado: {pdfs_generados} PDFs generados")

    return documents
