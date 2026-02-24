"""Carga de configuración desde config.yaml y variables de entorno."""

from __future__ import annotations
import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv


@dataclass
class PathsConfig:
    entrada: str = ""
    procesando: str = ""
    salida: str = ""
    pendientes: str = ""
    procesados: str = ""
    errores: str = ""


@dataclass
class OpenAIConfig:
    model: str = "gpt-4o-mini"
    fallback_model: str = "gpt-4o"
    api_key: str = ""
    max_concurrent: int = 5
    timeout: int = 30
    max_retries: int = 3


@dataclass
class ProcessingConfig:
    confidence_threshold: float = 0.80
    supplier_match_threshold: int = 80
    dpi: int = 300
    wait_stability_seconds: int = 5
    archive_poll_interval: int = 30


@dataclass
class SupabaseConfig:
    url: str = ""
    service_key: str = ""


@dataclass
class AppConfig:
    paths: PathsConfig = field(default_factory=PathsConfig)
    openai: OpenAIConfig = field(default_factory=OpenAIConfig)
    processing: ProcessingConfig = field(default_factory=ProcessingConfig)
    supabase: SupabaseConfig = field(default_factory=SupabaseConfig)


def load_config(config_path: str | Path | None = None) -> AppConfig:
    """Carga configuración desde YAML + variables de entorno.

    Args:
        config_path: Ruta al fichero config.yaml. Si None, busca en el
                     directorio del script.

    Returns:
        AppConfig con toda la configuración cargada.
    """
    load_dotenv()

    if config_path is None:
        config_path = Path(__file__).parent.parent / "config.yaml"
    else:
        config_path = Path(config_path)

    raw: dict = {}
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}

    paths_raw = raw.get("paths", {})
    openai_raw = raw.get("openai", {})
    processing_raw = raw.get("processing", {})

    return AppConfig(
        paths=PathsConfig(
            entrada=paths_raw.get("entrada", ""),
            procesando=paths_raw.get("procesando", ""),
            salida=paths_raw.get("salida", ""),
            pendientes=paths_raw.get("pendientes", ""),
            procesados=paths_raw.get("procesados", ""),
            errores=paths_raw.get("errores", ""),
        ),
        openai=OpenAIConfig(
            model=openai_raw.get("model", "gpt-4o-mini"),
            fallback_model=openai_raw.get("fallback_model", "gpt-4o"),
            api_key=os.getenv("OPENAI_API_KEY", ""),
            max_concurrent=openai_raw.get("max_concurrent", 5),
            timeout=openai_raw.get("timeout", 30),
            max_retries=openai_raw.get("max_retries", 3),
        ),
        processing=ProcessingConfig(
            confidence_threshold=processing_raw.get("confidence_threshold", 0.80),
            supplier_match_threshold=processing_raw.get("supplier_match_threshold", 80),
            dpi=processing_raw.get("dpi", 300),
            wait_stability_seconds=processing_raw.get("wait_stability_seconds", 5),
            archive_poll_interval=processing_raw.get("archive_poll_interval", 30),
        ),
        supabase=SupabaseConfig(
            url=os.getenv("SUPABASE_URL", ""),
            service_key=os.getenv("SUPABASE_SERVICE_KEY", ""),
        ),
    )
