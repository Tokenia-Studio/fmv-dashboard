"""Entry point del servicio de Gestión Documental.

Modo one-shot: descarga PDFs pendientes de Supabase, los procesa y se cierra.
Modo servicio (--watch): vigila continuamente carpeta local + Supabase.

Uso:
  python main.py --config config.local.yaml          # one-shot: procesa pendientes y sale
  python main.py --config config.local.yaml --watch   # servicio continuo (como antes)
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
# Reducir verbosidad de httpx (poller genera mucho ruido)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger("gestion-documental")


def _parse_args():
    """Parsea argumentos de línea de comandos."""
    config_path = None
    watch_mode = False

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--config" and i + 1 < len(args):
            config_path = args[i + 1]
            i += 2
        elif args[i] == "--watch":
            watch_mode = True
            i += 1
        else:
            i += 1

    return config_path, watch_mode


def _load_maestro(config, supabase_sync) -> list[Supplier]:
    """Carga maestro de proveedores desde Excel o Supabase."""
    maestro: list[Supplier] = []
    excel_path = Path(__file__).parent / "Proveedores +n+nif.xlsx"

    if excel_path.exists():
        try:
            maestro = load_maestro_from_excel(excel_path)
            logger.info(f"Maestro de proveedores: {len(maestro)} cargados desde Excel")
        except Exception as e:
            logger.warning(f"Error cargando Excel de proveedores: {e}")

    if not maestro and supabase_sync:
        try:
            raw = supabase_sync.load_maestro_proveedores()
            maestro = [
                Supplier(codigo=r["codigo"], nombre=r["nombre"])
                for r in raw if r.get("codigo") and r.get("nombre")
            ]
            logger.info(f"Maestro de proveedores: {len(maestro)} cargados desde Supabase")
        except Exception as e:
            logger.warning(f"Error cargando maestro: {e}")

    return maestro


def _create_folders(config):
    """Crea carpetas necesarias."""
    for path_attr in ["entrada", "procesando", "salida", "pendientes", "procesados", "errores"]:
        path = Path(getattr(config.paths, path_attr))
        if path:
            path.mkdir(parents=True, exist_ok=True)


async def process_pending(config, supabase_sync, maestro) -> int:
    """Descarga PDFs pendientes de Supabase y los procesa.

    Returns:
        Número de PDFs procesados.
    """
    entrada_dir = Path(config.paths.entrada).resolve()
    processed = 0

    # 1. Descargar PDFs pendientes de Supabase Storage
    pending = supabase_sync.list_pending_uploads()
    if not pending:
        logger.info("No hay PDFs pendientes en Supabase")
        return 0

    logger.info(f"Encontrados {len(pending)} PDFs pendientes en Supabase")

    for file_info in pending:
        name = file_info.get("name", "")
        if not name:
            continue

        storage_path = f"pendiente/{name}"
        local_path = entrada_dir / name

        logger.info(f"Descargando: {name}")
        if not supabase_sync.download_upload(storage_path, local_path):
            logger.error(f"Error descargando {name}, saltando")
            continue

        # Eliminar del bucket para no reprocesar
        supabase_sync.delete_upload(storage_path)

        # 2. Procesar el PDF
        try:
            logger.info(f"Procesando: {name}")
            await process_pdf(
                pdf_path=local_path,
                config=config,
                maestro=maestro,
                supabase_sync=supabase_sync,
            )
            processed += 1
            logger.info(f"Completado: {name}")
        except Exception as e:
            logger.error(f"Error procesando {name}: {e}", exc_info=True)

    return processed


def run_oneshot(config, supabase_sync, maestro):
    """Modo one-shot: procesa pendientes y sale."""
    logger.info("=== Modo one-shot: procesando pendientes ===")

    # También procesar PDFs que ya estén en la carpeta de entrada local
    entrada_dir = Path(config.paths.entrada).resolve()
    local_pdfs = list(entrada_dir.glob("*.pdf"))

    count = asyncio.run(process_pending(config, supabase_sync, maestro))

    # Procesar PDFs locales que no venían de Supabase
    for pdf in local_pdfs:
        try:
            logger.info(f"Procesando local: {pdf.name}")
            asyncio.run(
                process_pdf(
                    pdf_path=pdf,
                    config=config,
                    maestro=maestro,
                    supabase_sync=supabase_sync,
                )
            )
            count += 1
        except Exception as e:
            logger.error(f"Error procesando {pdf.name}: {e}", exc_info=True)

    logger.info(f"=== Finalizado: {count} PDFs procesados ===")
    return count


def poll_supabase_uploads(supabase_sync: SupabaseSync, entrada_dir: Path, interval: int = 10):
    """Hilo que comprueba Supabase Storage cada N segundos."""
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

                if local_path.exists():
                    continue

                logger.info(f"Nuevo PDF detectado en Supabase: {name}")

                if supabase_sync.download_upload(storage_path, local_path):
                    supabase_sync.delete_upload(storage_path)
                    logger.info(f"PDF listo para procesamiento: {name}")

        except Exception as e:
            logger.error(f"Error en poller de uploads: {e}")

        time.sleep(interval)


def run_watch(config, supabase_sync, maestro):
    """Modo servicio continuo: vigila carpeta + Supabase."""
    logger.info("=== Modo servicio continuo (--watch) ===")

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

    observer = start_watcher(
        watch_dir=config.paths.entrada,
        callback=on_new_pdf,
        wait_seconds=config.processing.wait_stability_seconds,
    )

    logger.info(f"Vigilando carpeta local: {config.paths.entrada}")

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


def main():
    config_path, watch_mode = _parse_args()
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
            logger.warning(f"No se pudo conectar a Supabase: {e}")

    maestro = _load_maestro(config, supabase_sync)
    _create_folders(config)

    if watch_mode:
        run_watch(config, supabase_sync, maestro)
    else:
        # One-shot: procesar y salir
        if not supabase_sync:
            logger.error("Supabase necesario para modo one-shot. Configura SUPABASE_URL y SUPABASE_SERVICE_KEY.")
            sys.exit(1)
        run_oneshot(config, supabase_sync, maestro)


if __name__ == "__main__":
    main()
