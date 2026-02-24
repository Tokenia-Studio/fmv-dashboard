"""Entry point del servicio de Gestión Documental.

Arranca:
1. Watcher: vigila carpeta de entrada para nuevos PDFs (servidor local)
2. Poller: vigila Supabase Storage para PDFs subidos desde el dashboard
3. Carga maestro de proveedores desde Excel/Supabase
4. Procesa cada PDF detectado con el pipeline completo
"""

from __future__ import annotations
import asyncio
import logging
import signal
import sys
import time
import threading
from pathlib import Path

from core.config import load_config
from core.pipeline import process_pdf
from core.watcher import start_watcher
from core.supplier_lookup import Supplier, load_maestro_from_excel
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


def poll_supabase_uploads(supabase_sync: SupabaseSync, entrada_dir: Path, interval: int = 10):
    """Hilo que comprueba Supabase Storage cada N segundos buscando PDFs subidos desde la app."""
    logger.info(f"Poller de uploads iniciado (cada {interval}s)")

    while True:
        try:
            pending = supabase_sync.list_pending_uploads()
            for file_info in pending:
                name = file_info.get("name", "")
                if not name:
                    continue

                storage_path = f"pendiente/{name}"
                local_path = entrada_dir / name

                # Evitar reprocesar si ya existe localmente
                if local_path.exists():
                    logger.debug(f"Ya existe localmente, saltando: {name}")
                    continue

                logger.info(f"Nuevo PDF detectado en Supabase: {name}")

                # Descargar a carpeta de entrada
                if supabase_sync.download_upload(storage_path, local_path):
                    # Eliminar del bucket para no reprocesar
                    supabase_sync.delete_upload(storage_path)
                    logger.info(f"PDF listo para procesamiento: {name}")
                    # El watcher local detectará el nuevo fichero y lanzará el pipeline

        except Exception as e:
            logger.error(f"Error en poller de uploads: {e}")

        time.sleep(interval)


def main():
    """Función principal del servicio."""
    logger.info("=== Iniciando servicio de Gestión Documental ===")

    # Cargar configuración (acepta --config para override)
    config_path = None
    if len(sys.argv) > 1 and sys.argv[1] == "--config" and len(sys.argv) > 2:
        config_path = sys.argv[2]
    config = load_config(config_path)

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

    # Cargar maestro de proveedores (prioridad: Excel local con NIF)
    maestro: list[Supplier] = []
    excel_path = Path(__file__).parent / "Proveedores +n+nif.xlsx"
    if excel_path.exists():
        try:
            maestro = load_maestro_from_excel(excel_path)
            logger.info(f"Maestro de proveedores: {len(maestro)} cargados desde Excel (con NIF)")
        except Exception as e:
            logger.warning(f"Error cargando Excel de proveedores: {e}")

    if not maestro and supabase_sync:
        try:
            raw = supabase_sync.load_maestro_proveedores()
            maestro = [
                Supplier(codigo=r["codigo"], nombre=r["nombre"])
                for r in raw if r.get("codigo") and r.get("nombre")
            ]
            logger.info(f"Maestro de proveedores: {len(maestro)} cargados desde Supabase (sin NIF)")
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

    # Arrancar watcher local
    observer = start_watcher(
        watch_dir=config.paths.entrada,
        callback=on_new_pdf,
        wait_seconds=config.processing.wait_stability_seconds,
    )

    logger.info(f"Vigilando carpeta local: {config.paths.entrada}")

    # Arrancar poller de Supabase Storage (hilo daemon)
    if supabase_sync:
        entrada_dir = Path(config.paths.entrada).resolve()
        poller_thread = threading.Thread(
            target=poll_supabase_uploads,
            args=(supabase_sync, entrada_dir, 10),
            daemon=True,
        )
        poller_thread.start()
        logger.info("Poller de Supabase Storage activo")

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
