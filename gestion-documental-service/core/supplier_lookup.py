"""Mapea nombre de proveedor (OCR) al código del maestro de proveedores."""

from __future__ import annotations
import logging
from dataclasses import dataclass

from thefuzz import process as fuzz_process

from .models import Document

logger = logging.getLogger(__name__)


@dataclass
class Supplier:
    codigo: str
    nombre: str


def lookup_suppliers(
    documents: list[Document],
    maestro: list[Supplier],
    match_threshold: int = 80,
) -> list[Document]:
    """Resuelve el código de proveedor para cada documento usando fuzzy match.

    Args:
        documents: Lista de documentos con proveedor_nombre extraído por OCR.
        maestro: Lista de proveedores del maestro (código + nombre).
        match_threshold: Score mínimo (0-100) para considerar un match válido.

    Returns:
        La misma lista de documentos con proveedor_codigo actualizado.
    """
    if not maestro:
        logger.warning("Maestro de proveedores vacío — no se puede hacer lookup")
        return documents

    # Preparar lookup
    nombres_maestro = [s.nombre for s in maestro]
    nombre_to_supplier = {s.nombre: s for s in maestro}

    matched = 0
    unmatched = 0

    for doc in documents:
        if not doc.proveedor_nombre:
            continue

        result = fuzz_process.extractOne(
            doc.proveedor_nombre.strip(),
            nombres_maestro,
        )

        if result is None:
            unmatched += 1
            continue

        best_match, score = result[0], result[1]

        if score >= match_threshold:
            supplier = nombre_to_supplier[best_match]
            doc.proveedor_codigo = supplier.codigo
            matched += 1
            logger.debug(
                f"  '{doc.proveedor_nombre}' → {supplier.codigo} - {supplier.nombre} "
                f"(score: {score})"
            )
        else:
            unmatched += 1
            logger.info(
                f"  '{doc.proveedor_nombre}' → sin match (mejor: '{best_match}' "
                f"score: {score} < {match_threshold})"
            )

    logger.info(f"Lookup completado: {matched} matches, {unmatched} sin match")
    return documents


async def load_maestro_from_supabase(supabase_client) -> list[Supplier]:
    """Carga el maestro de proveedores desde la tabla 'proveedores' de Supabase.

    Args:
        supabase_client: Cliente de Supabase inicializado.

    Returns:
        Lista de Supplier con código y nombre.
    """
    response = supabase_client.table("proveedores").select("codigo, nombre").execute()

    maestro = [
        Supplier(codigo=row["codigo"], nombre=row["nombre"])
        for row in response.data
        if row.get("codigo") and row.get("nombre")
    ]

    logger.info(f"Maestro cargado: {len(maestro)} proveedores desde Supabase")
    return maestro
