"""Agrupa páginas en documentos lógicos basándose en el flag es_continuacion_anterior."""

from __future__ import annotations
import logging

from .models import Document, PageResult, TipoDocumento, EstadoDocumento

logger = logging.getLogger(__name__)


def group_pages_into_documents(
    page_results: list[PageResult],
    confidence_threshold: float = 0.80,
) -> list[Document]:
    """Agrupa páginas consecutivas en documentos lógicos.

    Una página con es_continuacion_anterior=True se añade al documento actual.
    Una página con es_continuacion_anterior=False inicia un nuevo documento.

    Args:
        page_results: Lista de PageResult ordenada por número de página.
        confidence_threshold: Umbral de confianza mínima para estado OK.

    Returns:
        Lista de Document agrupados.
    """
    if not page_results:
        return []

    documents: list[Document] = []
    current_doc: Document | None = None

    for page in page_results:
        if page.es_continuacion_anterior and current_doc is not None:
            # Añadir página al documento actual
            current_doc.paginas.append(page.page_number)
            if page.image_path:
                current_doc.page_images.append(page.image_path)

            # Actualizar confianza (promedio)
            n = len(current_doc.paginas)
            current_doc.confianza = (
                current_doc.confianza * (n - 1) + page.confianza
            ) / n

            # Rellenar campos vacíos con datos de esta página
            if not current_doc.proveedor_nombre and page.proveedor:
                current_doc.proveedor_nombre = page.proveedor
            if not current_doc.numero_factura and page.numero_factura:
                current_doc.numero_factura = page.numero_factura
            if not current_doc.numero_albaran and page.numero_albaran:
                current_doc.numero_albaran = page.numero_albaran
            if not current_doc.numero_pedido and page.numero_pedido:
                current_doc.numero_pedido = page.numero_pedido
            if not current_doc.fecha_documento and page.fecha:
                current_doc.fecha_documento = page.fecha

            logger.debug(
                f"  Página {page.page_number} → continuación del documento "
                f"(ahora {len(current_doc.paginas)} páginas)"
            )
        else:
            # Nueva página = nuevo documento
            if current_doc is not None:
                documents.append(current_doc)

            current_doc = Document(
                tipo=page.tipo,
                proveedor_nombre=page.proveedor,
                numero_factura=page.numero_factura,
                numero_albaran=page.numero_albaran,
                numero_pedido=page.numero_pedido,
                fecha_documento=page.fecha,
                paginas=[page.page_number],
                page_images=[page.image_path] if page.image_path else [],
                confianza=page.confianza,
            )

            logger.debug(
                f"  Página {page.page_number} → nuevo documento: "
                f"tipo={page.tipo.value}, proveedor={page.proveedor}"
            )

    # Añadir último documento
    if current_doc is not None:
        documents.append(current_doc)

    # Determinar estado según confianza
    for doc in documents:
        if doc.confianza < confidence_threshold:
            doc.estado = EstadoDocumento.REVISAR
        elif doc.tipo == TipoDocumento.DESCONOCIDO:
            doc.estado = EstadoDocumento.REVISAR
        elif doc.tipo == TipoDocumento.FACTURA and not doc.numero_factura:
            doc.estado = EstadoDocumento.REVISAR
        elif not doc.proveedor_nombre:
            doc.estado = EstadoDocumento.REVISAR
        else:
            doc.estado = EstadoDocumento.OK

    facturas = sum(1 for d in documents if d.tipo == TipoDocumento.FACTURA)
    albaranes = sum(1 for d in documents if d.tipo == TipoDocumento.ALBARAN)
    desconocidos = sum(1 for d in documents if d.tipo == TipoDocumento.DESCONOCIDO)
    revisar = sum(1 for d in documents if d.estado == EstadoDocumento.REVISAR)

    logger.info(
        f"Agrupación completada: {len(documents)} documentos "
        f"({facturas} facturas, {albaranes} albaranes, {desconocidos} desconocidos, "
        f"{revisar} para revisión)"
    )

    return documents
