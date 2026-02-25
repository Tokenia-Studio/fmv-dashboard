"""Cliente Supabase para sincronizar resultados del pipeline."""

from __future__ import annotations
import logging
from pathlib import Path

from supabase import create_client, Client

from core.models import Batch, Document, EstadoBatch

logger = logging.getLogger(__name__)


class SupabaseSync:
    """Sincroniza lotes y documentos procesados con Supabase."""

    def __init__(self, url: str, service_key: str):
        self.client: Client = create_client(url, service_key)

    def save_batch(self, batch: Batch) -> None:
        """Inserta un lote y todos sus documentos en Supabase."""
        # Insertar batch
        self.client.table("doc_batches").insert({
            "id": batch.id,
            "fichero_origen": batch.fichero_origen,
            "total_paginas": batch.total_paginas,
            "total_documentos": batch.total_documentos,
            "estado": batch.estado.value,
        }).execute()

        # Insertar documentos (primero sin FK, luego con factura_asociada_id)
        sorted_docs = sorted(batch.documents, key=lambda d: 1 if d.factura_asociada_id else 0)
        for doc in sorted_docs:
            self.client.table("doc_documents").insert({
                "id": doc.id,
                "batch_id": batch.id,
                "tipo": doc.tipo.value,
                "proveedor_nombre": doc.proveedor_nombre,
                "proveedor_codigo": doc.proveedor_codigo,
                "numero_factura": doc.numero_factura,
                "numero_albaran": doc.numero_albaran,
                "numero_pedido": doc.numero_pedido,
                "fecha_documento": doc.fecha_documento.isoformat() if doc.fecha_documento else None,
                "paginas": doc.paginas,
                "confianza": doc.confianza,
                "estado": doc.estado.value,
                "ruta_destino": doc.ruta_destino,
                "fichero_nombre": doc.fichero_nombre,
                "factura_asociada_id": doc.factura_asociada_id,
                "preview_url": doc.preview_url,
            }).execute()

        logger.info(f"Batch {batch.id[:8]} guardado en Supabase ({batch.total_documentos} docs)")

    def upload_previews(self, batch_id: str, image_paths: list[str]) -> list[str]:
        """Sube las imágenes de preview a Supabase Storage.

        Solo sube los PNGs de preview (ignora los _api.jpg que son para OpenAI).

        Returns:
            Lista de URLs públicas de las imágenes.
        """
        urls: list[str] = []
        bucket = "doc-previews"

        for image_path in image_paths:
            path = Path(image_path)
            # Saltar imágenes _api.jpg (son solo para OpenAI)
            if "_api." in path.name:
                continue

            storage_path = f"{batch_id}/{path.name}"

            with open(image_path, "rb") as f:
                self.client.storage.from_(bucket).upload(
                    storage_path,
                    f.read(),
                    file_options={"content-type": "image/png"},
                )

            url = self.client.storage.from_(bucket).get_public_url(storage_path)
            urls.append(url)

        logger.info(f"Subidas {len(urls)} previews para batch {batch_id[:8]}")
        return urls

    def log(self, batch_id: str, nivel: str, mensaje: str) -> None:
        """Inserta una entrada en el log de procesamiento."""
        self.client.table("doc_processing_log").insert({
            "batch_id": batch_id,
            "nivel": nivel,
            "mensaje": mensaje,
        }).execute()

    def get_batches_to_archive(self) -> list[dict]:
        """Obtiene lotes marcados como 'archivado' desde el frontend (polling)."""
        response = (
            self.client.table("doc_batches")
            .select("id, fichero_origen")
            .eq("estado", "archivado")
            .execute()
        )
        return response.data

    def load_maestro_proveedores(self) -> list[dict]:
        """Carga el maestro de proveedores."""
        response = (
            self.client.table("proveedores")
            .select("codigo, nombre")
            .execute()
        )
        return response.data

    def list_pending_uploads(self) -> list[dict]:
        """Lista PDFs pendientes en el bucket doc-entrada/pendiente/."""
        try:
            response = self.client.storage.from_("doc-entrada").list("pendiente")
            return [f for f in (response or []) if f.get("name", "").lower().endswith(".pdf")]
        except Exception as e:
            logger.debug(f"Error listando uploads pendientes: {e}")
            return []

    def download_upload(self, storage_path: str, local_path: Path) -> bool:
        """Descarga un PDF del bucket doc-entrada a disco local."""
        try:
            data = self.client.storage.from_("doc-entrada").download(storage_path)
            local_path.write_bytes(data)
            logger.info(f"Descargado: {storage_path} -> {local_path}")
            return True
        except Exception as e:
            logger.error(f"Error descargando {storage_path}: {e}")
            return False

    def delete_upload(self, storage_path: str) -> None:
        """Elimina un PDF procesado del bucket doc-entrada."""
        try:
            self.client.storage.from_("doc-entrada").remove([storage_path])
            logger.info(f"Eliminado de storage: {storage_path}")
        except Exception as e:
            logger.warning(f"Error eliminando {storage_path}: {e}")
