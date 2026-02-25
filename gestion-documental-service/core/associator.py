"""Asocia albaranes con sus facturas usando los nº de albarán referenciados en la factura."""

from __future__ import annotations
import logging
import re

from .models import Document, TipoDocumento

logger = logging.getLogger(__name__)


def associate_delivery_notes(documents: list[Document]) -> list[Document]:
    """Asocia cada albaran con su factura correspondiente.

    Estrategia de 3 niveles:
    1. Match exacto: nº albaran coincide con referencia en factura
    2. Match numerico: solo los digitos del nº coinciden
    3. Fallback por proveedor: mismo proveedor (NIF o nombre), solo si 1 factura

    Args:
        documents: Lista de documentos ya agrupados.

    Returns:
        La misma lista con las asociaciones establecidas.
    """
    facturas = [d for d in documents if d.tipo == TipoDocumento.FACTURA]
    albaranes = [d for d in documents if d.tipo == TipoDocumento.ALBARAN]

    if not facturas or not albaranes:
        logger.info(
            f"Asociacion: {len(facturas)} facturas, {len(albaranes)} albaranes - "
            f"{'nada que asociar' if not albaranes else 'sin facturas para asociar'}"
        )
        return documents

    logger.info(f"Asociando {len(albaranes)} albaranes con {len(facturas)} facturas")

    # Log los numeros referenciados en cada factura
    for f in facturas:
        if f.numeros_albaran_ref:
            logger.info(
                f"  Factura {f.numero_factura or '?'} referencia albaranes: "
                f"{f.numeros_albaran_ref}"
            )
        else:
            logger.info(f"  Factura {f.numero_factura or '?'} sin albaranes referenciados")

    asociados = 0
    for albaran in albaranes:
        if not albaran.numero_albaran:
            logger.info(f"  Albaran sin numero -> sin asociar")
            continue

        # Nivel 1: Match exacto normalizado
        match = _find_by_exact_match(albaran, facturas)
        method = "match exacto"

        # Nivel 2: Match solo por digitos
        if not match:
            match = _find_by_digits_match(albaran, facturas)
            method = "match numerico"

        # Nivel 3: Fallback por proveedor
        if not match:
            match = _find_by_provider(albaran, facturas)
            method = "mismo proveedor"

        if match:
            albaran.factura_asociada_id = match.id
            asociados += 1
            logger.info(
                f"  Albaran {albaran.numero_albaran} -> "
                f"Factura {match.numero_factura or '?'} "
                f"({method})"
            )
        else:
            logger.info(
                f"  Albaran {albaran.numero_albaran} "
                f"(prov: {albaran.proveedor_nombre}) -> sin factura asociada"
            )

    logger.info(f"Asociacion completada: {asociados}/{len(albaranes)} albaranes asociados")
    return documents


def _normalize(num: str) -> str:
    """Normaliza un numero para comparacion flexible."""
    return num.strip().upper().replace(" ", "").replace("-", "").replace("/", "").replace(".", "")


def _extract_digits(num: str) -> str:
    """Extrae solo los digitos de un numero."""
    return re.sub(r'[^0-9]', '', num)


def _find_by_exact_match(
    albaran: Document, facturas: list[Document]
) -> Document | None:
    """Busca factura que referencia este albaran (match exacto normalizado)."""
    albaran_num = _normalize(albaran.numero_albaran or "")
    if not albaran_num:
        return None

    for factura in facturas:
        for ref in factura.numeros_albaran_ref:
            if _normalize(ref) == albaran_num:
                return factura

    # Match parcial: el nº del albaran contiene la referencia o viceversa
    for factura in facturas:
        for ref in factura.numeros_albaran_ref:
            ref_norm = _normalize(ref)
            if ref_norm and (albaran_num in ref_norm or ref_norm in albaran_num):
                return factura

    return None


def _find_by_digits_match(
    albaran: Document, facturas: list[Document]
) -> Document | None:
    """Busca factura comparando solo los digitos del nº de albaran.

    Esto resuelve el caso donde GPT lee "2770" en la factura pero el albaran
    real es "27780" - los digitos pueden coincidir parcialmente.
    """
    alb_digits = _extract_digits(albaran.numero_albaran or "")
    if not alb_digits or len(alb_digits) < 3:
        return None

    best_match = None
    best_score = 0

    for factura in facturas:
        for ref in factura.numeros_albaran_ref:
            ref_digits = _extract_digits(ref)
            if not ref_digits:
                continue

            # Match exacto de digitos
            if ref_digits == alb_digits:
                return factura

            # Match parcial: ref esta contenida en albaran o viceversa
            # Pero requiere al menos 4 digitos en comun para evitar falsos positivos
            if len(ref_digits) >= 4 and len(alb_digits) >= 4:
                if ref_digits in alb_digits or alb_digits in ref_digits:
                    score = min(len(ref_digits), len(alb_digits))
                    if score > best_score:
                        best_score = score
                        best_match = factura

            # Match por sufijo: los ultimos N digitos coinciden
            # Ej: ref="2770" alb="27780" -> no
            # Ej: ref="27820" alb="27820" -> si
            # Util cuando GPT omite un digito del medio
            common_suffix = _common_suffix_len(ref_digits, alb_digits)
            if common_suffix >= 4:
                score = common_suffix
                if score > best_score:
                    best_score = score
                    best_match = factura

    return best_match


def _common_suffix_len(a: str, b: str) -> int:
    """Longitud del sufijo comun mas largo entre dos strings."""
    count = 0
    for ca, cb in zip(reversed(a), reversed(b)):
        if ca == cb:
            count += 1
        else:
            break
    return count


def _find_by_provider(
    albaran: Document, facturas: list[Document]
) -> Document | None:
    """Fallback: busca factura del mismo proveedor (por NIF o nombre).

    Si hay multiples facturas del mismo proveedor, asocia con la que tenga
    fecha mas cercana al albaran. Si no hay fechas, solo asocia si hay 1 factura.
    """
    alb_nif = (albaran.proveedor_nif or "").strip().upper()
    alb_nombre = (albaran.proveedor_nombre or "").strip().lower()

    if not alb_nif and not alb_nombre:
        return None

    matches = []
    for factura in facturas:
        fac_nif = (factura.proveedor_nif or "").strip().upper()
        fac_nombre = (factura.proveedor_nombre or "").strip().lower()

        if alb_nif and fac_nif and alb_nif == fac_nif:
            matches.append(factura)
        elif alb_nombre and fac_nombre and (alb_nombre == fac_nombre or
              alb_nombre in fac_nombre or fac_nombre in alb_nombre):
            matches.append(factura)

    if len(matches) == 1:
        return matches[0]

    # Si hay varias, intentar por fecha mas cercana
    if len(matches) > 1 and albaran.fecha_documento:
        best = None
        best_diff = None
        for fac in matches:
            if fac.fecha_documento:
                diff = abs((fac.fecha_documento - albaran.fecha_documento).days)
                if best_diff is None or diff < best_diff:
                    best_diff = diff
                    best = fac
        if best and best_diff is not None and best_diff <= 30:
            return best

    return None
