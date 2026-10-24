"""aro_migration.py — Non-destructive data directory migration from ~/.hermes to ~/.aro.

Per ADR 0006 (Decision D-6):
- Aro uses ~/.aro (or platform-specific AppData/Local/aro) as its canonical user data directory.
- On first run, if ~/.aro does not exist and ~/.hermes is detected, perform a one-time copy
  migration of configuration, environment credentials, and state.
- NEVER move or delete the original ~/.hermes data (strictly non-destructive).
- Handled gracefully: read-only home, paths with spaces, paths with non-ASCII characters.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Any

MIGRATION_MARKER_FILE = ".aro_migrated"

# Files and directory stems to migrate from Hermes home to Aro home
MIGRATION_FILES: tuple[str, ...] = (
    "config.yaml",
    ".env",
    "active_profile",
    "hermes.db",
    "state.db",
)

MIGRATION_DIRS: tuple[str, ...] = (
    "sessions",
    "memories",
    "skills",
    "cron",
    "profiles",
)


def get_default_aro_home() -> Path:
    """Return the default canonical Aro data directory (~/.aro or LOCALAPPDATA/aro)."""
    env_override = os.environ.get("ARO_HOME", "").strip()
    if env_override:
        return Path(os.path.expanduser(os.path.expandvars(env_override)))

    suffix = os.environ.get("ARO_DATA_DIR_SUFFIX", "")
    if sys.platform == "win32":
        local_appdata = os.environ.get("LOCALAPPDATA", "").strip()
        base = Path(local_appdata) if local_appdata else Path.home() / "AppData" / "Local"
        return base / ("aro" + suffix)
    return Path.home() / (".aro" + suffix)


def migrate_hermes_to_aro(
    source_home: Path | str | None = None,
    target_home: Path | str | None = None,
) -> dict[str, Any]:
    """Perform a one-time, non-destructive copy migration from source Hermes home to target Aro home.

    Returns a dict with:
      - 'status': 'success' | 'already_migrated' | 'no_source' | 'permission_denied' | 'error'
      - 'source': str
      - 'target': str
      - 'copied': list of relative file/dir paths copied
      - 'error': error message if failed, else None
    """
    if source_home is None:
        source_str = os.environ.get("HERMES_HOME", "").strip()
        if source_str:
            src = Path(os.path.expanduser(os.path.expandvars(source_str)))
        elif sys.platform == "win32":
            local_appdata = os.environ.get("LOCALAPPDATA", "").strip()
            base = Path(local_appdata) if local_appdata else Path.home() / "AppData" / "Local"
            src = base / "hermes"
        else:
            src = Path.home() / ".hermes"
    else:
        src = Path(source_home)

    if target_home is None:
        tgt = get_default_aro_home()
    else:
        tgt = Path(target_home)

    result: dict[str, Any] = {
        "status": "success",
        "source": str(src),
        "target": str(tgt),
        "copied": [],
        "error": None,
    }

    # If migration marker already exists in target, skip (idempotent)
    marker = tgt / MIGRATION_MARKER_FILE
    if marker.exists():
        result["status"] = "already_migrated"
        return result

    # If source does not exist, nothing to migrate
    if not src.exists():
        result["status"] = "no_source"
        return result

    # Try creating target directory; catch read-only filesystem / permission error
    try:
        tgt.mkdir(parents=True, exist_ok=True)
    except (PermissionError, OSError) as e:
        result["status"] = "permission_denied"
        result["error"] = f"Cannot create target directory {tgt}: {e}"
        return result

    copied_items: list[str] = []

    # 1. Copy individual configuration/state files
    for filename in MIGRATION_FILES:
        src_file = src / filename
        tgt_file = tgt / filename
        if src_file.is_file():
            # If target already exists, do not overwrite user data
            if not tgt_file.exists():
                try:
                    shutil.copy2(src_file, tgt_file)
                    copied_items.append(filename)
                except (PermissionError, OSError) as e:
                    # Non-fatal per-file permission issue
                    continue

    # 2. Copy directories (sessions, memories, skills, etc.)
    for dirname in MIGRATION_DIRS:
        src_dir = src / dirname
        tgt_dir = tgt / dirname
        if src_dir.is_dir():
            try:
                shutil.copytree(src_dir, tgt_dir, dirs_exist_ok=True)
                copied_items.append(dirname)
            except (PermissionError, OSError) as e:
                continue

    result["copied"] = copied_items

    # 3. Write migration marker file in target
    try:
        marker_data = {
            "source": str(src),
            "timestamp": str(os.path.getmtime(tgt)),
            "migrated_items": copied_items,
        }
        marker.write_text(json.dumps(marker_data, indent=2), encoding="utf-8")
    except (PermissionError, OSError) as e:
        # If writing marker fails (e.g. read-only target), note in result
        result["error"] = f"Warning: could not write marker file: {e}"

    return result
