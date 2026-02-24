"""Vigila la carpeta de entrada para detectar nuevos PDFs escaneados."""

from __future__ import annotations
import asyncio
import logging
import time
from pathlib import Path

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileCreatedEvent

logger = logging.getLogger(__name__)


class PDFHandler(FileSystemEventHandler):
    """Handler que detecta nuevos ficheros PDF en la carpeta vigilada."""

    def __init__(self, callback, wait_seconds: int = 5):
        super().__init__()
        self.callback = callback
        self.wait_seconds = wait_seconds
        self._processing: set[str] = set()

    def on_created(self, event: FileCreatedEvent) -> None:
        if event.is_directory:
            return

        path = Path(event.src_path)
        if path.suffix.lower() != ".pdf":
            return

        if str(path) in self._processing:
            return

        self._processing.add(str(path))
        logger.info(f"Nuevo PDF detectado: {path.name}")

        # Esperar a que el fichero esté estable (escáner puede tardar)
        if self._wait_until_stable(path):
            logger.info(f"PDF estable, lanzando procesamiento: {path.name}")
            self.callback(str(path))
        else:
            logger.warning(f"PDF no se estabilizó: {path.name}")

        self._processing.discard(str(path))

    def _wait_until_stable(self, path: Path) -> bool:
        """Espera hasta que el fichero deje de cambiar de tamaño."""
        prev_size = -1
        stable_count = 0

        for _ in range(self.wait_seconds * 4):  # Check cada 0.25s
            if not path.exists():
                return False

            current_size = path.stat().st_size
            if current_size == prev_size and current_size > 0:
                stable_count += 1
                if stable_count >= 2:  # 0.5s sin cambios
                    return True
            else:
                stable_count = 0

            prev_size = current_size
            time.sleep(0.25)

        return False


def start_watcher(
    watch_dir: str | Path,
    callback,
    wait_seconds: int = 5,
) -> Observer:
    """Inicia el observer de watchdog sobre la carpeta de entrada.

    Args:
        watch_dir: Directorio a vigilar.
        callback: Función a llamar cuando se detecta un nuevo PDF.
                  Recibe la ruta del PDF como argumento.
        wait_seconds: Segundos de espera para estabilidad del fichero.

    Returns:
        Observer (ya arrancado). Llamar a observer.stop() para detener.
    """
    watch_dir = Path(watch_dir)
    watch_dir.mkdir(parents=True, exist_ok=True)

    handler = PDFHandler(callback=callback, wait_seconds=wait_seconds)
    observer = Observer()
    observer.schedule(handler, str(watch_dir), recursive=False)
    observer.start()

    logger.info(f"Watcher iniciado: vigilando {watch_dir}")
    return observer
