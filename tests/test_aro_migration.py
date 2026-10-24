"""Unit tests for aro_migration.py (P11.6 / ADR 0006)."""

import os
import stat
import pytest
from pathlib import Path

from aro_migration import (
    MIGRATION_MARKER_FILE,
    get_default_aro_home,
    migrate_hermes_to_aro,
)


def test_migrate_fresh_clean(tmp_path: Path):
    """Test clean migration from a mock Hermes home to an Aro home."""
    src = tmp_path / ".hermes"
    src.mkdir()
    (src / "config.yaml").write_text("model: test-model\n", encoding="utf-8")
    (src / ".env").write_text("TEST_API_KEY=secret\n", encoding="utf-8")
    sessions_dir = src / "sessions"
    sessions_dir.mkdir()
    (sessions_dir / "sess-1.json").write_text('{"id": "sess-1"}', encoding="utf-8")

    tgt = tmp_path / ".aro"

    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)

    assert result["status"] == "success"
    assert "config.yaml" in result["copied"]
    assert ".env" in result["copied"]
    assert "sessions" in result["copied"]

    # Verify target contents
    assert (tgt / "config.yaml").read_text(encoding="utf-8") == "model: test-model\n"
    assert (tgt / ".env").read_text(encoding="utf-8") == "TEST_API_KEY=secret\n"
    assert (tgt / "sessions" / "sess-1.json").read_text(encoding="utf-8") == '{"id": "sess-1"}'
    assert (tgt / MIGRATION_MARKER_FILE).exists()


def test_migration_is_strictly_non_destructive(tmp_path: Path):
    """Test that source files are never deleted or modified."""
    src = tmp_path / ".hermes"
    src.mkdir()
    cfg_text = "model: keep-me\n"
    (src / "config.yaml").write_text(cfg_text, encoding="utf-8")
    env_text = "ORIGINAL_KEY=123\n"
    (src / ".env").write_text(env_text, encoding="utf-8")

    tgt = tmp_path / ".aro"

    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert result["status"] == "success"

    # Source MUST remain intact
    assert src.exists()
    assert (src / "config.yaml").exists()
    assert (src / "config.yaml").read_text(encoding="utf-8") == cfg_text
    assert (src / ".env").exists()
    assert (src / ".env").read_text(encoding="utf-8") == env_text


def test_migration_is_idempotent(tmp_path: Path):
    """Test that migration does not run again or overwrite modifications if already migrated."""
    src = tmp_path / ".hermes"
    src.mkdir()
    (src / "config.yaml").write_text("model: old\n", encoding="utf-8")

    tgt = tmp_path / ".aro"
    res1 = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert res1["status"] == "success"

    # User modifies config in .aro
    (tgt / "config.yaml").write_text("model: new-aro-model\n", encoding="utf-8")

    # Second run
    res2 = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert res2["status"] == "already_migrated"
    assert res2["copied"] == []

    # Modification in .aro was preserved
    assert (tgt / "config.yaml").read_text(encoding="utf-8") == "model: new-aro-model\n"


def test_migration_no_source(tmp_path: Path):
    """Test behavior when source directory does not exist."""
    src = tmp_path / "nonexistent-hermes"
    tgt = tmp_path / ".aro"

    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert result["status"] == "no_source"
    assert not tgt.exists()


def test_migration_with_spaces_in_path(tmp_path: Path):
    """Test paths with spaces (e.g. Windows usernames / Custom paths)."""
    space_root = tmp_path / "My User Data Folder with spaces"
    space_root.mkdir()

    src = space_root / "hermes data"
    src.mkdir()
    (src / "config.yaml").write_text("spaces: true\n", encoding="utf-8")

    tgt = space_root / "aro data"

    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert result["status"] == "success"
    assert (tgt / "config.yaml").read_text(encoding="utf-8") == "spaces: true\n"


def test_migration_with_non_ascii_unicode_path(tmp_path: Path):
    """Test paths with non-ASCII and international Unicode characters."""
    unicode_root = tmp_path / "José Müller_测试_Аро"
    unicode_root.mkdir()

    src = unicode_root / ".hermes_данные"
    src.mkdir()
    (src / "config.yaml").write_text("unicode: ok\n", encoding="utf-8")

    tgt = unicode_root / ".aro_данные"

    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)
    assert result["status"] == "success"
    assert (tgt / "config.yaml").read_text(encoding="utf-8") == "unicode: ok\n"


def test_migration_handles_read_only_home(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Test that a read-only parent/home handles gracefully with permission_denied."""
    src = tmp_path / ".hermes"
    src.mkdir()
    (src / "config.yaml").write_text("test: 1\n", encoding="utf-8")

    ro_parent = tmp_path / "read_only_parent"
    ro_parent.mkdir()

    # Simulate mkdir failure (PermissionError) on target directory creation
    orig_mkdir = Path.mkdir

    def fake_mkdir(self, *args, **kwargs):
        if "read_only_parent" in str(self):
            raise PermissionError("Access is denied (simulated read-only home)")
        return orig_mkdir(self, *args, **kwargs)

    monkeypatch.setattr(Path, "mkdir", fake_mkdir)

    tgt = ro_parent / ".aro"
    result = migrate_hermes_to_aro(source_home=src, target_home=tgt)

    assert result["status"] == "permission_denied"
    assert "Cannot create target directory" in result["error"]
