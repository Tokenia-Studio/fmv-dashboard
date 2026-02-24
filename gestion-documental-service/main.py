"""Entry point del servicio de Gestión Documental.

Arranca:
1. Watcher: vigila carpeta de entrada para nuevos PDFs
2. Carga maestro de proveedores desde Supabase
3. Procesa cada PDF detectado con el pipeline completo
"""

from __future__ import annotations
import asyncio
import logging
import signal
import sys
import time
from pathlib import Path

from core.config import load_config
from core.pipeline import process_pdf
from core.watcher import start_watcher
from core.supplier_lookup import Supplier
from infra.supabase_client import SupabaseSync

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("gestion_documental.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("gestion-documental")


def main():
    """Función principal del servicio."""
    logger.info("=== Iniciando servicio de Gestión Documental ===")

    # Cargar configuración
    config = load_config()

    if not config.openai.api_key:
        logger.error("OPENAI_API_KEY no configurada. Abortando.")
        sys.exit(1)

    # Inicializar Supabase
    supabase_sync = None
    if config.supabase.url and config.supabase.service_key:
        try:
            supabase_sync = SupabaseSync(config.supabase.url, config.supabase.service_key)
            logger.info("Supabase conectado")
        except Exception as e:
            logger.warning(f"No se pudo conectar a Supabase: {e}. Continuando sin sync.")

    # Cargar maestro de proveedores
    maestro: list[Supplier] = []
    if supabase_sync:
        try:
            raw = supabase_sync.load_maestro_proveedores()
            maestro = [
                Supplier(codigo=r["codigo"], nombre=r["nombre"])
                for r in raw if r.get("codigo") and r.get("nombre")
            ]
            logger.info(f"Maestro de proveedores: {len(maestro)} proveedores cargados")
        except Exception as e:
            logger.warning(f"Error cargando maestro: {e}")

    # Callback para cuando se detecta un nuevo PDF
    def on_new_pdf(pdf_path: str):
        logger.info(f"Procesando: {pdf_path}")
        try:
            asyncio.run(
                process_pdf(
                    pdf_path=pdf_path,
                    config=config,
                    maestro=maestro,
                    supabase_sync=supabase_sync,
                )
            )
        except Exception as e:
            logger.error(f"Error en pipeline: {e}", exc_info=True)

    # Crear carpetas necesarias
    for path_attr in ["entrada", "procesando", "salida", "pendientes", "procesados", "errores"]:
        path = Path(getattr(config.paths, path_attr))
        if path:
            path.mkdir(parents=True, exist_ok=True)

    # Arrancar watcher
    observer = start_watcher(
        watch_dir=config.paths.entrada,
        callback=on_new_pdf,
        wait_seconds=config.processing.wait_stability_seconds,
    )

    logger.info(f"Vigilando: {config.paths.entrada}")
    logger.info("Servicio listo. Ctrl+C para detener.")

    # Mantener el proceso vivo
    shutdown = False

    def signal_handler(signum, frame):
        nonlocal shutdown
        shutdown = True
        logger.info("Señal de parada recibida. Cerrando...")

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        while not shutdown:
            time.sleep(1)
    finally:
        observer.stop()
        observer.join()
        logger.info("=== Servicio detenido ===")


if __name__ == "__main__":
    main()
