"""Project-scoped runtime settings.

The values in ``DEFAULT_PROJECT_SETTINGS`` are the documented defaults used
when an active project does not define a managed setting.  Project
``settings.json`` values are loaded first and ``.env`` values take precedence,
because ``.env`` is the primary settings store used by the server.

Provider API keys use a separate immutable startup snapshot plus the active
project's overlay. This preserves process-level credentials without allowing a
credential loaded from one project to leak into the next project.
"""

import json
import os
from pathlib import Path
from types import MappingProxyType
from typing import Mapping, MutableMapping, Optional

from dotenv import dotenv_values


DEFAULT_PROJECT_SETTINGS: Mapping[str, str] = {
    "AUTONOVEL_API_BASE_URL": "https://api.anthropic.com",
    "AUTONOVEL_WRITER_MODEL": "gemini-3.7-flash",
    "AUTONOVEL_JUDGE_MODEL": "gemini-3.7-flash",
    "AUTONOVEL_REVIEW_MODEL": "gemini-3.7-flash",
    "AUTONOVEL_TEMPERATURE": "0.75",
    "AUTONOVEL_TARGET_WORDS": "3500",
    "AUTONOVEL_LANGUAGE": "ar",
    "AUTONOVEL_NOVEL_TYPE": "novel",
}

PROVIDER_API_KEYS = (
    "GEMINI_API_KEY",
    "GOOGLE_API_KEY",
    "ANTHROPIC_API_KEY",
)

# Capture only credentials supplied to the server process. Project files are
# loaded later and therefore cannot become part of this fallback baseline.
STARTUP_PROVIDER_ENVIRONMENT: Mapping[str, str] = MappingProxyType(
    {key: os.environ[key] for key in PROVIDER_API_KEYS if key in os.environ}
)


def capture_startup_provider_environment(
    environ: Optional[Mapping[str, str]] = None,
) -> Mapping[str, str]:
    """Capture provider credentials after the server has loaded its env file."""
    global STARTUP_PROVIDER_ENVIRONMENT
    source = os.environ if environ is None else environ
    STARTUP_PROVIDER_ENVIRONMENT = MappingProxyType(
        {key: source[key] for key in PROVIDER_API_KEYS if source.get(key)}
    )
    return STARTUP_PROVIDER_ENVIRONMENT


def _read_json_settings(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        values = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}
    if not isinstance(values, dict):
        return {}
    return {str(key): str(value) for key, value in values.items() if value is not None}


def _read_env_settings(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    try:
        values = dotenv_values(path)
    except (OSError, ValueError):
        return {}
    return {key: str(value) for key, value in values.items() if value is not None}


def read_project_configuration(project_dir: Path) -> dict[str, str]:
    """Read supported settings and credentials without mutating ``os.environ``."""
    supported_keys = set(DEFAULT_PROJECT_SETTINGS) | set(PROVIDER_API_KEYS)
    combined = _read_json_settings(project_dir / "settings.json")
    combined.update(_read_env_settings(project_dir / ".env"))
    return {key: value for key, value in combined.items() if key in supported_keys}


def active_project_settings(project_dir: Path) -> dict[str, str]:
    """Return defaults overlaid with the selected project's managed values."""
    active = dict(DEFAULT_PROJECT_SETTINGS)
    stored = read_project_configuration(project_dir)
    active.update({key: stored[key] for key in DEFAULT_PROJECT_SETTINGS if key in stored})
    return active


def active_provider_environment(project_dir: Path) -> dict[str, str]:
    """Return startup credentials overlaid by the selected project only."""
    active = dict(STARTUP_PROVIDER_ENVIRONMENT)
    stored = read_project_configuration(project_dir)
    active.update({key: stored[key] for key in PROVIDER_API_KEYS if key in stored})
    return active


def rebuild_runtime_settings(
    project_dir: Path,
    environ: Optional[MutableMapping[str, str]] = None,
) -> dict[str, str]:
    """Replace all managed runtime values with those for ``project_dir``."""
    target = os.environ if environ is None else environ
    active = active_project_settings(project_dir)
    target.update(active)
    target["AUTONOVEL_PROJECT_DIR"] = str(project_dir)

    for key in PROVIDER_API_KEYS:
        target.pop(key, None)
    target.update(active_provider_environment(project_dir))
    return active


def child_process_environment(
    project_dir: Path,
    base_environment: Optional[Mapping[str, str]] = None,
) -> dict[str, str]:
    """Build a child environment from the selected project, not stale globals."""
    environment = dict(os.environ if base_environment is None else base_environment)
    for key in DEFAULT_PROJECT_SETTINGS:
        environment.pop(key, None)
    rebuild_runtime_settings(project_dir, environment)
    return environment
