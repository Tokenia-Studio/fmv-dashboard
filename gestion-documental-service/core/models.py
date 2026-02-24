"""Modelos de datos del pipeline de gestión documental."""

from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from uuid import uuid4


class TipoDocumento(str, Enum):
    FACTURA = "factura"
    ALBARAN = "albaran"
    DESCONOCIDO = "desconocido"


class EstadoDocumento(str, Enum):
    OK = "ok"
    REVISAR = "revisar"
    CORREGIDO = "corregido"
    ARCHIVADO = "archivado"


class EstadoBatch(str, Enum):
    PROCESANDO = "procesando"
    PENDIENTE_REVISION = "pendiente_revision"
    ARCHIVADO = "archivado"


@dataclass
class PageResult:
    """Resultado del análisis de una página individual."""
    page_number: int
    tipo: TipoDocumento
    proveedor: str | None = None
    numero_factura: str | None = None
    numero_albaran: str | None = None
    numero_pedido: str | None = None
    fecha: date | None = None
    es_continuacion_anterior: bool = False
    confianza: float = 0.0
    image_path: str | None = None


@dataclass
class Document:
    """Documento agrupado (una o más páginas que forman un mismo documento)."""
    id: str = field(default_factory=lambda: str(uuid4()))
    tipo: TipoDocumento = TipoDocumento.DESCONOCIDO
    proveedor_nombre: str | None = None
    proveedor_codigo: str | None = None
    numero_factura: str | None = None
    numero_albaran: str | None = None
    numero_pedido: str | None = None
    fecha_documento: date | None = None
    paginas: list[int] = field(default_factory=list)
    page_images: list[str] = field(default_factory=list)
    confianza: float = 0.0
    estado: EstadoDocumento = EstadoDocumento.OK
    ruta_destino: str | None = None
    fichero_nombre: str | None = None
    factura_asociada_id: str | None = None
    preview_url: str | None = None
    pdf_path: str | None = None


@dataclass
class Batch:
    """Lote de documentos escaneados."""
    id: str = field(default_factory=lambda: str(uuid4()))
    fichero_origen: str = ""
    total_paginas: int = 0
    total_documentos: int = 0
    estado: EstadoBatch = EstadoBatch.PROCESANDO
    documents: list[Document] = field(default_factory=list)
