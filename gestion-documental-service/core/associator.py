"""Asocia albaranes con sus facturas correspondientes."""

from __future__ import annotations
import logging

from .models import Document, TipoDocumento

logger = logging.getLogger(__name__)


def associate_delivery_notes(documents: list[Document]) -> list[Document]:
    """Asocia cada albarán con su factura correspondiente.

    Criterios de asociación (en orden de prioridad):
    1. Mismo proveedor + el albarán tiene un nº de factura que coincide
    2. Mismo proveedor + el albarán tiene un nº de pedido que coincide con el de la factura
    3. Mismo proveedor y son consecutivos en el lote (heurística)

    Los albaranes asociados se marcan con factura_asociada_id.
    Los albaranes sin asociar se dejan sueltos.

    Args:
        documents: Lista de documentos ya agrupados.

    Returns:
        La misma lista con las asociaciones establecidas.
    """
    facturas = [d for d in documents if d.tipo == TipoDocumento.FACTURA]
    albaranes = [d for d in documents if d.tipo == TipoDocumento.ALBARAN]

    if not facturas or not albaranes:
        logger.info(
            f"Asociación: {len(facturas)} facturas, {len(albaranes)} albaranes — "
            f"{'nada que asociar' if not albaranes else 'sin facturas para asociar'}"
        )
        return documents

    logger.info(f"Asociando {len(albaranes)} albaranes con {len(facturas)} facturas")

    for albaran in albaranes:
        match = _find_matching_factura(albaran, facturas)
        if match:
            albaran.factura_asociada_id = match.id
            logger.info(
                f"  Albarán {albaran.numero_albaran or '?'} → "
                f"Factura {match.numero_factura or '?'} "
                f"(proveedor: {match.proveedor_nombre})"
            )
        else:
            logger.info(
                f"  Albarán {albaran.numero_albaran or '?'} "
                f"(proveedor: {albaran.proveedor_nombre}) → sin factura asociada"
            )

    asociados = sum(1 for a in albaranes if a.factura_asociada_id)
    logger.info(f"Asociación completada: {asociados}/{len(albaranes)} albaranes asociados")

    return documents


def _find_matching_factura(albaran: Document, facturas: list[Document]) -> Document | None:
    """Busca la factura que mejor coincide con un albarán."""
    if not albaran.proveedor_nombre:
        return None

    albaran_prov = albaran.proveedor_nombre.strip().upper()

    # Filtrar facturas del mismo proveedor
    same_supplier = [
        f for f in facturas
        if f.proveedor_nombre and f.proveedor_nombre.strip().upper() == albaran_prov
    ]

    if not same_supplier:
        return None

    # Criterio 1: albarán tiene nº factura que coincide
    if albaran.numero_factura:
        for factura in same_supplier:
            if factura.numero_factura == albaran.numero_factura:
                return factura

    # Criterio 2: coincidencia por nº pedido
    if albaran.numero_pedido:
        for factura in same_supplier:
            if factura.numero_pedido and factura.numero_pedido == albaran.numero_pedido:
                return factura

    # Criterio 3: mismo proveedor, una sola factura → asociar por defecto
    if len(same_supplier) == 1:
        return same_supplier[0]

    return None
